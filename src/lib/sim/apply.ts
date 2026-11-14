// Applies the director's beat and the crowd's posts to the database.
// Model output is schema-checked but can still be wrong: unknown handles,
// dangling refs, empty text, fake ids. Every item is repaired or dropped on
// its own so one bad item never sinks the rest. Callers wrap each apply in tx().
import { db, now, pairKey, type PostRow, type StorylineRow } from "../db";
import { targetsFor } from "../engagement";
import type { CrowdOutput, DirectorOutput } from "../schemas";
import type { Domain, NotificationType, Tone, WorldDigest } from "../types";
import { insertNotification, insertPost } from "../write";
import { parseJsonList } from "./digest";

export type Mode = WorldDigest["mode"];

/** Simulation-time span the tick's posts are spread across. */
export interface Window {
  start: number;
  end: number;
}

export interface BeatContext {
  mode: Mode;
  window: Window;
  focusPostId: number | null;
}

export interface NewPostInfo {
  id: number;
  author: string;
  text: string;
  replyTo: number | null;
  createdAt: number;
}

/** What every post of this beat inherits. */
export interface BeatMeta {
  storylineId: number;
  domain: Domain;
  tone: Tone;
  topics: string[];
  heat: number;
}

export interface BeatResult {
  meta: BeatMeta;
  posts: NewPostInfo[];
  /** A new storyline started from a real, unused headline. */
  newEvent: boolean;
  /** Applied after commit: these call into other modules. */
  headlineId: number | null;
  stockMoves: { ticker: string; pct: number; reason: string }[];
  movesAt: number;
}

const MAX_TEXT = 1200;
const SECOND = 1000;
const HOUR = 3_600_000;

// ------------------------------------------------------------- helpers

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

function clampInt(v: unknown, lo: number, hi: number, fallback: number): number {
  const n = typeof v === "number" && Number.isFinite(v) ? Math.round(v) : fallback;
  return Math.min(hi, Math.max(lo, n));
}

function cap(s: unknown, max = MAX_TEXT): string {
  if (typeof s !== "string") return "";
  const chars = Array.from(s.trim());
  return chars.length > max ? chars.slice(0, max).join("").trimEnd() : chars.join("");
}

