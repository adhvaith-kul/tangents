// Reads for threads, profiles, articles, notifications and the world page. Server-only.
import { db, now } from "./db";
import type { AccountRow, ArticleRow, PostRow, StorylineRow } from "./db";
import { tasteProfile } from "./prefs";
import type {
  AccountLite, ArticleResponse, Domain, FactView, NotificationType, NotificationView,
  ProfileResponse, RelationshipView, StorylineView, ThreadResponse, Tone, UsageTotals, WorldResponse,
} from "./types";
import { accountView, articleCards, articleView, parseList, postViews, qs, toLite } from "./views";

export function getThread(id: number): ThreadResponse | null {
  const conn = db();
  const t = now();
  const row = conn.prepare("SELECT * FROM posts WHERE id = ? AND created_at <= ?").get(id, t) as unknown as
    | PostRow | undefined;
  if (!row || row.deleted) return null;
  const post = postViews([id])[0];
  if (!post) return null;

  const chain: number[] = [];
  let parent = row.reply_to;
  while (parent != null && chain.length < 50 && !chain.includes(parent)) {
    chain.push(parent);
    parent = (conn.prepare("SELECT reply_to FROM posts WHERE id = ?").get(parent) as
      | { reply_to: number | null } | undefined)?.reply_to ?? null;
  }
  const me = (conn.prepare("SELECT handle FROM accounts WHERE kind = 'user' LIMIT 1").get() as
    | { handle: string } | undefined)?.handle ?? "";
  const replyIds = conn
    .prepare(
      `SELECT id FROM posts WHERE reply_to = ? AND created_at <= ? AND deleted = 0
       ORDER BY (author = ?) DESC, (author = ? AND ? != '') DESC, t_likes DESC, created_at ASC LIMIT 100`,
    )
    .all(id, t, row.author, me, me) as unknown as { id: number }[];
  return {
    ancestors: postViews(chain.reverse(), { tombstones: true }),
    post,
    replies: postViews(replyIds.map((r) => r.id)),
  };
}

export function getProfile(handle: string, tab: "posts" | "replies"): ProfileResponse | null {
  const account = accountView(handle);
  if (!account) return null;
  const t = now();
  // Own posts and own reposts, merged newest first by post time or repost time.
  const rows = db()
    .prepare(
      `SELECT id, at, rp FROM (
         SELECT id, created_at AS at, 0 AS rp FROM posts
         WHERE author = ? AND created_at <= ? AND deleted = 0 ${tab === "posts" ? "AND reply_to IS NULL" : ""}
         UNION ALL
         SELECT p.id, r.created_at AS at, 1 AS rp FROM reposts r JOIN posts p ON p.id = r.post_id
         WHERE r.account = ? AND r.created_at <= ? AND p.created_at <= ? AND p.deleted = 0
       ) ORDER BY at DESC, id DESC LIMIT 100`,
    )
    .all(account.handle, t, account.handle, t, t) as unknown as { id: number; at: number; rp: number }[];
  const seen = new Set<number>();
  const ids: number[] = [];
  const reposts = new Map<number, { by: string; at: number }>();
  for (const r of rows) {
    if (seen.has(r.id)) continue; // a post the account both wrote and reposted shows once, at its newest
    seen.add(r.id);
    ids.push(r.id);
    if (r.rp) reposts.set(r.id, { by: account.handle, at: r.at });
    if (ids.length === 50) break;
  }
  const total = db()
    .prepare("SELECT COUNT(*) AS n FROM posts WHERE author = ? AND created_at <= ? AND deleted = 0")
    .get(account.handle, t) as { n: number };
  return { account, posts: postViews(ids, { reposts }), postCount: total.n };
}

export function getArticle(id: number): ArticleResponse | null {
  const row = db().prepare("SELECT * FROM articles WHERE id = ? AND created_at <= ?").get(id, now()) as unknown as
    | ArticleRow | undefined;
  const article = row && articleView(row);
  if (!row || !article) return null;
  const ids = db()
    .prepare(
      `SELECT id FROM posts WHERE reply_to IS NULL AND created_at <= ? AND deleted = 0 AND (storyline_id = ? OR article_id = ?)
       ORDER BY t_likes DESC, created_at DESC LIMIT 30`,
    )
    .all(now(), row.storyline_id, row.id) as unknown as { id: number }[];
  const others = db()
    .prepare(
      `SELECT * FROM articles WHERE outlet = ? AND id != ? AND created_at <= ?
       ORDER BY created_at DESC, id DESC LIMIT 5`,
    )
    .all(row.outlet, row.id, now()) as unknown as ArticleRow[];
  return { article, posts: postViews(ids.map((r) => r.id)), more: articleCards(others) };
}

