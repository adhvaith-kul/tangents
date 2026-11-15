// The slate: invented films, series, albums, tours and games, announced the way
// real ones are and kept in a ledger so each one has a life and nothing about it
// contradicts itself. The director announces a project or moves one on through
// DirectorSchema's project field; applyProject checks and stores it, attaches
// the drawn card to the post that carries it, and writes each change to the
// facts ledger. Also what the writers and Explore see. Server-only.
import { db, now } from "./db";
import type { DirectorOutput } from "./schemas";
import { getSettings } from "./settings";
import type {
  CardFormat, DigestProject, PostMedia, ProjectCard, ProjectKind, ProjectStatus, ProjectView, WorldDigest,
} from "./types";

const HOUR = 3_600_000;

/** Roughly one new project a simulated day. */
const NEW_PROJECT_GAP_MS = 20 * HOUR;
/** Projects on the director's SLATE, most recently active first. */
const SLATE_SIZE = 12;
/** Rows in Explore's "Coming soon". */
const COMING_SOON = 8;
const MAX_PEOPLE = 10;
const MAX_FIGURES = 8;
const MAX_STOPS = 12;
const MAX_HISTORY = 20;

const KINDS: readonly ProjectKind[] = ["film", "series", "album", "tour", "game"];
const STATUSES: readonly ProjectStatus[] = ["announced", "in_production", "dated", "released", "delayed", "cancelled"];
/** The card each kind gets; a film or series switches between a title card and a poster. */
const FIXED_FORMAT: Record<Exclude<ProjectKind, "film" | "series">, CardFormat> = {
  album: "cover",
  tour: "tour_poster",
  game: "key_art",
};
const STATUS_WORDS: Record<ProjectStatus, string> = {
  announced: "announced",
  in_production: "in production",
  dated: "dated",
  released: "released",
  delayed: "delayed",
  cancelled: "cancelled",
};

type ProjectInput = NonNullable<DirectorOutput["project"]>;

interface Person {
  name: string;
  role: string;
  handle?: string;
}

interface ProjectRow {
  id: number;
  kind: ProjectKind;
  title: string;
  maker: string;
  maker_handle: string | null;
  people: string;
  logline: string;
  tagline: string | null;
  status: ProjectStatus;
  release: string | null;
  figures: string;
  stops: string;
  platforms: string | null;
  history: string;
  storyline_id: number | null;
  format: CardFormat;
  look: number;
  post_id: number | null;
  created_at: number;
  updated_at: number;
}

// ---------------------------------------------------------------- helpers

function clean(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  const chars = Array.from(s.replace(/\s+/g, " ").trim());
  return chars.length > max ? chars.slice(0, max).join("").trimEnd() : chars.join("");
}