function cleanTopics(topics: unknown): string[] {
  if (!Array.isArray(topics)) return [];
  const out = new Set<string>();
  for (const t of topics) {
    const v = cap(t, 40).replace(/^#+/, "").toLowerCase();
    if (v) out.add(v);
  }
  return [...out].slice(0, 4);
}

/** Log and swallow: one bad item must not abort the beat. */
function guard(what: string, fn: () => void): void {
  try {
    fn();
  } catch (err) {
    console.error(`[sim] skipped ${what}:`, err);
  }
}

interface Acct {
  handle: string;
  kind: string;
  followers: number;
}

class Accounts {
  private byKey = new Map<string, Acct>();
  readonly user: Acct | null = null;
  readonly crowd: Acct[] = [];

  constructor() {
    const rows = db().prepare("SELECT handle, kind, followers FROM accounts").all() as unknown as Acct[];
    for (const r of rows) {
      this.byKey.set(r.handle.toLowerCase(), r);
      if (r.kind === "user") this.user = r;
      if (r.kind === "crowd") this.crowd.push(r);
    }
  }

  /** Case-insensitive, tolerant of a leading @. Returns the stored account. */
  get(handle: unknown): Acct | null {
    if (typeof handle !== "string") return null;
    return this.byKey.get(handle.trim().replace(/^@+/, "").toLowerCase()) ?? null;
  }

  randomCrowd(): Acct | null {
    return this.crowd.length ? this.crowd[Math.floor(Math.random() * this.crowd.length)] : null;
  }

  isUser(handle: string | null | undefined): boolean {
    return !!this.user && !!handle && handle.toLowerCase() === this.user.handle.toLowerCase();
  }
}

type Target = Pick<PostRow, "id" | "author" | "created_at" | "storyline_id" | "domain" | "tone" | "topics">;

/** Resolves "p123" (existing post), and local refs ("n1", "a1") of this response. */
class Refs {
  private local = new Map<string, Target>();

  add(ref: unknown, t: Target): void {
    const key = typeof ref === "string" ? ref.trim().toLowerCase() : "";
    if (key && !this.local.has(key)) this.local.set(key, t);
  }

  resolve(ref: unknown): Target | null {
    if (typeof ref !== "string") return null;
    const key = ref.trim().toLowerCase().replace(/^[#@]/, "");
    if (!key) return null;
    const local = this.local.get(key);
    if (local) return local;
    const m = /^p?(\d+)$/.exec(key);
    if (!m) return null;
    const row = db()
      .prepare("SELECT id, author, created_at, storyline_id, domain, tone, topics FROM posts WHERE id = ?")
      .get(Number(m[1])) as Target | undefined;
    return row ?? null;
  }
}

function mentions(text: string, handle: string): boolean {
  const escaped = handle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^A-Za-z0-9_])@${escaped}(?![A-Za-z0-9_])`, "i").test(text);
}

/** Reply, quote or mention notification for the user. Returns true if the post involves the user. */
function notifyUser(
  accts: Accounts,
  post: { id: number; author: string; text: string; createdAt: number },
  reply: Target | null,
  quote: Target | null,
): boolean {
  if (!accts.user || accts.isUser(post.author)) return false;
  let type: NotificationType | null = null;
  if (reply && accts.isUser(reply.author)) type = "reply";
  else if (quote && accts.isUser(quote.author)) type = "quote";
  else if (mentions(post.text, accts.user.handle)) type = "mention";
  if (!type) return false;
  insertNotification({ type, actor: post.author, postId: post.id, createdAt: post.createdAt });
  return true;
}

function targetOf(info: NewPostInfo, meta: BeatMeta): Target {
  return {
    id: info.id,
    author: info.author,
    created_at: info.createdAt,
    storyline_id: meta.storylineId,
    domain: meta.domain,
    tone: meta.tone,
    topics: JSON.stringify(meta.topics),
  };
}

// ---------------------------------------------------------------- beat

function upsertStoryline(
  out: DirectorOutput,
  ctx: BeatContext,
  stamp: number,
  heat: number,
  topics: string[],
): { id: number; participants: Map<string, string>; newEvent: boolean; headlineId: number | null } {
  const conn = db();
  const b = out.beat;
  const summary = cap(b.summary, 2000);
  const existing =
    b.storyline_id != null
      ? (conn.prepare("SELECT * FROM storylines WHERE id = ?").get(b.storyline_id) as StorylineRow | undefined)
      : undefined;
  const participants = new Map<string, string>();

  if (existing) {
    for (const h of parseJsonList(existing.participants)) participants.set(h.toLowerCase(), h);
    conn
      .prepare(
        `UPDATE storylines SET summary = ?, heat = ?, tone = ?, topics = ?, updated_at = ?,
                               beats = beats + 1, status = 'open' WHERE id = ?`,
      )
      .run(
        summary || existing.summary, heat, b.tone,
        topics.length ? JSON.stringify(topics) : existing.topics, stamp, existing.id,
      );
    return { id: existing.id, participants, newEvent: false, headlineId: null };
  }

  const parent =
    b.parent_storyline_id != null
      ? (conn.prepare("SELECT id FROM storylines WHERE id = ?").get(b.parent_storyline_id) as
          | { id: number }
          | undefined)
      : undefined;
  const headline =
    b.headline_id != null
      ? (conn.prepare("SELECT id, used FROM headlines WHERE id = ?").get(b.headline_id) as
          | { id: number; used: number }
          | undefined)
      : undefined;

  let origin: StorylineRow["origin"] = "original";
  let headlineId: number | null = null;
  if (ctx.mode === "user_post") origin = "user";
  else if (headline && !headline.used) {
    origin = "headline";
    headlineId = headline.id;
  } else if (parent) origin = "spinoff";

  const title = cap(b.title, 100) || cap(summary, 70) || topics.join(", ") || "Untitled";
  const res = conn
    .prepare(
      `INSERT INTO storylines (parent_id, title, summary, domain, tone, topics, participants, origin,
                               headline_id, heat, status, beats, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, 'open', 1, ?, ?)`,
    )
    .run(
      parent?.id ?? null, title, summary, b.domain, b.tone, JSON.stringify(topics), origin,
      headlineId, heat, stamp, stamp,
    );
  return { id: Number(res.lastInsertRowid), participants, newEvent: origin === "headline", headlineId };
}

export function applyBeat(out: DirectorOutput, ctx: BeatContext): BeatResult {
  const conn = db();
  const t = now();
  const stamp = Math.min(t, ctx.window.end); // back-dated in bootstrap mode
  const accts = new Accounts();
  const heat = clampInt(out.beat.heat, 1, 10, 5);
  const topics = cleanTopics(out.beat.topics);
  const sl = upsertStoryline(out, ctx, stamp, heat, topics);
  const meta: BeatMeta = { storylineId: sl.id, domain: out.beat.domain, tone: out.beat.tone, topics, heat };
  const addParticipant = (h: string) => sl.participants.set(h.toLowerCase(), h);

  // Timing: the article's post first, then the director's posts across the
  // first 60% of the window, each reply or quote at least 4s after its target.
  const posts = Array.isArray(out.posts) ? out.posts : [];
  const slots = posts.length + (out.article ? 1 : 0);
  const span = 0.6 * (ctx.window.end - ctx.window.start);
  let slot = 0;
  const nextAt = () => {
    const i = slot++;
    return i === 0 ? ctx.window.start : Math.round(ctx.window.start + (span * (i + rand(0, 0.8))) / slots);
  };

  const refs = new Refs();
  const inserted: NewPostInfo[] = [];
  const seen = new Set<string>();
  let involvesUser = false;
  const common = { storylineId: meta.storylineId, domain: meta.domain, tone: meta.tone, topics };

  if (out.article) {
    const a = out.article;
    guard("article", () => {
      const outlet = accts.get(a.outlet);
      const headline = cap(a.headline, 300);
      if (!outlet || outlet.kind !== "outlet" || !headline) return;
      const at = nextAt();
      const art = conn
        .prepare(
          "INSERT INTO articles (outlet, headline, dek, body, storyline_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .run(outlet.handle, headline, cap(a.dek, 600), cap(a.body, 20_000), meta.storylineId, at);
      const text = cap(a.post_text) || headline;
      const id = insertPost({
        ...common, author: outlet.handle, text, createdAt: at, articleId: Number(art.lastInsertRowid), heat,
      });
      const info: NewPostInfo = { id, author: outlet.handle, text, replyTo: null, createdAt: at };
      inserted.push(info);
      refs.add("a1", targetOf(info, meta));
      seen.add(`${outlet.handle.toLowerCase()}\n${text}`);
      addParticipant(outlet.handle);
      if (notifyUser(accts, info, null, null)) involvesUser = true;
    });
  }

  for (const p of posts) {
    guard(`post ${p?.ref}`, () => {
      const author = accts.get(p.author);
      if (!author || (author.kind !== "figure" && author.kind !== "outlet")) return;
      const text = cap(p.text);
      const key = `${author.handle.toLowerCase()}\n${text}`;
      if (!text || seen.has(key)) return;
      const reply = refs.resolve(p.reply_to);
      let quote = refs.resolve(p.quote_of);
      if (reply && quote && reply.id === quote.id) quote = null;
      let at = nextAt();
      for (const target of [reply, quote]) if (target) at = Math.max(at, target.created_at + 4 * SECOND);
      const id = insertPost({
        ...common, author: author.handle, text, createdAt: at,
        replyTo: reply?.id ?? null, quoteOf: quote?.id ?? null, heat: clampInt(p.heat, 1, 10, heat),
      });
      const info: NewPostInfo = { id, author: author.handle, text, replyTo: reply?.id ?? null, createdAt: at };
      inserted.push(info);
      refs.add(p.ref, targetOf(info, meta));
      seen.add(key);
      addParticipant(author.handle);
      if (notifyUser(accts, info, reply, quote)) involvesUser = true;
    });
  }

  if (ctx.mode === "user_post" && accts.user) addParticipant(accts.user.handle);
  conn
    .prepare("UPDATE storylines SET participants = ? WHERE id = ?")
    .run(JSON.stringify([...sl.participants.values()]), meta.storylineId);

  const firstAt = inserted.length ? Math.min(...inserted.map((p) => p.createdAt)) : ctx.window.start;

  applyRelationships(out, accts, stamp);
  applyFacts(out, accts, meta.storylineId, stamp);
  applyTrends(out, meta, t);
  applyUser(out, ctx, accts, heat, firstAt, involvesUser);

  return {
    meta,
    posts: inserted,
    newEvent: sl.newEvent,
    headlineId: sl.headlineId,
    stockMoves: cleanMoves(out),
    movesAt: firstAt + 20 * SECOND,
  };
}

function applyRelationships(out: DirectorOutput, accts: Accounts, stamp: number) {
  const conn = db();
  for (const r of out.relationships ?? []) {
    guard("relationship", () => {
      const x = accts.get(r.a);
      const y = accts.get(r.b);
      if (!x || !y || x.handle.toLowerCase() === y.handle.toLowerCase()) return;
      const [a, b] = pairKey(x.handle, y.handle);
      const cur = conn.prepare("SELECT score, note FROM relationships WHERE a = ? AND b = ?").get(a, b) as
        | { score: number; note: string }
        | undefined;
      const score = clampInt((cur?.score ?? 0) + clampInt(r.delta, -3, 3, 0), -10, 10, 0);
      const note = cap(r.note, 200) || cur?.note || "";
      conn
        .prepare(
          `INSERT INTO relationships (a, b, score, note, updated_at) VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(a, b) DO UPDATE SET score = excluded.score, note = excluded.note,
                                           updated_at = excluded.updated_at`,
        )
        .run(a, b, score, note, stamp);
    });
  }
}

function applyFacts(out: DirectorOutput, accts: Accounts, storylineId: number, stamp: number) {
  const insert = db().prepare(
    "INSERT INTO facts (text, subjects, storyline_id, created_at) VALUES (?, ?, ?, ?)",
  );
  let stored = 0;
  for (const f of out.facts ?? []) {
    if (stored >= 5) break;
    guard("fact", () => {
      const text = cap(f.text, 400);
      if (!text) return;
      const subjects = new Map<string, string>();
      for (const s of Array.isArray(f.subjects) ? f.subjects : []) {
        const acct = accts.get(s);
        if (acct) subjects.set(acct.handle.toLowerCase(), acct.handle);
      }
      insert.run(text, JSON.stringify([...subjects.values()]), storylineId, stamp);
      stored++;
    });
  }
}

function applyTrends(out: DirectorOutput, meta: BeatMeta, t: number) {
  const conn = db();
  let stored = 0;
  const h2 = meta.heat * meta.heat;
  for (const tr of out.trends ?? []) {
    if (stored >= 3) break;
    guard("trend", () => {
      const label = cap(tr.label, 80);
      if (!label) return;
      const category = cap(tr.category, 80) || "Trending";
      const existing = conn
        .prepare(
          `SELECT id FROM trends WHERE label = ? COLLATE NOCASE AND created_at >= ?
           ORDER BY created_at DESC LIMIT 1`,
        )
        .get(label, t - 2 * HOUR) as { id: number } | undefined;
      if (existing) {
        conn
          .prepare(
            `UPDATE trends SET posts = posts + ?, heat = MAX(heat, ?), category = ?, storyline_id = ?,
                               domain = ?, created_at = ? WHERE id = ?`,
          )
          .run(Math.round(h2 * rand(100, 400)), meta.heat, category, meta.storylineId, meta.domain, t, existing.id);
      } else {
        conn
          .prepare(
            `INSERT INTO trends (label, category, storyline_id, domain, heat, posts, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(label, category, meta.storylineId, meta.domain, meta.heat, Math.round(h2 * rand(300, 1200)), t);
      }
      stored++;
    });
  }
}

