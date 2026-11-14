// The learned taste profile. OWNER: feed and personalisation workstream. Signatures are frozen.
// Every engagement is credited to five keys of the post: author, each topic,
// domain, tone and storyline. Weights decay a little every tick.
import { db, now, tx } from "./db";
import type { PostRow } from "./db";
import type {
  Domain, InteractionEvent, InteractionType, PrefKind, PrefWeight, TasteProfile, TasteSummary, Tone,
} from "./types";

const FLAT: Partial<Record<InteractionType, number>> = {
  follow: 6, unfollow: -6,
  repost: 4, unrepost: -4,
  like: 3, unlike: -3,
  bookmark: 3, unbookmark: -3,
  open: 1.5, profile: 1, skip: -0.2, not_interested: -5,
};
const AUTHOR_ONLY = new Set<InteractionType>(["follow", "unfollow", "profile"]);

type Credited = Pick<PostRow, "author" | "storyline_id" | "domain" | "tone" | "topics">;

function weightFor(e: InteractionEvent): number {
  if (e.type === "dwell") return Math.min(2, ((e.ms ?? 0) / 3000) * 0.5);
  return FLAT[e.type] ?? 0;
}

function bump(kind: PrefKind, key: string, w: number, t: number) {
  db()
    .prepare(
      `INSERT INTO prefs (kind, key, weight, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(kind, key) DO UPDATE SET weight = weight + excluded.weight, updated_at = excluded.updated_at`,
    )
    .run(kind, key, w, t);
}

function creditAuthor(handle: string, w: number, t: number) {
  bump("author", handle.toLowerCase(), w, t);
}

function creditPost(p: Credited, w: number, authorOnly: boolean, t: number) {
  creditAuthor(p.author, w, t);
  if (authorOnly || w === 0) return;
  let topics: string[] = [];
  try {
    topics = JSON.parse(p.topics) as string[];
  } catch {
    /* malformed topics: skip them */
  }
  for (const topic of new Set(topics.map((s) => String(s).toLowerCase()))) bump("topic", topic, w, t);
  if (p.domain) bump("domain", p.domain, w, t);
  if (p.tone) bump("tone", p.tone, w, t);
  if (p.storyline_id != null) bump("storyline", String(p.storyline_id), w, t);
}

/** An article open: credit the outlet and, when there is one, the storyline's keys. */
function creditArticle(id: number, w: number, t: number) {
  const a = db().prepare("SELECT outlet, storyline_id FROM articles WHERE id = ?").get(id) as
    | { outlet: string; storyline_id: number | null } | undefined;
  if (!a) return;
  const s =
    a.storyline_id != null
      ? (db().prepare("SELECT domain, tone, topics FROM storylines WHERE id = ?").get(a.storyline_id) as
          | { domain: string; tone: string; topics: string } | undefined)
      : undefined;
  creditPost(
    { author: a.outlet, storyline_id: s ? a.storyline_id : null, domain: s?.domain ?? null, tone: s?.tone ?? null, topics: s?.topics ?? "[]" },
    w,
    false,
    t,
  );
}

function postById(id: number): PostRow | undefined {
  return db().prepare("SELECT * FROM posts WHERE id = ?").get(id) as unknown as PostRow | undefined;
}

