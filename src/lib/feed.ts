// Timeline ranking, trends, sidebar and explore reads. Server-only.
import { db, now, userHandle } from "./db";
import type { ArticleRow } from "./db";
import { prefMap } from "./prefs";
import { simStatus } from "./sim";
import { stockViews } from "./stocks";
import type {
  Domain,
  Account, ExploreResponse, FeedResponse, SidebarResponse, Trend,
} from "./types";
import { accountViews, articleCards, parseList, postViews } from "./views";

const PAGE = 30;
const AFTER_MAX = 50;
const CANDIDATES = 500;
const MAX_BOOST_MS = 30 * 60_000;

interface Cand {
  id: number;
  author: string;
  created_at: number;
  storyline_id: number | null;
  domain: string | null;
  tone: string | null;
  topics: string;
  quote_of: number | null;
  r_by: string | null; // latest visible repost by a followed account
  r_at: number | null;
  eff: number; // the later of the post's time and that repost's time
  lbl: number; // 1 when the repost is why the post is here or what lifted it
}

/** How well a post matches the user's taste, from -1 to 1. Specific keys (the
 *  author, the topics) count in full; broad ones (domain, tone) count for a
 *  quarter, so "likes pop culture" nudges a post without making every pop post
 *  rank the same. */
function affinity(w: Map<string, number>, c: Cand): number {
  let sum = w.get(`author:${c.author.toLowerCase()}`) ?? 0;
  const topics = [...new Set(parseList(c.topics).map((s) => s.toLowerCase()))];
  if (topics.length) sum += topics.reduce((a, t) => a + (w.get(`topic:${t}`) ?? 0), 0) / topics.length;
  if (c.domain) sum += 0.25 * (w.get(`domain:${c.domain}`) ?? 0);
  if (c.tone) sum += 0.25 * (w.get(`tone:${c.tone}`) ?? 0);
  if (c.storyline_id != null) sum += 0.5 * (w.get(`storyline:${c.storyline_id}`) ?? 0);
  return Math.tanh(sum / 12);
}

/** One row per candidate post (so a post never repeats), with its repost by a followed account, if any.
 *  The user's own reposts never count here. `extra` filters on the outer columns (eff). */
export function candidateSql(tab: "foryou" | "following", extra: string): string {
  const authorOk = tab === "following" ? "(p.author IN (SELECT handle FROM follows) OR p.author = $me)" : "1";
  return `SELECT * FROM (
    SELECT p.id, p.author, p.created_at, p.storyline_id, p.domain, p.tone, p.topics, p.quote_of,
           r.account AS r_by, r.at AS r_at,
           MAX(p.created_at, COALESCE(r.at, 0)) AS eff,
           (r.post_id IS NOT NULL AND (r.at > p.created_at OR NOT (p.reply_to IS NULL AND ${authorOk}))) AS lbl
    FROM posts p
    LEFT JOIN viewer_state v ON v.post_id = p.id
    LEFT JOIN (
      SELECT post_id, account, MAX(created_at) AS at FROM reposts
      WHERE created_at <= $t AND account != $me AND account IN (SELECT handle FROM follows)
      GROUP BY post_id
    ) r ON r.post_id = p.id
    WHERE p.created_at <= $t AND p.deleted = 0 AND COALESCE(v.hidden, 0) = 0
      AND ((p.reply_to IS NULL AND ${authorOk}) OR r.post_id IS NOT NULL)
  ) WHERE 1 = 1 ${extra}
  ORDER BY eff DESC, id DESC LIMIT $lim`;
}

function repostMap(rows: Cand[]): Map<number, { by: string; at: number }> {
  const m = new Map<number, { by: string; at: number }>();
  for (const r of rows) if (r.lbl && r.r_by != null && r.r_at != null) m.set(r.id, { by: r.r_by, at: r.r_at });
  return m;
}