/** Followers gained, and in user_post mode the boost to the user's post. */
function applyUser(
  out: DirectorOutput,
  ctx: BeatContext,
  accts: Accounts,
  heat: number,
  firstAt: number,
  involvesUser: boolean,
) {
  const user = accts.user;
  if (!user) return;
  const conn = db();
  guard("follower delta", () => {
    const delta = clampInt(out.user_follower_delta, 0, 5000, 0);
    if (delta <= 0 || (ctx.mode !== "user_post" && !involvesUser)) return;
    conn.prepare("UPDATE accounts SET followers = followers + ? WHERE handle = ?").run(delta, user.handle);
    const actor = accts.randomCrowd();
    if (actor) {
      insertNotification({
        type: "follow", actor: actor.handle, count: delta, createdAt: firstAt + Math.round(rand(5, 15) * SECOND),
      });
    }
  });

  if (ctx.mode !== "user_post" || ctx.focusPostId == null) return;
  guard("user post boost", () => {
    const post = conn.prepare("SELECT id, author, t_likes FROM posts WHERE id = ?").get(ctx.focusPostId) as
      | Pick<PostRow, "id" | "author" | "t_likes">
      | undefined;
    if (!post || !accts.isUser(post.author)) return;
    const followers = (
      conn.prepare("SELECT followers FROM accounts WHERE handle = ?").get(user.handle) as { followers: number }
    ).followers;
    const tg = targetsFor(followers, heat);
    conn
      .prepare(
        `UPDATE posts SET t_likes = MAX(t_likes, ?), t_reposts = MAX(t_reposts, ?),
                          t_replies = MAX(t_replies, ?), t_views = MAX(t_views, ?) WHERE id = ?`,
      )
      .run(tg.likes, tg.reposts, tg.replies, tg.views, post.id);
    const likes = Math.max(post.t_likes, tg.likes);
    const actor = accts.randomCrowd();
    if (likes > 0 && actor) {
      insertNotification({
        type: "like", actor: actor.handle, targetPostId: post.id, count: likes,
        createdAt: firstAt + Math.round(rand(2, 10) * SECOND),
      });
    }
  });
}

