// Row-to-DTO mapping for accounts, posts, articles. Server-only.
// postViews batches its lookups (a fixed handful of queries however many ids).
import { db, now, userHandle } from "./db";
import type { AccountRow, ArticleRow, PostRow } from "./db";
import { shownCounts } from "./engagement";
import type {
  Account, AccountKind, AccountLite, ArticleCard, ArticleView, Badge, Domain, PostView, QuotedPost, Tone,
} from "./types";

export const qs = (n: number) => Array(n).fill("?").join(",");

export function toLite(a: AccountRow): AccountLite {
  return { handle: a.handle, name: a.name, avatar: a.avatar, badge: a.badge as Badge, kind: a.kind as AccountKind };
}

function parseList(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}
export { parseList };

/** Full account DTOs for the given handles (any case), in input order; unknown handles are skipped. */
export function accountViews(handles: string[]): Account[] {
  const uniq = [...new Set(handles.map((h) => h.toLowerCase()))];
  if (!uniq.length) return [];
  const conn = db();
  const rows = conn
    .prepare(`SELECT * FROM accounts WHERE LOWER(handle) IN (${qs(uniq.length)})`)
    .all(...uniq) as unknown as AccountRow[];
  const followed = new Set(
    (conn.prepare("SELECT handle FROM follows").all() as unknown as { handle: string }[]).map((r) =>
      r.handle.toLowerCase(),
    ),
  );
  const me = userHandle()?.toLowerCase() ?? null;
  const byHandle = new Map(rows.map((r) => [r.handle.toLowerCase(), r]));
  const out: Account[] = [];
  for (const h of handles) {
    const r = byHandle.get(h.toLowerCase());
    if (!r) continue;
    out.push({
      ...toLite(r),
      bio: r.bio,
      domain: r.domain as Domain,
      followers: r.followers,
      following: r.following,
      location: r.location,
      joined: r.joined,
      banner: r.banner,
      isFollowing: followed.has(r.handle.toLowerCase()),
      isSelf: r.handle.toLowerCase() === me,
    });
  }
  return out;
}

export function accountView(handle: string): Account | null {
  return accountViews([handle])[0] ?? null;
}

export function articleCards(rows: ArticleRow[]): ArticleCard[] {
  const handles = [...new Set(rows.map((r) => r.outlet))];
  const lite = liteMap(handles);
  const out: ArticleCard[] = [];
  for (const r of rows) {
    const outlet = lite.get(r.outlet.toLowerCase());
    if (outlet) out.push({ id: r.id, outlet, headline: r.headline, dek: r.dek, createdAt: r.created_at });
  }
  return out;
}

export function articleView(r: ArticleRow): ArticleView | null {
  const card = articleCards([r])[0];
  return card ? { ...card, body: r.body, storylineId: r.storyline_id } : null;
}

function liteMap(handles: string[]): Map<string, AccountLite> {
  const uniq = [...new Set(handles.map((h) => h.toLowerCase()))];
  if (!uniq.length) return new Map();
  const rows = db()
    .prepare(`SELECT * FROM accounts WHERE LOWER(handle) IN (${qs(uniq.length)})`)
    .all(...uniq) as unknown as AccountRow[];
  return new Map(rows.map((r) => [r.handle.toLowerCase(), toLite(r)]));
}

/** Post DTOs in the order of `ids`. Missing, not-yet-visible and deleted posts
 *  are skipped; with `tombstones`, a deleted post comes back as a tombstone. */
