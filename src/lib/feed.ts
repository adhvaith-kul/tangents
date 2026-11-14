// Timeline ranking, trends, sidebar and explore reads. Server-only.
import { db, now, userHandle } from "./db";
import type { ArticleRow } from "./db";
import { prefMap } from "./prefs";
import { simStatus } from "./sim";
import { stockViews } from "./stocks";
import type {
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
}

/** Squashed sum of the user's weights for a post's author, topics, domain, tone and storyline. */
function affinity(w: Map<string, number>, c: Cand): number {
  let sum = w.get(`author:${c.author.toLowerCase()}`) ?? 0;
  for (const t of new Set(parseList(c.topics).map((s) => s.toLowerCase()))) sum += w.get(`topic:${t}`) ?? 0;
  if (c.domain) sum += w.get(`domain:${c.domain}`) ?? 0;
  if (c.tone) sum += w.get(`tone:${c.tone}`) ?? 0;
  if (c.storyline_id != null) sum += w.get(`storyline:${c.storyline_id}`) ?? 0;
  return Math.tanh(sum / 10);
}

export function getFeed(tab: "foryou" | "following", cursor: number | null, after: number | null): FeedResponse {
  const t = now();
  const me = userHandle() ?? "";
  const scope =
    tab === "following"
      ? "AND (p.author IN (SELECT handle FROM follows) OR p.author = ?)"
      : "AND ? = ?";
  const scopeArgs: (string | number)[] = tab === "following" ? [me] : ["", ""];
  const base = `FROM posts p LEFT JOIN viewer_state v ON v.post_id = p.id
    WHERE p.reply_to IS NULL AND p.created_at <= ? AND p.deleted = 0 AND COALESCE(v.hidden, 0) = 0 ${scope}`;

  if (after != null) {
    const rows = db()
      .prepare(`SELECT p.id ${base} AND p.created_at > ? ORDER BY p.created_at DESC, p.id DESC LIMIT ?`)
      .all(t, ...scopeArgs, after, AFTER_MAX) as unknown as { id: number }[];
    return { posts: postViews(rows.map((r) => r.id)), nextCursor: null, now: t };
  }

  if (tab === "following") {
    const rows = db()
      .prepare(
        `SELECT p.id, p.created_at ${base} ${cursor != null ? "AND p.created_at < ?" : ""}
         ORDER BY p.created_at DESC, p.id DESC LIMIT ?`,
      )
      .all(t, ...scopeArgs, ...(cursor != null ? [cursor] : []), PAGE + 1) as unknown as {
      id: number; created_at: number;
    }[];
    const page = rows.slice(0, PAGE);
    return {
      posts: postViews(page.map((r) => r.id)),
      nextCursor: rows.length > PAGE ? page[page.length - 1].created_at : null,
      now: t,
    };
  }

  // For you: the cursor is the ranking score of the last post of the previous page.
  const cands = db()
    .prepare(
      `SELECT p.id, p.author, p.created_at, p.storyline_id, p.domain, p.tone, p.topics ${base}
       ORDER BY p.created_at DESC, p.id DESC LIMIT ?`,
    )
    .all(t, ...scopeArgs, CANDIDATES) as unknown as Cand[];
  const w = prefMap();
  const ranked = cands
    .map((c) => {
      const aff = affinity(w, c);
      return { c, aff, score: c.created_at + aff * MAX_BOOST_MS };
    })
    .filter((r) => cursor == null || r.score < cursor)
    .sort((a, b) => b.score - a.score);
  const more = ranked.length > PAGE;
  const page = ranked.slice(0, PAGE);

  // Every eighth slot goes to the newest post in the page with zero or negative affinity.
  const explore = page.filter((r) => r.aff <= 0).sort((a, b) => b.c.created_at - a.c.created_at);
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
    posts: postViews(order.map((r) => r.c.id)),
    nextCursor: more ? page[page.length - 1].score : null,
    now: t,
  };
}

// ------------------------------------------------------------------ trends

interface TrendRow {
  id: number; label: string; category: string; storyline_id: number | null;
  domain: string | null; heat: number; posts: number; created_at: number;
}

/** Visible trends, recent first, weighted by heat and the user's domain affinity, one per label. */
export function trendsFor(limit: number): Trend[] {
  const t = now();
  const rows = db()
    .prepare("SELECT * FROM trends WHERE created_at <= ? ORDER BY created_at DESC, id DESC LIMIT 60")
    .all(t) as unknown as TrendRow[];
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
       WHERE kind IN ('figure','outlet') AND handle NOT IN (SELECT handle FROM follows)`,
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

export function getExplore(q: string): ExploreResponse {
  const t = now();
  const articleRows = db()
    .prepare("SELECT * FROM articles WHERE created_at <= ? ORDER BY created_at DESC, id DESC LIMIT 10")
    .all(t) as unknown as ArticleRow[];
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
  return { trends: trendsFor(10), articles: articleCards(articleRows), posts };
}