function parse<T>(s: string | null, fallback: T): T {
  try {
    const v: unknown = JSON.parse(s ?? "");
    return Array.isArray(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

/** FNV-1a: the same project always gets the same look. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) & 0x7fffffff;
}

const fold = (s: string) => s.toLowerCase().replace(/^@+/, "").trim();
const dayName = (t: number) => new Date(t).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
const isStar = (role: string) => /star|lead|cast|actor|actress|voice/i.test(role);
const sentence = (s: string) => (s ? `${s[0].toUpperCase()}${s.slice(1)}${/[.!?]$/.test(s) ? "" : "."}` : "");

/** A cast account by handle (or by its exact display name), for linking a maker or a person. */
function castAccount(key: string): { handle: string; name: string } | null {
  const k = key.trim().replace(/^@+/, "");
  if (!k) return null;
  const find = (col: "handle" | "name") =>
    db()
      .prepare(`SELECT handle, name FROM accounts WHERE ${col} = ? COLLATE NOCASE AND kind IN ('figure', 'outlet', 'org') LIMIT 1`)
      .get(k) as { handle: string; name: string } | undefined;
  return find("handle") ?? find("name") ?? null;
}

function cleanPeople(raw: ProjectInput["people"]): Person[] {
  const out: Person[] = [];
  for (const p of Array.isArray(raw) ? raw : []) {
    const name = clean(p?.name, 40);
    if (!name) continue;
    const acct = castAccount(typeof p.handle === "string" && p.handle.trim() ? p.handle : name);
    out.push({ name, role: clean(p.role, 24).toLowerCase() || "star", ...(acct ? { handle: acct.handle } : {}) });
  }
  return out;
}

/** Same person: same handle, or the same name. */
function samePerson(a: Person, key: string): boolean {
  const k = fold(key);
  return fold(a.name) === k || (!!a.handle && fold(a.handle) === k);
}

function mergePeople(current: Person[], joining: Person[], leaving: string[]): Person[] {
  const kept = current.filter((p) => !leaving.some((l) => samePerson(p, l)));
  for (const p of joining) {
    if (!kept.some((k) => samePerson(k, p.name) || (!!p.handle && samePerson(k, p.handle)))) kept.push(p);
  }
  return kept.slice(0, MAX_PEOPLE);
}

function cleanStops(raw: ProjectInput["stops"]): { city: string; date: string }[] {
  return (Array.isArray(raw) ? raw : [])
    .map((s) => ({ city: clean(s?.city, 28), date: clean(s?.date, 16) }))
    .filter((s) => s.city)
    .slice(0, MAX_STOPS);
}

/** The card a post shows, as the project stands now. */
export function cardOf(row: ProjectRow): ProjectCard {
  return {
    id: row.id,
    kind: row.kind,
    format: row.format,
    look: row.look,
    title: row.title,
    maker: row.maker,
    people: parse<Person[]>(row.people, []).map((p) => ({ name: p.name, role: p.role })),
    tagline: row.tagline,
    release: row.release,
    status: row.status,
    stops: parse<{ city: string; date: string }[]>(row.stops, []),
    platforms: row.platforms,
  };
}

// --------------------------------------------------------- the director's lever

export interface ProjectContext {
  /** The posts of this response by their refs ("a1", "n2", "e1"), lowercased. */
  refIds: Map<string, number>;
  /** The beat's storyline. */
  storylineId: number | null;
  /** When it happened, if no post carries the card. */
  at: number;
}

/** Whether a new project was announced on the beat before this one. */
function announcedLastBeat(): boolean {
  const last = db().prepare("SELECT MAX(created_at) AS t FROM projects").get() as { t: number | null };
  if (last.t == null) return false;
  const prev = db().prepare("SELECT created_at FROM beats ORDER BY id DESC LIMIT 1 OFFSET 1").get() as
    | { created_at: number }
    | undefined;
  return !!prev && last.t >= prev.created_at;
}

/** Store the director's project: a new one, or a change to one on the slate.
 *  Attaches the card to the post named by card_on (only a post of this
 *  response) and writes one fact. Returns the project's number, or null when
 *  nothing usable was given. Call inside a transaction, after the response's
 *  posts are stored. */
export function applyProject(raw: ProjectInput | null | undefined, ctx: ProjectContext): number | null {
  if (!raw || typeof raw !== "object") return null;
  const conn = db();
  const happened = clean(raw.happened, 120);
  const cardRef = typeof raw.card_on === "string" ? raw.card_on.trim().toLowerCase().replace(/^[#@]/, "") : "";
  const cardId = cardRef ? ctx.refIds.get(cardRef) : undefined;
  const cardPost = cardId != null
    ? (conn.prepare("SELECT id, created_at, storyline_id FROM posts WHERE id = ? AND deleted = 0").get(cardId) as
        | { id: number; created_at: number; storyline_id: number | null }
        | undefined)
    : undefined;
  const at = cardPost?.created_at ?? ctx.at;
  const kindIn = KINDS.includes(raw.kind as ProjectKind) ? (raw.kind as ProjectKind) : null;
  const title = clean(raw.title, 80);

  let row: ProjectRow | undefined;
  if (Number.isInteger(raw.slate_number)) {
    row = conn.prepare("SELECT * FROM projects WHERE id = ?").get(raw.slate_number) as ProjectRow | undefined;
    if (!row) return null; // a number that is not on the slate
  } else if (title && kindIn) {
    // Announcing what is already on the slate is news about that project.
    row = conn.prepare("SELECT * FROM projects WHERE title = ? COLLATE NOCASE AND kind = ?").get(title, kindIn) as
      | ProjectRow
      | undefined;
  }

  const joining = cleanPeople(raw.people);
  const leaving = (Array.isArray(raw.leaving) ? raw.leaving : []).map((l) => clean(l, 40)).filter(Boolean);
  const status = STATUSES.includes(raw.status as ProjectStatus) ? (raw.status as ProjectStatus) : null;
  const release = clean(raw.release, 40) || null;
  const figure = clean(raw.figure, 100) || null;
  const tagline = clean(raw.tagline, 90) || null;
  const stops = cleanStops(raw.stops);
  const platforms = clean(raw.platforms, 60) || null;
  const card = raw.card === "poster" || raw.card === "title_card" ? raw.card : null;

  if (!row) {
    const maker = clean(raw.maker, 60);
    if (!kindIn || !title || !maker || announcedLastBeat()) return null;
    const makerAcct = castAccount(maker);
    const makerName = makerAcct && fold(makerAcct.handle) === fold(maker) ? makerAcct.name : maker;
    const people = mergePeople([], joining, []);
    const format: CardFormat = kindIn === "film" || kindIn === "series"
      ? (card ?? (people.some((p) => isStar(p.role)) || release ? "poster" : "title_card"))
      : FIXED_FORMAT[kindIn];
    const logline = clean(raw.logline, 240);
    const res = conn
      .prepare(
        `INSERT INTO projects (kind, title, maker, maker_handle, people, logline, tagline, status, release, figures,
                               stops, platforms, history, storyline_id, format, look, post_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        kindIn, title, makerName, makerAcct?.handle ?? null, JSON.stringify(people), logline, tagline,
        status ?? (release ? "dated" : "announced"), release, JSON.stringify(figure ? [figure] : []),
        JSON.stringify(stops), platforms, JSON.stringify([{ at, what: happened || "announced" }]),
        cardPost ? cardPost.storyline_id : ctx.storylineId, format, hash(`${kindIn}|${title}|${makerName}`),
        cardPost?.id ?? null, at, at,
      );
    const id = Number(res.lastInsertRowid);
    const names = people.map((p) => `${p.name} (${p.role})`).join(", ");
    writeFact(
      `"${title}" (${kindIn}, ${makerName}) was announced on ${dayName(at)}.${logline ? ` ${sentence(logline)}` : ""}` +
        `${names ? ` With ${names}.` : ""}${release ? ` Release: ${release}.` : ""}${figure ? ` ${sentence(figure)}` : ""}`,
      [makerAcct?.handle, ...people.map((p) => p.handle)],
      cardPost ? cardPost.storyline_id : ctx.storylineId,
      at,
    );
    attachCard(id, cardPost?.id);
    return id;
  }

  // A change to a project on the slate.
  const before = parse<Person[]>(row.people, []);
  const people = mergePeople(before, joining, leaving);
  const joined = people.filter((p) => !before.includes(p));
  const left = before.filter((p) => !people.includes(p));
  const figures = parse<string[]>(row.figures, []);
  const newFigure = figure && !figures.some((f) => f.toLowerCase() === figure.toLowerCase()) ? figure : null;
  const changed =
    !!happened || !!newFigure || !!(status && status !== row.status) || !!(release && release !== row.release) ||
    joined.length > 0 || left.length > 0 || !!cardPost;
  if (!changed) return null;
  const history = [...parse<{ at: number; what: string }[]>(row.history, []), { at, what: happened || "news" }].slice(-MAX_HISTORY);
  const format = (row.kind === "film" || row.kind === "series") && card ? card : row.format;
  conn
    .prepare(
      `UPDATE projects SET people = ?, status = ?, release = ?, figures = ?, tagline = ?, stops = ?, platforms = ?,
                           history = ?, format = ?, post_id = ?, updated_at = ? WHERE id = ?`,
    )
    .run(
      JSON.stringify(people), status ?? row.status, release ?? row.release,
      JSON.stringify(newFigure && figures.length < MAX_FIGURES ? [...figures, newFigure] : figures),
      tagline ?? row.tagline, stops.length ? JSON.stringify(stops) : row.stops, platforms ?? row.platforms,
      JSON.stringify(history), format, cardPost?.id ?? row.post_id, Math.max(at, row.updated_at), row.id,
    );
  const parts = [
    happened ? sentence(happened) : "",
    joined.length ? `Joined: ${joined.map((p) => `${p.name} (${p.role})`).join(", ")}.` : "",
    left.length ? `Left: ${left.map((p) => p.name).join(", ")}.` : "",
    newFigure ? sentence(newFigure) : "",
    status && status !== row.status ? `Status: ${STATUS_WORDS[status]}.` : "",
    release && release !== row.release ? `Release: ${release}.` : "",
  ].filter(Boolean);
  writeFact(
    `"${row.title}" (${row.kind}, ${row.maker}), ${dayName(at)}: ${parts.join(" ") || "News about the project."}`,
    [row.maker_handle, ...joined.map((p) => p.handle), ...left.map((p) => p.handle)],
    row.storyline_id,
    at,
  );
  attachCard(row.id, cardPost?.id);
  return row.id;
}

function writeFact(text: string, handles: (string | null | undefined)[], storylineId: number | null, at: number) {
  const subjects = [...new Set(handles.filter((h): h is string => !!h))];
  db()
    .prepare("INSERT INTO facts (text, subjects, storyline_id, created_at) VALUES (?, ?, ?, ?)")
    .run(text.slice(0, 600), JSON.stringify(subjects), storylineId, at);
}

/** The project's card on that post, as the project stands now. */
function attachCard(projectId: number, postId: number | undefined) {
  if (postId == null) return;
  const row = db().prepare("SELECT * FROM projects WHERE id = ?").get(projectId) as ProjectRow | undefined;
  if (!row) return;
  const media: PostMedia = { kind: "project", card: cardOf(row) };
  db().prepare("UPDATE posts SET media = ? WHERE id = ?").run(JSON.stringify(media), postId);
}

// ------------------------------------------------------------------- reads

/** Whether a beat may announce a new project: roughly once a simulated day,
 *  while pop culture or gaming is on, on an ordinary beat or the morning after. */
export function newProjectDue(mode: WorldDigest["mode"], steered: boolean): boolean {
  if ((mode !== "normal" && mode !== "next_morning") || steered) return false;
  const s = getSettings();
  if (s.pop <= 0 && s.gaming <= 0) return false;
  const last = db().prepare("SELECT MAX(created_at) AS t FROM projects").get() as { t: number | null };
  return last.t == null || now() - last.t >= NEW_PROJECT_GAP_MS;
}

const hoursSince = (t: number, at: number) => Math.round((Math.max(0, at - t) / HOUR) * 10) / 10;
const ago = (h: number) => (h < 1 ? "under an hour ago" : h < 48 ? `${Math.round(h)}h ago` : `${Math.round(h / 24)}d ago`);

/** What the director is told about the slate: the most recently active projects. */
export function digestSlate(): DigestProject[] {
  const t = now();
  const rows = db()
    .prepare("SELECT * FROM projects ORDER BY updated_at DESC, id DESC LIMIT ?")
    .all(SLATE_SIZE) as unknown as ProjectRow[];
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    maker: r.maker_handle ? `${r.maker} (@${r.maker_handle})` : r.maker,
    people: parse<Person[]>(r.people, []).map((p) => `${p.handle ? `@${p.handle}` : p.name} (${p.role})`),
    logline: r.logline,
    status: r.status,
    release: r.release,
    figures: parse<string[]>(r.figures, []),
    history: parse<{ at: number; what: string }[]>(r.history, []).slice(-3).map((h) => `${h.what} (${ago(hoursSince(h.at, t))})`),
    storylineId: r.storyline_id,
    hoursSinceAnnounced: hoursSince(r.created_at, t),
    hoursSinceNews: hoursSince(r.updated_at, t),
  }));
}

/** Explore's "Coming soon": the most recently active projects, each opening the
 *  post that last carried its card once that post is up. */
export function comingSoon(): ProjectView[] {
  const t = now();
  const rows = db()
    .prepare(
      `SELECT pr.*, p.created_at AS post_at, p.deleted AS post_deleted FROM projects pr
       LEFT JOIN posts p ON p.id = pr.post_id
       WHERE pr.created_at <= ? ORDER BY pr.updated_at DESC, pr.id DESC LIMIT ?`,
    )
    .all(t, COMING_SOON) as unknown as (ProjectRow & { post_at: number | null; post_deleted: number | null })[];
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    maker: r.maker,
    release: r.release,
    status: r.status,
    postId: r.post_id != null && r.post_at != null && r.post_at <= t && !r.post_deleted ? r.post_id : null,
  }));
}