export function getNotifications(): NotificationView[] {
  const conn = db();
  const rows = conn
    .prepare("SELECT * FROM notifications WHERE created_at <= ? ORDER BY created_at DESC, id DESC LIMIT 50")
    .all(now()) as unknown as {
    id: number; type: string; actor: string; post_id: number | null; target_post_id: number | null;
    count: number; created_at: number; read: number;
  }[];
  if (!rows.length) return [];
  const actors = conn
    .prepare(`SELECT * FROM accounts WHERE LOWER(handle) IN (${qs(new Set(rows.map((r) => r.actor.toLowerCase())).size)})`)
    .all(...new Set(rows.map((r) => r.actor.toLowerCase()))) as unknown as AccountRow[];
  const lite = new Map<string, AccountLite>(actors.map((a) => [a.handle.toLowerCase(), toLite(a)]));
  const posts = new Map(
    postViews(rows.flatMap((r) => [r.post_id, r.target_post_id].filter((x): x is number => x != null))).map(
      (p) => [p.id, p] as const,
    ),
  );
  const out: NotificationView[] = [];
  for (const r of rows) {
    const actor = lite.get(r.actor.toLowerCase());
    if (!actor) continue;
    // A notification about a post that has since been deleted goes with it.
    if (r.post_id != null && !posts.has(r.post_id)) continue;
    if (r.target_post_id != null && !posts.has(r.target_post_id)) continue;
    out.push({
      id: r.id,
      type: r.type as NotificationType,
      actors: [actor],
      count: Math.max(1, r.count),
      post: r.post_id != null ? (posts.get(r.post_id) ?? null) : null,
      target: r.target_post_id != null ? (posts.get(r.target_post_id) ?? null) : null,
      createdAt: r.created_at,
      read: !!r.read,
    });
  }
  conn.prepare(`UPDATE notifications SET read = 1 WHERE id IN (${qs(rows.length)})`).run(...rows.map((r) => r.id));
  return out;
}

export function getWorld(): WorldResponse {
  const conn = db();
  const sl = conn
    .prepare(
      `SELECT s.*, h.title AS headline FROM storylines s LEFT JOIN headlines h ON h.id = s.headline_id
       ORDER BY (s.status = 'open') DESC, s.updated_at DESC, s.id DESC`,
    )
    .all() as unknown as (StorylineRow & { headline: string | null })[];
  const partHandles = [...new Set(sl.flatMap((s) => parseList(s.participants).map((h) => h.toLowerCase())))];
  const partRows = partHandles.length
    ? (conn.prepare(`SELECT * FROM accounts WHERE LOWER(handle) IN (${qs(partHandles.length)})`).all(...partHandles) as unknown as AccountRow[])
    : [];
  const partLite = new Map(partRows.map((a) => [a.handle.toLowerCase(), toLite(a)]));
  const storylines: StorylineView[] = sl.map((s) => ({
    id: s.id,
    parentId: s.parent_id,
    title: s.title,
    summary: s.summary,
    domain: s.domain as Domain,
    tone: s.tone as Tone,
    origin: s.origin as StorylineView["origin"],
    headline: s.headline,
    participants: parseList(s.participants).flatMap((h) => {
      const a = partLite.get(h.toLowerCase());
      return a ? [a] : [];
    }),
    heat: s.heat,
    status: s.status as StorylineView["status"],
    beats: s.beats,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  }));

  const rels = conn
    .prepare("SELECT * FROM relationships WHERE score != 0 ORDER BY ABS(score) DESC, updated_at DESC")
    .all() as unknown as { a: string; b: string; score: number; note: string; updated_at: number }[];
  const handles = [...new Set(rels.flatMap((r) => [r.a.toLowerCase(), r.b.toLowerCase()]))];
  const accounts = handles.length
    ? (conn.prepare(`SELECT * FROM accounts WHERE LOWER(handle) IN (${qs(handles.length)})`).all(...handles) as unknown as AccountRow[])
    : [];
  const lite = new Map(accounts.map((a) => [a.handle.toLowerCase(), toLite(a)]));
  const relationships: RelationshipView[] = [];
  for (const r of rels) {
    const a = lite.get(r.a.toLowerCase());
    const b = lite.get(r.b.toLowerCase());
    if (a && b) relationships.push({ a, b, score: r.score, note: r.note, updatedAt: r.updated_at });
  }

  const facts = (conn
    .prepare("SELECT * FROM facts ORDER BY created_at DESC, id DESC LIMIT 100")
    .all() as unknown as { id: number; text: string; subjects: string; storyline_id: number | null; created_at: number }[]
  ).map<FactView>((f) => ({
    id: f.id, text: f.text, subjects: parseList(f.subjects), storylineId: f.storyline_id, createdAt: f.created_at,
  }));

  const byRole = conn
    .prepare(
      `SELECT role, COUNT(*) AS calls, COALESCE(SUM(input_tokens),0) AS inputTokens,
              COALESCE(SUM(output_tokens),0) AS outputTokens
       FROM llm_calls GROUP BY role ORDER BY role`,
    )
    .all() as unknown as UsageTotals["byRole"];
  const usage: UsageTotals = {
    calls: byRole.reduce((n, r) => n + r.calls, 0),
    inputTokens: byRole.reduce((n, r) => n + r.inputTokens, 0),
    outputTokens: byRole.reduce((n, r) => n + r.outputTokens, 0),
    byRole: byRole.map((r) => ({ ...r })),
  };
  return { storylines, relationships, facts, taste: tasteProfile(), usage };
}