export function postViews(ids: number[], opts: { tombstones?: boolean } = {}): PostView[] {
  const uniq = [...new Set(ids)];
  if (!uniq.length) return [];
  const conn = db();
  const t = now();
  const posts = conn
    .prepare(`SELECT * FROM posts WHERE id IN (${qs(uniq.length)}) AND created_at <= ?`)
    .all(...uniq, t) as unknown as PostRow[];
  if (!posts.length) return [];

  const have = posts.map((p) => p.id);
  const quoteIds = [...new Set(posts.flatMap((p) => (p.quote_of != null ? [p.quote_of] : [])))];
  const parentIds = [...new Set(posts.flatMap((p) => (p.reply_to != null ? [p.reply_to] : [])))];
  const articleIds = [...new Set(posts.flatMap((p) => (p.article_id != null ? [p.article_id] : [])))];

  const quotes = quoteIds.length
    ? (conn
        .prepare(
          `SELECT id, author, text, created_at FROM posts
           WHERE id IN (${qs(quoteIds.length)}) AND created_at <= ? AND deleted = 0`,
        )
        .all(...quoteIds, t) as unknown as Pick<PostRow, "id" | "author" | "text" | "created_at">[])
    : [];
  const parents = parentIds.length
    ? (conn
        .prepare(`SELECT id, author FROM posts WHERE id IN (${qs(parentIds.length)})`)
        .all(...parentIds) as unknown as Pick<PostRow, "id" | "author">[])
    : [];
  const articles = articleIds.length
    ? (conn
        .prepare(`SELECT * FROM articles WHERE id IN (${qs(articleIds.length)}) AND created_at <= ?`)
        .all(...articleIds, t) as unknown as ArticleRow[])
    : [];
  const states = conn
    .prepare(`SELECT post_id, liked, reposted, bookmarked FROM viewer_state WHERE post_id IN (${qs(have.length)})`)
    .all(...have) as unknown as { post_id: number; liked: number; reposted: number; bookmarked: number }[];
  const replyCounts = conn
    .prepare(
      `SELECT reply_to AS id, COUNT(*) AS n FROM posts
       WHERE reply_to IN (${qs(have.length)}) AND created_at <= ? AND deleted = 0 GROUP BY reply_to`,
    )
    .all(...have, t) as unknown as { id: number; n: number }[];

  const lite = liteMap([
    ...posts.map((p) => p.author),
    ...quotes.map((q) => q.author),
    ...parents.map((p) => p.author),
    ...articles.map((a) => a.outlet),
  ]);
  const quoteMap = new Map(quotes.map((q) => [q.id, q]));
  const parentMap = new Map(parents.map((p) => [p.id, p.author]));
  const cardMap = new Map(articleCards(articles).map((c) => [c.id, c]));
  const stateMap = new Map(states.map((s) => [s.post_id, s]));
  const replyMap = new Map(replyCounts.map((r) => [r.id, r.n]));
  const byId = new Map(posts.map((p) => [p.id, p]));

  const out: PostView[] = [];
  for (const id of uniq) {
    const p = byId.get(id);
    const author = p && lite.get(p.author.toLowerCase());
    if (!p || !author) continue;
    if (p.deleted) {
      if (opts.tombstones) {
        out.push({
          id: p.id, author, text: "", createdAt: p.created_at, replyTo: null, quote: null,
          quoteUnavailable: false, deleted: true, article: null, storylineId: null, domain: null,
          tone: null, topics: [], counts: { replies: 0, reposts: 0, likes: 0, views: 0 },
          viewer: { liked: false, reposted: false, bookmarked: false },
        });
      }
      continue;
    }
    const s = stateMap.get(p.id);
    const viewer = { liked: !!s?.liked, reposted: !!s?.reposted, bookmarked: !!s?.bookmarked };
    const c = shownCounts(
      { likes: p.t_likes, reposts: p.t_reposts, replies: p.t_replies, views: p.t_views },
      t - p.created_at,
    );
    c.replies = Math.max(c.replies, replyMap.get(p.id) ?? 0);
    if (viewer.liked) c.likes += 1;
    if (viewer.reposted) c.reposts += 1;

    let quote: QuotedPost | null = null;
    const q = p.quote_of != null ? quoteMap.get(p.quote_of) : undefined;
    const qa = q && lite.get(q.author.toLowerCase());
    if (q && qa) quote = { id: q.id, author: qa, text: q.text, createdAt: q.created_at };
    const parentAuthor = p.reply_to != null ? parentMap.get(p.reply_to) : undefined;

    out.push({
      id: p.id,
      author,
      text: p.text,
      createdAt: p.created_at,
      replyTo:
        p.reply_to != null && parentAuthor
          ? { id: p.reply_to, handle: lite.get(parentAuthor.toLowerCase())?.handle ?? parentAuthor }
          : null,
      quote,
      quoteUnavailable: p.quote_of != null && quote == null,
      deleted: false,
      article: p.article_id != null ? (cardMap.get(p.article_id) ?? null) : null,
      storylineId: p.storyline_id,
      domain: p.domain as Domain | null,
      tone: p.tone as Tone | null,
      topics: parseList(p.topics),
      counts: c,
      viewer,
    });
  }
  return out;
}

export function postView(id: number): PostView | null {
  return postViews([id])[0] ?? null;
}
