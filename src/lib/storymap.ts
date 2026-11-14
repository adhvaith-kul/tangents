// The story map: every story beat the world has written, newest first, with
// what it came from and what it touched. Read by GET /api/storymap. Server-only.
//
// Beats are recorded in the `beats` table as they are written. A storyline that
// predates that table is rebuilt from what it left behind: its first post and
// one node per page it published.
import { db, now } from "./db";
import type { AccountRow, ArticleRow, StorylineRow } from "./db";
import type {
  AccountLite, ArticleCard, BeatKind, Domain, Provenance, RealHeadline, StoryBackground, StoryMap, StoryMapBeat,
  StoryMapStoryline, StoryOrigin,
} from "./types";
import { articleCards, qs, toLite } from "./views";

const KINDS = new Set<BeatKind>(["new_event", "advance", "spinoff", "crossover", "user_reaction", "wrap"]);
const MAX_BEATS = 400;
const MINUTE = 60_000;

interface BeatRow {
  id: number;
  storyline_id: number;
  kind: string;
  summary: string;
  heat: number;
  article_id: number | null;
  post_id: number | null;
  headline_id: number | null;
  seeded: number;
  premise?: string | null;
  created_at: number;
}

/** A beat before its page, people and price moves are attached. */
interface Draft {
  id: string;
  storylineId: number;
  kind: BeatKind;
  summary: string;
  heat: number;
  createdAt: number;
  postId: number | null;
  articleId: number | null;
  seeded: boolean;
  /** The reader's own words, on a beat they proposed. */
  premise?: string | null;
  recorded: boolean;
  headlineId: number | null;
}

interface HeadlineRow {
  id: number;
  title: string;
  source: string;
  link: string | null;
  published_at: number | null;
  relation: string | null;
  adapted: string | null;
}

/** The desk's rewrite, when it had to change the real headline to fit this world. */
function rewriteOf(h: HeadlineRow): string | null {
  const adapted = h.adapted?.trim();
  return h.relation === "conflicts" && adapted && adapted !== h.title.trim() ? adapted : null;
}

function realHeadline(h: HeadlineRow): RealHeadline {
  return {
    id: h.id, title: h.title, source: h.source, publishedAt: h.published_at, adapted: rewriteOf(h),
    link: h.link && /^https?:\/\//i.test(h.link) ? h.link : null,
  };
}

function recordedBeats(t: number): BeatRow[] {
  try {
    return db().prepare("SELECT * FROM beats WHERE created_at <= ? ORDER BY created_at").all(t) as unknown as BeatRow[];
  } catch {
    // A world opened before the table existed has none until the server restarts.
    return [];
  }
}

function openingKind(origin: string): BeatKind {
  return origin === "spinoff" ? "spinoff" : origin === "user" ? "user_reaction" : "new_event";
}

function originOf(
  s: StorylineRow,
  first: Draft | undefined,
  titles: Map<number, string>,
  headlines: Map<number, HeadlineRow>,
): StoryOrigin {
  if (s.origin === "user") {
    // Only a recorded beat says which of the two it was.
    const kind = first?.recorded ? (first.seeded ? "whatif" : "post") : "you";
    return { kind, text: null, source: null };
  }
  if (s.origin === "headline") {
    const h = s.headline_id != null ? headlines.get(s.headline_id) : undefined;
    if (!h) return { kind: "headline", text: null, source: null };
    return { kind: rewriteOf(h) ? "adapted" : "headline", text: h.title, source: h.source };
  }
  if (s.origin === "spinoff") {
    return { kind: "spinoff", text: s.parent_id != null ? (titles.get(s.parent_id) ?? null) : null, source: null };
  }
  return { kind: "invented", text: null, source: null };
}