export function getFeed(tab: "foryou" | "following", cursor: number | null, after: number | null): FeedResponse {
  const t = now();
  const me = userHandle() ?? "";
  const run = (extra: string, lim: number, more: Record<string, number> = {}) =>
    db().prepare(candidateSql(tab, extra)).all({ t, me, lim, ...more }) as unknown as Cand[];
  const view = (rows: Cand[]) => postViews(rows.map((r) => r.id), { reposts: repostMap(rows) });

  if (after != null) {
    return { posts: view(run("AND eff > $after", AFTER_MAX, { after })), nextCursor: null, now: t };
  }

  if (tab === "following") {
    const rows = cursor != null ? run("AND eff < $cursor", PAGE + 1, { cursor }) : run("", PAGE + 1);
    const page = rows.slice(0, PAGE);
    return {
      posts: view(page),
      nextCursor: rows.length > PAGE ? page[page.length - 1].eff : null,
      now: t,
    };
  }

  // For you: the cursor is the ranking score of the last post of the previous page.
  const cands = run("", CANDIDATES);
  const w = prefMap();
  const ranked = cands
    .map((c) => {
      const aff = affinity(w, c);
      return { c, aff, score: c.eff + aff * MAX_BOOST_MS };
    })
    .filter((r) => cursor == null || r.score < cursor)
    .sort((a, b) => b.score - a.score);
  const more = ranked.length > PAGE;
  const page = ranked.slice(0, PAGE);

  // Every eighth slot goes to the newest post in the page with zero or negative affinity.
  const explore = page.filter((r) => r.aff <= 0).sort((a, b) => b.c.eff - a.c.eff);
  const used = new Set<number>();
  const order: typeof page = [];
  const rest = [...page];
  for (let i = 0; i < page.length; i++) {
    let pick: (typeof page)[number] | undefined;
    if (i % 8 === 7) {
      pick = explore.find((r) => !used.has(r.c.id));
      if (pick) rest.splice(rest.indexOf(pick), 1);
    }
    if (!pick) {
      pick = rest.shift();
    }
    if (!pick) break;
    used.add(pick.c.id);
    order.push(pick);
  }
  return {
    posts: view(spread(order.map((r) => r.c))),
    nextCursor: more ? page[page.length - 1].score : null,
    now: t,
  };
}

/** Keep one account or one story from filling the screen. An account never
 *  appears back to back, and at most twice in any eight posts. A storyline
 *  never appears back to back, and at most twice in any six. A post is kept
 *  away from the post it quotes and from another quote of the same post, so
 *  the same headline is not read three times running. A post that would break
 *  a rule waits for the next slot where it fits; whatever cannot be placed
 *  goes at the end. */
function spread(rows: Cand[]): Cand[] {
  const out: Cand[] = [];
  const waiting: Cand[] = [];
  const fits = (c: Cand) => {
    const authors = out.slice(-7).map((r) => r.author);
    if (authors[authors.length - 1] === c.author || authors.filter((a) => a === c.author).length >= 2) return false;
    if (c.storyline_id != null) {
      const stories = out.slice(-5).map((r) => r.storyline_id);
      if (stories[stories.length - 1] === c.storyline_id) return false;
      if (stories.filter((s) => s === c.storyline_id).length >= 2) return false;
    }
    const near = out.slice(-5);
    if (c.quote_of != null && near.some((r) => r.id === c.quote_of || r.quote_of === c.quote_of)) return false;
    if (near.some((r) => r.quote_of === c.id)) return false;
    return true;
  };
  for (const c of rows) {
    for (let i = 0; i < waiting.length; i++) {
      if (fits(waiting[i])) out.push(...waiting.splice(i--, 1));
    }
    if (fits(c)) out.push(c);
    else waiting.push(c);
  }
  return [...out, ...waiting];
}

// ------------------------------------------------------------------ trends

interface TrendRow {
  id: number; label: string; category: string; storyline_id: number | null;
  domain: string | null; heat: number; posts: number; created_at: number;
}