function cleanMoves(out: DirectorOutput): BeatResult["stockMoves"] {
  const known = new Map(
    (db().prepare("SELECT ticker, kind FROM stocks").all() as { ticker: string; kind: string }[]).map((s) => [
      s.ticker.toUpperCase(),
      s,
    ]),
  );
  const moves = new Map<string, { ticker: string; pct: number; reason: string }>();
  for (const m of out.stock_moves ?? []) {
    const stock = typeof m.ticker === "string" ? known.get(m.ticker.trim().replace(/^\$/, "").toUpperCase()) : null;
    if (!stock || moves.has(stock.ticker) || typeof m.pct !== "number" || !Number.isFinite(m.pct)) continue;
    const limit = stock.kind === "crypto" ? 20 : 12;
    const pct = Math.round(Math.min(limit, Math.max(-limit, m.pct)) * 100) / 100;
    if (pct === 0) continue;
    const reason = cap(m.reason, 80) || cap(out.beat.title, 80);
    moves.set(stock.ticker, { ticker: stock.ticker, pct, reason });
  }
  return [...moves.values()];
}

// --------------------------------------------------------------- crowd

/** Crowd posts: crowd accounts only, spread across `win`, each at least 5s after its target. */
export function applyCrowd(out: CrowdOutput, meta: BeatMeta, win: Window): NewPostInfo[] {
  const accts = new Accounts();
  const refs = new Refs();
  const inserted: NewPostInfo[] = [];
  const seen = new Set<string>();
  const posts = Array.isArray(out.posts) ? out.posts : [];
  posts.forEach((p, i) => {
    guard("crowd post", () => {
      const author = accts.get(p.author);
      if (!author || author.kind !== "crowd") return;
      const text = cap(p.text);
      const key = `${author.handle.toLowerCase()}\n${text}`;
      if (!text || seen.has(key)) return;
      const reply = refs.resolve(p.reply_to);
      let quote = refs.resolve(p.quote_of);
      if (reply && quote && reply.id === quote.id) quote = null;
      let at = Math.round(win.start + ((win.end - win.start) * (i + rand(0, 1))) / posts.length);
      for (const target of [reply, quote]) if (target) at = Math.max(at, target.created_at + 5 * SECOND);
      // Inherit from the post being answered when it belongs to a storyline, else from the beat.
      const src = reply ?? quote;
      const fromTarget = src && src.storyline_id != null;
      const id = insertPost({
        author: author.handle,
        text,
        createdAt: at,
        replyTo: reply?.id ?? null,
        quoteOf: quote?.id ?? null,
        storylineId: fromTarget ? src.storyline_id : meta.storylineId,
        domain: fromTarget && src.domain ? (src.domain as Domain) : meta.domain,
        tone: fromTarget && src.tone ? (src.tone as Tone) : meta.tone,
        topics: fromTarget ? parseJsonList(src.topics) : meta.topics,
        heat: clampInt(p.heat, 1, 10, Math.max(1, meta.heat - 2)),
      });
      const info: NewPostInfo = { id, author: author.handle, text, replyTo: reply?.id ?? null, createdAt: at };
      inserted.push(info);
      seen.add(key);
      notifyUser(accts, info, reply, quote);
    });
  });
  return inserted;
}