function log(type: string, postId: number | null, handle: string | null, ms: number | null, t: number) {
  db()
    .prepare("INSERT INTO interactions (type, post_id, handle, ms, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(type, postId, handle, ms, t);
}

/** Log engagement events and credit them to the taste weights. */
export function recordInteractions(events: InteractionEvent[]): void {
  const t = now();
  tx(() => {
    for (const e of events) {
      const postId = Number.isInteger(e.postId) ? (e.postId as number) : null;
      log(e.type, postId, e.handle ?? null, Number.isFinite(e.ms) ? Math.round(e.ms as number) : null, t);
      const w = weightFor(e);
      if (w === 0) continue;
      const post = postId != null ? postById(postId) : undefined;
      if (!post && e.articleId != null) {
        creditArticle(e.articleId, w, t);
        continue;
      }
      if (AUTHOR_ONLY.has(e.type)) {
        const handle = e.handle ?? post?.author;
        if (handle) creditAuthor(handle, w, t);
      } else if (post) {
        creditPost(post, w, false, t);
      }
    }
  });
}

/** The user replied to a post (+5) or quoted it (+4). Called by POST /api/post. */
export function recordUserPost(kind: "reply" | "quote", targetId: number): void {
  const t = now();
  tx(() => {
    log(kind, targetId, null, null, t);
    const post = postById(targetId);
    if (post) creditPost(post, kind === "reply" ? 5 : 4, false, t);
  });
}

/** Seed a weight directly (onboarding). */
export function seedPref(kind: PrefKind, key: string, w: number): void {
  bump(kind, key.toLowerCase(), w, now());
}

/** All weights keyed "kind:key", for ranking. */
export function prefMap(): Map<string, number> {
  const rows = db().prepare("SELECT kind, key, weight FROM prefs").all() as unknown as {
    kind: string; key: string; weight: number;
  }[];
  return new Map(rows.map((r) => [`${r.kind}:${r.key}`, r.weight]));
}

/** Decay every weight by about 2%. Called once per tick. */
export function decayPrefs(): void {
  tx(() => {
    db().prepare("UPDATE prefs SET weight = weight * 0.98").run();
    db().prepare("DELETE FROM prefs WHERE ABS(weight) < 0.05").run();
  });
}

function signalCount(): number {
  return (db().prepare("SELECT COUNT(*) AS n FROM interactions").get() as unknown as { n: number }).n;
}

/** What the director is told about the user's taste. */
export function tasteSummary(): TasteSummary {
  const rows = db().prepare("SELECT kind, key, weight FROM prefs WHERE kind != 'storyline'").all() as unknown as {
    kind: PrefKind; key: string; weight: number;
  }[];
  const names = new Map(
    (db().prepare("SELECT handle FROM accounts").all() as unknown as { handle: string }[]).map((a) => [
      a.handle.toLowerCase(), a.handle,
    ]),
  );
  const pick = (kind: PrefKind, positive: boolean): string[] =>
    rows
      .filter((r) => r.kind === kind && (positive ? r.weight >= 1 : r.weight <= -1))
      .sort((a, b) => (positive ? b.weight - a.weight : a.weight - b.weight))
      .slice(0, kind === "author" ? 4 : 3)
      .map((r) => (kind === "author" ? (names.get(r.key) ?? r.key) : r.key));
  const side = (positive: boolean) => ({
    authors: pick("author", positive),
    topics: pick("topic", positive),
    tones: pick("tone", positive) as Tone[],
    domains: pick("domain", positive) as Domain[],
  });
  return { likes: side(true), avoids: side(false), signals: signalCount() };
}

/** The full profile for the Behind the scenes page. */
export function tasteProfile(): TasteProfile {
  const rows = db()
    .prepare("SELECT kind, key, weight FROM prefs ORDER BY ABS(weight) DESC LIMIT 40")
    .all() as unknown as { kind: PrefKind; key: string; weight: number }[];
  const weights: PrefWeight[] = rows.map((r) => {
    let label = r.key;
    if (r.kind === "author") {
      const a = db().prepare("SELECT name FROM accounts WHERE handle = ?").get(r.key) as
        | { name: string } | undefined;
      if (a) label = a.name;
    } else if (r.kind === "storyline") {
      const s = db().prepare("SELECT title FROM storylines WHERE id = ?").get(Number(r.key)) as
        | { title: string } | undefined;
      if (s) label = s.title;
    }
    return { kind: r.kind, key: r.key, label, weight: r.weight };
  });
  return { weights, signals: signalCount() };
}