/** Visible trends, recent first, weighted by heat and the user's domain affinity, one per label. */
export function trendsFor(limit: number, domain: Domain | null = null): Trend[] {
  const t = now();
  const rows = db()
    .prepare(
      "SELECT * FROM trends WHERE created_at <= ? AND (? IS NULL OR domain = ?) ORDER BY created_at DESC, id DESC LIMIT 60",
    )
    .all(t, domain, domain) as unknown as TrendRow[];
  const w = prefMap();
  const seen = new Set<string>();
  const scored = rows
    .filter((r) => {
      const k = r.label.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((r) => {
      const ageH = (t - r.created_at) / 3_600_000;
      const taste = r.domain ? Math.tanh((w.get(`domain:${r.domain}`) ?? 0) / 10) : 0;
      return { r, score: r.heat + 3 * taste - 0.5 * ageH };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return scored.map(({ r }) => ({
    id: r.id, label: r.label, category: r.category, posts: r.posts, storylineId: r.storyline_id,
  }));
}

// ----------------------------------------------------------------- sidebar

export function getSidebar(): SidebarResponse {
  const t = now();
  const stocks = stockViews()
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, 4);

  const w = prefMap();
  const cands = db()
    .prepare(
      `SELECT handle, domain, followers FROM accounts
       WHERE kind IN ('figure','outlet','org') AND handle NOT IN (SELECT handle FROM follows)`,
    )
    .all() as unknown as { handle: string; domain: string; followers: number }[];
  const best = cands
    .map((a) => ({
      a,
      s: (w.get(`author:${a.handle.toLowerCase()}`) ?? 0) + 0.5 * (w.get(`domain:${a.domain}`) ?? 0),
    }))
    .sort((x, y) => y.s - x.s || y.a.followers - x.a.followers)
    .slice(0, 3);
  const whoToFollow: Account[] = accountViews(best.map((b) => b.a.handle));

  const unread = (
    db().prepare("SELECT COUNT(*) AS n FROM notifications WHERE read = 0 AND created_at <= ?").get(t) as unknown as {
      n: number;
    }
  ).n;
  return { trends: trendsFor(5), stocks, whoToFollow, sim: simStatus(), unread };
}

// ----------------------------------------------------------------- explore

/** X's Explore tabs. Sports and Entertainment narrow everything to one subject. */
export type ExploreTab = "for_you" | "trending" | "news" | "sports" | "entertainment";
const EXPLORE_DOMAIN: Partial<Record<ExploreTab, Domain>> = { sports: "sports", entertainment: "pop" };

export function getExplore(q: string, tab: ExploreTab = "for_you"): ExploreResponse {
  const t = now();
  const domain = EXPLORE_DOMAIN[tab] ?? null;
  const articleRows = tab === "trending"
    ? []
    : (db()
        .prepare(
          `SELECT a.* FROM articles a LEFT JOIN storylines s ON s.id = a.storyline_id
           WHERE a.created_at <= ? AND (? IS NULL OR s.domain = ?)
           ORDER BY a.created_at DESC, a.id DESC LIMIT ?`,
        )
        .all(t, domain, domain, tab === "news" ? 30 : 10) as unknown as ArticleRow[]);
  let posts: ExploreResponse["posts"] = [];
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    const ids = db()
      .prepare(
        `SELECT p.id FROM posts p JOIN accounts a ON a.handle = p.author
         WHERE p.created_at <= ? AND p.deleted = 0
           AND (p.text LIKE ? ESCAPE '\\' OR a.name LIKE ? ESCAPE '\\' OR a.handle LIKE ? ESCAPE '\\')
         ORDER BY p.created_at DESC, p.id DESC LIMIT 30`,
      )
      .all(t, like, like, like) as unknown as { id: number }[];
    posts = postViews(ids.map((r) => r.id));
  }
  return { trends: tab === "news" ? [] : trendsFor(tab === "trending" ? 30 : 10, domain), articles: articleCards(articleRows), posts };
}