export function getStoryMap(): StoryMap {
  const conn = db();
  const t = now();
  const storylines = conn
    .prepare("SELECT * FROM storylines WHERE created_at <= ? ORDER BY created_at")
    .all(t) as unknown as StorylineRow[];
  if (!storylines.length) return { now: t, storylines: [], beats: [] };

  const articles = conn
    .prepare("SELECT * FROM articles WHERE storyline_id IS NOT NULL AND created_at <= ? ORDER BY created_at")
    .all(t) as unknown as ArticleRow[];
  // The post that carries each page, and each storyline's first post.
  const pagePost = new Map(
    (
      conn
        .prepare("SELECT article_id, MIN(id) AS id FROM posts WHERE article_id IS NOT NULL AND deleted = 0 GROUP BY article_id")
        .all() as unknown as { article_id: number; id: number }[]
    ).map((r) => [r.article_id, r.id]),
  );
  const firstPost = new Map(
    (
      conn
        .prepare(
          `SELECT p.storyline_id AS sid, p.id, p.created_at FROM posts p
           WHERE p.storyline_id IS NOT NULL AND p.deleted = 0 AND p.created_at <= ?
             AND p.created_at = (SELECT MIN(q.created_at) FROM posts q
                                 WHERE q.storyline_id = p.storyline_id AND q.deleted = 0)
           GROUP BY p.storyline_id`,
        )
        .all(t) as unknown as { sid: number; id: number; created_at: number }[]
    ).map((r) => [r.sid, r]),
  );

  // ---- beats: recorded ones, plus rebuilt ones for whatever came before them
  const recorded = recordedBeats(t);
  const bySl = new Map<number, Draft[]>();
  const push = (d: Draft) => {
    const list = bySl.get(d.storylineId);
    if (list) list.push(d);
    else bySl.set(d.storylineId, [d]);
  };
  const recordedArticles = new Set<number>();
  const firstRecorded = new Map<number, number>();
  for (const b of recorded) {
    if (b.article_id != null) recordedArticles.add(b.article_id);
    if (!firstRecorded.has(b.storyline_id)) firstRecorded.set(b.storyline_id, b.created_at);
    push({
      id: `b${b.id}`,
      storylineId: b.storyline_id,
      kind: KINDS.has(b.kind as BeatKind) ? (b.kind as BeatKind) : "advance",
      summary: b.summary,
      heat: b.heat,
      createdAt: b.created_at,
      postId: b.post_id,
      articleId: b.article_id,
      seeded: b.seeded === 1,
      premise: b.premise ?? null,
      recorded: true,
      headlineId: b.headline_id,
    });
  }
  const known = new Map(storylines.map((s) => [s.id, s]));
  let n = 0;
  for (const a of articles) {
    const s = a.storyline_id != null ? known.get(a.storyline_id) : undefined;
    if (!s || recordedArticles.has(a.id)) continue;
    // Pages published after recording began belong to a recorded beat already.
    const cutoff = firstRecorded.get(s.id);
    if (cutoff != null && a.created_at >= cutoff) continue;
    push({
      id: `s${s.id}-${n++}`, storylineId: s.id, kind: "advance", summary: a.headline, heat: s.heat,
      createdAt: a.created_at, postId: pagePost.get(a.id) ?? null, articleId: a.id, seeded: false, recorded: false,
      headlineId: null,
    });
  }
  for (const s of storylines) {
    if (bySl.has(s.id)) continue;
    // Nothing recorded and no page: the storyline still gets its opening node.
    const p = firstPost.get(s.id);
    push({
      id: `s${s.id}-open`, storylineId: s.id, kind: "advance", summary: "", heat: s.heat,
      createdAt: Math.min(s.created_at, p?.created_at ?? s.created_at), postId: p?.id ?? null, articleId: null,
      seeded: false, recorded: false, headlineId: null,
    });
  }

  const firstOf = new Map<number, Draft>();
  const drafts: Draft[] = [];
  for (const s of storylines) {
    const list = (bySl.get(s.id) ?? []).sort((a, b) => a.createdAt - b.createdAt);
    const first = list[0];
    if (!first) continue;
    firstOf.set(s.id, first);
    if (!first.recorded) {
      first.kind = openingKind(s.origin);
      // A rebuilt opening starts where the storyline's first post did.
      const p = firstPost.get(s.id);
      if (p && p.created_at < first.createdAt) first.createdAt = p.created_at;
      if (first.postId == null) first.postId = p?.id ?? null;
      // A rebuilt opening stands on the headline the storyline was opened from.
      if (s.origin === "headline") first.headlineId = s.headline_id;
    }
    drafts.push(...list);
  }
  drafts.sort((a, b) => b.createdAt - a.createdAt);
  const shown = drafts.slice(0, MAX_BEATS);

  // ---- what each beat touched: people and prices between it and the next beat
  const nextAt = new Map<string, number>();
  for (const s of storylines) {
    const list = bySl.get(s.id) ?? [];
    list.forEach((d, i) => nextAt.set(d.id, list[i + 1]?.createdAt ?? Infinity));
  }
  const ids = storylines.map((s) => s.id);
  const castPosts = conn
    .prepare(
      `SELECT p.storyline_id AS sid, p.author, p.created_at FROM posts p JOIN accounts a ON a.handle = p.author
       WHERE p.storyline_id IN (${qs(ids.length)}) AND p.deleted = 0 AND p.created_at <= ?
         AND a.kind IN ('figure', 'org')
       ORDER BY p.created_at`,
    )
    .all(...ids, t) as unknown as { sid: number; author: string; created_at: number }[];
  const moves = conn
    .prepare(
      `SELECT storyline_id AS sid, ticker, t, pct FROM stock_ticks
       WHERE storyline_id IN (${qs(ids.length)}) AND reason IS NOT NULL AND pct IS NOT NULL AND t <= ?
       ORDER BY t`,
    )
    .all(...ids, t) as unknown as { sid: number; ticker: string; t: number; pct: number }[];

  /** The beat of a storyline that an event at time `at` belongs to. */
  const beatAt = (sid: number, at: number, slack: number): Draft | undefined => {
    const list = bySl.get(sid);
    if (!list?.length) return undefined;
    let hit = list[0];
    for (const d of list) if (d.createdAt <= at + slack) hit = d;
    return hit;
  };
  const people = new Map<string, string[]>();
  for (const p of castPosts) {
    const d = beatAt(p.sid, p.created_at, 0);
    if (!d) continue;
    const list = people.get(d.id) ?? [];
    if (list.length < 4 && !list.some((h) => h.toLowerCase() === p.author.toLowerCase())) list.push(p.author);
    people.set(d.id, list);
  }
  const prices = new Map<string, Map<string, number>>();
  for (const m of moves) {
    // A move is scheduled a little after the beat that caused it.
    const d = beatAt(m.sid, m.t, 5 * MINUTE);
    if (!d) continue;
    const byTicker = prices.get(d.id) ?? new Map<string, number>();
    const prev = byTicker.get(m.ticker);
    if (prev == null || Math.abs(m.pct) > Math.abs(prev)) byTicker.set(m.ticker, m.pct);
    prices.set(d.id, byTicker);
  }

  const handles = [...new Set([...people.values()].flat().map((h) => h.toLowerCase()))];
  const lite = new Map<string, AccountLite>(
    handles.length
      ? (
          conn
            .prepare(`SELECT * FROM accounts WHERE LOWER(handle) IN (${qs(handles.length)})`)
            .all(...handles) as unknown as AccountRow[]
        ).map((r) => [r.handle.toLowerCase(), toLite(r)])
      : [],
  );
  const wanted = new Set(shown.flatMap((d) => (d.articleId != null ? [d.articleId] : [])));
  const cards = new Map<number, ArticleCard>(
    articleCards(articles.filter((a) => wanted.has(a.id))).map((c) => [c.id, c]),
  );

  // ---- the real headlines behind it all
  const headlineIds = [
    ...new Set([
      ...storylines.flatMap((s) => (s.headline_id != null ? [s.headline_id] : [])),
      ...drafts.flatMap((d) => (d.headlineId != null ? [d.headlineId] : [])),
    ]),
  ];
  const headlines = new Map<number, HeadlineRow>(
    headlineIds.length
      ? (
          conn
            .prepare(
              `SELECT id, title, source, link, published_at, relation, adapted FROM headlines WHERE id IN (${qs(headlineIds.length)})`,
            )
            .all(...headlineIds) as unknown as HeadlineRow[]
        ).map((h) => [h.id, h])
      : [],
  );
  const userPosts = new Map(
    (
      conn
        .prepare(
          `SELECT p.storyline_id AS sid, MIN(p.id) AS id FROM posts p JOIN accounts a ON a.handle = p.author
           WHERE a.kind = 'user' AND p.storyline_id IS NOT NULL AND p.deleted = 0 GROUP BY p.storyline_id`,
        )
        .all() as unknown as { sid: number; id: number }[]
    ).map((r) => [r.sid, r.id]),
  );

  /** A beat is the reader's when they proposed it or it answers their post; real or
   *  adapted when it drew on a real headline; otherwise the world made it up. */
  const provenanceOf = (d: Draft): Provenance => {
    if (d.seeded || d.kind === "user_reaction") return "yours";
    if (d.headlineId == null) return "invented";
    const h = headlines.get(d.headlineId);
    return h && rewriteOf(h) ? "adapted" : "real";
  };

  const beats: StoryMapBeat[] = shown.map((d) => ({
    id: d.id,
    storylineId: d.storylineId,
    kind: d.kind,
    first: firstOf.get(d.storylineId) === d,
    seeded: d.seeded,
    provenance: provenanceOf(d),
    summary: d.summary,
    heat: d.heat,
    createdAt: d.createdAt,
    postId: d.postId,
    page: d.articleId != null ? (cards.get(d.articleId) ?? null) : null,
    participants: (people.get(d.id) ?? []).flatMap((h) => lite.get(h.toLowerCase()) ?? []),
    moves: [...(prices.get(d.id) ?? new Map<string, number>())].slice(0, 3).map(([ticker, pct]) => ({ ticker, pct })),
  }));

  // ---- storylines that have a beat on the map, each with how it came about
  const titles = new Map(storylines.map((s) => [s.id, s.title]));
  const onMap = new Set(beats.map((b) => b.storylineId));
  const facts = new Map<number, string[]>();
  for (const f of conn
    .prepare(
      `SELECT storyline_id AS sid, text FROM facts
       WHERE storyline_id IN (${qs(ids.length)}) AND created_at <= ? ORDER BY created_at`,
    )
    .all(...ids, t) as unknown as { sid: number; text: string }[]) {
    const list = facts.get(f.sid) ?? [];
    if (list.length < 5) list.push(f.text);
    facts.set(f.sid, list);
  }
  const spinoffs = new Map<number, { id: number; title: string }[]>();
  for (const s of storylines) {
    if (s.parent_id == null || !known.has(s.parent_id) || !onMap.has(s.id)) continue;
    spinoffs.set(s.parent_id, [...(spinoffs.get(s.parent_id) ?? []), { id: s.id, title: s.title }]);
  }

  const backgroundOf = (s: StorylineRow, first: Draft | undefined): StoryBackground => {
    let started: StoryBackground["started"] = { kind: "invented" };
    let opener: number | null = null;
    if (s.origin === "user") {
      const post = userPosts.get(s.id);
      // A recorded opening says which it was; otherwise the reader's post decides.
      started =
        post != null && !(first?.recorded && first.seeded)
          ? { kind: "post", postId: post }
          : { kind: "whatif", text: first?.premise || first?.summary || null };
    } else if (s.origin === "headline") {
      opener = s.headline_id;
      const h = opener != null ? headlines.get(opener) : undefined;
      started = { kind: "headline", headline: h ? realHeadline(h) : null };
    }
    const cited = [...new Set((bySl.get(s.id) ?? []).flatMap((d) => (d.headlineId != null ? [d.headlineId] : [])))];
    return {
      started,
      parent: s.parent_id != null && known.has(s.parent_id) ? { id: s.parent_id, title: titles.get(s.parent_id) ?? "" } : null,
      spinoffs: spinoffs.get(s.id) ?? [],
      drewOn: cited.filter((id) => id !== opener).flatMap((id) => {
        const h = headlines.get(id);
        return h ? [realHeadline(h)] : [];
      }).slice(0, 6),
      facts: facts.get(s.id) ?? [],
    };
  };
  const storyProvenance = (s: StorylineRow): Provenance => {
    if (s.origin === "user") return "yours";
    if (s.origin !== "headline") return "invented";
    const h = s.headline_id != null ? headlines.get(s.headline_id) : undefined;
    return h && rewriteOf(h) ? "adapted" : "real";
  };

  const out: StoryMapStoryline[] = storylines
    .filter((s) => onMap.has(s.id))
    .map((s) => ({
      id: s.id,
      parentId: s.parent_id != null && known.has(s.parent_id) ? s.parent_id : null,
      title: s.title,
      domain: s.domain as Domain,
      dormant: s.status !== "open",
      origin: originOf(s, firstOf.get(s.id), titles, headlines),
      provenance: storyProvenance(s),
      background: backgroundOf(s, firstOf.get(s.id)),
    }));

  return { now: t, storylines: out, beats };
}
