// Applies the director's beat and the crowd's posts to the database.
// Model output is schema-checked but can still be wrong: unknown handles,
// dangling refs, empty text, fake ids. Every item is repaired or dropped on
// its own so one bad item never sinks the rest. Callers wrap each apply in tx().
import { db, now, pairKey, type PostRow, type StorylineRow } from "../db";
import { targetsFor } from "../engagement";
import type { AmbientOutput, CrowdOutput, DirectorOutput } from "../schemas";
import { MEME_POSTERS, MEME_TEMPLATES } from "../media";
import type { Domain, NotificationType, PostMedia, TierRow, Tone, WorldDigest } from "../types";
import { BROK, onBrokTag, tagsBrok } from "../brok";
import { addGameEvent } from "../sports";
import { insertNotification, insertPost } from "../write";
import { parseJsonList } from "./digest";
import { recordInJoke } from "./injokes";
import { MAX_STAND_CHARS, MAX_STANDS, saveStand } from "./stands";

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
  /** The beat was started by a premise the reader proposed. */
  seeded?: boolean;
  /** That premise, in the reader's words; "wrap" beats have none. */
  premise?: string | null;
  /** The reader asked for this storyline to be brought to a close. */
  wrap?: boolean;
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

/** What crowd posts inherit when they answer nothing that carries a storyline.
 *  Everyday chatter and thread replies may belong to no storyline at all. */
export type CrowdMeta = Omit<BeatMeta, "storylineId"> & { storylineId: number | null };

export interface BeatResult {
  meta: BeatMeta;
  posts: NewPostInfo[];
  /** The ordinary account's reply the director wrote to outdo the post it answers, if any. */
  standout: NewPostInfo | null;
  /** A new storyline started from a real, unused headline. */
  newEvent: boolean;
  /** Applied after commit: these call into other modules. */
  headlineId: number | null;
  stockMoves: { ticker: string; pct: number; reason: string }[];
  movesAt: number;
  /** This response's posts by their refs ("a1", "n2"), for the slate's card. */
  refIds: Map<string, number>;
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

/** The two translation fields of a model-written post, ready for insertPost; both null
 *  unless the post is not English and the translation is a real, different text. */
function translationOf(
  p: { language?: string | null; translation?: string | null },
  text: string,
  max = MAX_TEXT,
): { lang: string | null; translation: string | null } {
  const lang = cap(p.language, 40);
  const translation = cap(p.translation, max);
  if (!lang || !translation || translation === text || /^(english|en)\b/i.test(lang)) {
    return { lang: null, translation: null };
  }
  return { lang, translation };
}

/** A post that ends by promising more: "Here's how:", "Here's what's coming this week", "More here. 👇", "1/".
 *  A pointing hand on its own is not one: that is how people ask for replies.
 *  sim/threads.ts writes the continuation such a post needs. */
export const HANGING =
  /(?:[:：]\s*(?:👇|⬇️)?|🧵|\b1\/\d*|\(thread\)|\b(?:more here|details (?:here|below)|link (?:here|below)|read more|watch (?:here|below|along with us)|full (?:video|thread|story) (?:here|below))[.!]?\s*(?:👇|⬇️)?|\bhere(?:'|’)s (?:how|what|why|where|everything)\b[^.!?\n]*[.!?]?)\s*$/iu;
const COMPLETE = /(?:[.!?…"')\]]|\p{Extended_Pictographic}\uFE0F?)$/u;

/** Remove the promise and, with it, the sentence left unfinished: the last
 *  resort when a continuation could not be written. */
export function unhang(text: string): string {
  const rest = text.replace(HANGING, "").trimEnd();
  if (COMPLETE.test(rest) && Array.from(rest).length >= 30) return rest;
  const ends = [...rest.matchAll(/[.!?…]["')\]]?\s/gu)];
  const last = ends.at(-1);
  const cut = last ? rest.slice(0, last.index + last[0].length).trim() : "";
  if (Array.from(cut).length >= 30) return cut;
  return rest.replace(/[\s,;—-]+$/u, "").concat(COMPLETE.test(rest) ? "" : ".");
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
  domain: string;
}

class Accounts {
  private byKey = new Map<string, Acct>();
  readonly user: Acct | null = null;
  readonly crowd: Acct[] = [];

  constructor() {
    const rows = db().prepare("SELECT handle, kind, followers, domain FROM accounts").all() as unknown as Acct[];
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
      .prepare("SELECT id, author, created_at, storyline_id, domain, tone, topics FROM posts WHERE id = ? AND deleted = 0")
      .get(Number(m[1])) as Target | undefined;
    return row ?? null;
  }

  /** The posts of this response by their refs. */
  ids(): Map<string, number> {
    return new Map([...this.local].map(([k, t]) => [k, t.id]));
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
  if (ctx.mode === "user_post" || ctx.seeded) origin = "user";
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
  let pageId: number | null = null; // the page published on this beat, for the beats record
  let standout: NewPostInfo | null = null;

  // Timing: the article's post first, then the director's posts across the
  // first 60% of the window, each reply or quote at least 4s after its target.
  const posts = Array.isArray(out.posts) ? out.posts : [];
  const slots = posts.length + (out.article ? 1 : 0);
  // The opening post goes out at once; the rest are spread over most of the window.
  const span = 0.85 * (ctx.window.end - ctx.window.start);
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
      // Outlets publish articles; official accounts publish their own announcements.
      const isOutlet = outlet?.kind === "outlet";
      if (!outlet || (!isOutlet && outlet.kind !== "org") || !headline) return;
      const pageKind = isOutlet ? "article" : a.kind === "article" || !a.kind ? "statement" : a.kind;
      const at = nextAt();
      const art = conn
        .prepare(
          "INSERT INTO articles (outlet, headline, dek, body, storyline_id, created_at, kind) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .run(outlet.handle, headline, cap(a.dek, 600), cap(a.body, 20_000), meta.storylineId, at, pageKind);
      pageId = Number(art.lastInsertRowid);
      const text = cap(a.post_text) || headline;
      const id = insertPost({
        ...common, author: outlet.handle, text, createdAt: at, articleId: Number(art.lastInsertRowid), heat,
        tactic: a.tactic ?? null,
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
      if (!author || (author.kind !== "figure" && author.kind !== "outlet" && author.kind !== "org")) return;
      if (author.handle.toLowerCase() === BROK) return; // Brok writes its own posts
      const text = cap(p.text);
      const key = `${author.handle.toLowerCase()}\n${text}`;
      if ((!text && !famousMemeOf(author.handle, p.meme)) || seen.has(key)) return;
      const reply = refs.resolve(p.reply_to);
      let quote = refs.resolve(p.quote_of);
      if (reply && quote && reply.id === quote.id) quote = null;
      let at = nextAt();
      for (const target of [reply, quote]) if (target) at = Math.max(at, target.created_at + 4 * SECOND);
      const id = insertPost({
        ...common, author: author.handle, text, createdAt: at,
        replyTo: reply?.id ?? null, quoteOf: quote?.id ?? null, heat: clampInt(p.heat, 1, 10, heat),
        media: chartOf(p.chart) ?? famousMemeOf(author.handle, p.meme), ...translationOf(p, text),
        tactic: p.tactic ?? null,
      });
      const info: NewPostInfo = { id, author: author.handle, text, replyTo: reply?.id ?? null, createdAt: at };
      inserted.push(info);
      refs.add(p.ref, targetOf(info, meta));
      addPoll(id, p.poll, at, clampInt(p.heat, 1, 10, heat), author.followers);
      seen.add(key);
      addParticipant(author.handle);
      if (notifyUser(accts, info, reply, quote)) involvesUser = true;
    });
  }

  if (ctx.mode === "user_post" && accts.user) addParticipant(accts.user.handle);
  conn
    .prepare("UPDATE storylines SET participants = ? WHERE id = ?")
    .run(JSON.stringify([...sl.participants.values()]), meta.storylineId);

  // The stand-out reply: one ordinary account's line that does better than the post it answers.
  if (out.top_reply) {
    const top = out.top_reply;
    guard("stand-out reply", () => {
      const author = accts.get(top.author);
      const target = refs.resolve(top.reply_to);
      const text = cap(top.text, 280);
      if (!author || author.kind !== "crowd" || !target || !text) return;
      const at = Math.max(target.created_at + 20 * SECOND, Math.round(ctx.window.start + 0.45 * (ctx.window.end - ctx.window.start)));
      const id = insertPost({
        ...common, author: author.handle, text, createdAt: at, replyTo: target.id,
        heat: Math.min(10, Math.max(7, heat + 1)), style: styleOf(top.style), tactic: top.tactic ?? null,
        ...translationOf(top, text, 280),
      });
      standout = { id, author: author.handle, text, replyTo: target.id, createdAt: at };
      recordInJoke(id, text, meta.storylineId, at);
    });
  }

  const firstAt = inserted.length ? Math.min(...inserted.map((p) => p.createdAt)) : ctx.window.start;

  applyReposts(out.reposts, refs, accts, ctx.window);
  applyNotes(out.notes, refs, accts);
  applyRelationships(out, accts, stamp);
  applyFacts(out, accts, meta.storylineId, stamp);
  applyStands(out, accts, stamp);
  applyTrends(out, meta, t);
  applyUser(out, ctx, accts, heat, firstAt, involvesUser);
  // The director's nudge to a live game lands as the beat opens, so its posts can react to it.
  if (out.game_event && ctx.mode !== "bootstrap") {
    const ev = out.game_event;
    guard("game event", () => addGameEvent(ev, Math.max(t, ctx.window.start)));
  }
  if (ctx.mode === "user_post" && ctx.focusPostId != null) {
    // Remember which storyline this post fed, so deleting the post can cut it off.
    db()
      .prepare("UPDATE posts SET storyline_id = ? WHERE id = ? AND storyline_id IS NULL")
      .run(meta.storylineId, ctx.focusPostId);
  }

  // The real headline behind this beat: the one that opened the storyline, or
  // one the director drew on to move an existing storyline along.
  const cited = Number.isInteger(out.beat.headline_id)
    ? (conn.prepare("SELECT id FROM headlines WHERE id = ?").get(out.beat.headline_id) as { id: number } | undefined)
    : undefined;
  const sourceHeadline = sl.headlineId ?? cited?.id ?? null;
  conn
    .prepare(
      `INSERT INTO beats (storyline_id, kind, summary, heat, article_id, post_id, headline_id, seeded, premise, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      meta.storylineId, ctx.wrap ? "wrap" : out.beat.kind,
      cap(out.beat.event, 240) || cap(out.crowd_brief, 400) || cap(out.beat.title, 200), heat,
      pageId, inserted[0]?.id ?? null, sourceHeadline, ctx.seeded ? 1 : 0, ctx.premise ?? null, firstAt,
    );

  return {
    meta,
    posts: inserted,
    standout,
    newEvent: sl.newEvent,
    headlineId: sl.headlineId,
    stockMoves: cleanMoves(out),
    movesAt: firstAt + 20 * SECOND,
    refIds: refs.ids(),
  };
}

const POLL_MS = 8 * 60 * SECOND; // long enough to vote, short enough for the result to matter to the story

/** A poll on a post: two to four options and the vote counts they will end on. */
function addPoll(postId: number, options: string[] | null | undefined, at: number, heat: number, followers: number) {
  if (!Array.isArray(options)) return;
  const labels = options.map((o) => cap(o, 25)).filter(Boolean).slice(0, 4);
  if (labels.length < 2) return;
  guard("poll", () => {
    const total = Math.round(Math.max(400, followers * 0.0006 * heat * rand(0.5, 1.5)));
    // An uneven random split, so there is usually a clear winner.
    const weights = labels.map(() => Math.pow(Math.random(), 1.5) + 0.08);
    const sum = weights.reduce((a, b) => a + b, 0);
    const targets = weights.map((w) => Math.round((w / sum) * total));
    db()
      .prepare("INSERT OR IGNORE INTO polls (post_id, options, targets, closes_at) VALUES (?, ?, ?, ?)")
      .run(postId, JSON.stringify(labels), JSON.stringify(targets), at + POLL_MS);
  });
}

/** "Readers added context" under a post. At most one per beat, never on the user's post. */
function applyNotes(notes: { of: string; text: string }[] | undefined, refs: Refs, accts: Accounts) {
  for (const n of (notes ?? []).slice(0, 1)) {
    guard("note", () => {
      const target = refs.resolve(n.of);
      const text = cap(n.text, 420);
      if (!target || !text || accts.isUser(target.author)) return;
      db()
        .prepare("INSERT OR IGNORE INTO notes (post_id, text, created_at) VALUES (?, ?, ?)")
        .run(target.id, text, target.created_at + Math.round(rand(60, 150) * SECOND));
    });
  }
}

/** Plain reposts by cast accounts: up to three, never of the account's own post. */
function applyReposts(
  reposts: { account: string; of: string }[] | undefined,
  refs: Refs,
  accts: Accounts,
  win: Window,
) {
  const insert = db().prepare("INSERT OR IGNORE INTO reposts (account, post_id, created_at) VALUES (?, ?, ?)");
  let stored = 0;
  for (const r of reposts ?? []) {
    if (stored >= 3) break;
    guard("repost", () => {
      const account = accts.get(r.account);
      if (!account || account.kind === "crowd" || account.kind === "user") return;
      const target = refs.resolve(r.of);
      if (!target || target.author.toLowerCase() === account.handle.toLowerCase()) return;
      const at = Math.max(target.created_at + Math.round(rand(8, 45) * SECOND), win.start);
      if (Number(insert.run(account.handle, target.id, at).changes) > 0) stored++;
    });
  }
}

/** Everyday posts between story beats: no storyline, no memory, just the feed's ordinary traffic.
 *  `refIds`, when given, is filled with the posts by their refs ("e1", ...). */
export function applyAmbient(out: AmbientOutput, win: Window, refIds?: Map<string, number>): NewPostInfo[] {
  const accts = new Accounts();
  const refs = new Refs();
  const inserted: NewPostInfo[] = [];
  const seen = new Set<string>();
  const domainOf = db().prepare("SELECT domain FROM accounts WHERE handle = ?");
  const posts = Array.isArray(out.posts) ? out.posts.slice(0, 8) : [];
  posts.forEach((p, i) => {
    guard("ambient post", () => {
      const author = accts.get(p.author);
      if (!author || author.kind === "crowd" || author.kind === "user" || author.handle.toLowerCase() === BROK) return;
      const text = cap(p.text);
      const key = `${author.handle.toLowerCase()}\n${text}`;
      if ((!text && !famousMemeOf(author.handle, p.meme)) || seen.has(key)) return;
      const reply = refs.resolve(p.reply_to);
      let quote = refs.resolve(p.quote_of);
      if (reply && quote && reply.id === quote.id) quote = null;
      // Spread across the first 70% of the window, leaving room for replies.
      let at = Math.round(win.start + ((win.end - win.start) * 0.7 * (i + rand(0, 1))) / posts.length);
      for (const target of [reply, quote]) if (target) at = Math.max(at, target.created_at + 4 * SECOND);
      const src = reply ?? quote;
      const domain = (domainOf.get(author.handle) as { domain: string } | undefined)?.domain ?? "crossover";
      const id = insertPost({
        author: author.handle,
        text,
        createdAt: at,
        replyTo: reply?.id ?? null,
        quoteOf: quote?.id ?? null,
        storylineId: src?.storyline_id ?? null,
        domain: (src?.domain as Domain | null) ?? (domain as Domain),
        tone: (src?.tone as Tone | null) ?? null,
        topics: src ? parseJsonList(src.topics) : [],
        heat: clampInt(p.heat, 1, 6, 3),
        media: chartOf(p.chart) ?? famousMemeOf(author.handle, p.meme), ...translationOf(p, text),
        tactic: p.tactic ?? null,
      });
      const info: NewPostInfo = { id, author: author.handle, text, replyTo: reply?.id ?? null, createdAt: at };
      inserted.push(info);
      refs.add(p.ref, {
        id, author: author.handle, created_at: at, storyline_id: null, domain, tone: null, topics: "[]",
      });
      seen.add(key);
      notifyUser(accts, info, reply, quote);
    });
  });
  applyReposts(out.reposts, refs, accts, win);
  if (refIds) for (const [k, id] of refs.ids()) refIds.set(k, id);
  return inserted;
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
    "INSERT INTO facts (text, subjects, storyline_id, created_at, due_at) VALUES (?, ?, ?, ?, ?)",
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
      // A promise, bet or deadline: when it falls due, at most a year out.
      const days = typeof f.due_in_days === "number" && f.due_in_days > 0 ? Math.min(f.due_in_days, 366) : null;
      const due = days != null ? Math.round(stamp + days * 24 * HOUR) : null;
      insert.run(text, JSON.stringify([...subjects.values()]), storylineId, stamp, due);
      stored++;
    });
  }
}

/** Where an account stands now: famous accounts only, one note each, a few per beat. */
function applyStands(out: DirectorOutput, accts: Accounts, stamp: number) {
  const done = new Set<string>();
  for (const s of Array.isArray(out.stands) ? out.stands : []) {
    if (done.size >= MAX_STANDS) break;
    guard("stand", () => {
      const acct = accts.get(s.handle);
      const note = cap(s.note, MAX_STAND_CHARS);
      if (!acct || !note || done.has(acct.handle.toLowerCase())) return;
      if (acct.kind !== "figure" && acct.kind !== "outlet" && acct.kind !== "org") return;
      if (acct.handle.toLowerCase() === BROK) return;
      saveStand(acct.handle, note, stamp);
      done.add(acct.handle.toLowerCase());
    });
  }
}

function applyTrends(out: DirectorOutput, meta: BeatMeta, t: number) {
  const conn = db();
  let stored = 0;
  const h2 = meta.heat * meta.heat;
  // The user is a bystander whose post travelled: they never trend by name.
  const me = conn.prepare("SELECT handle, name FROM accounts WHERE kind = 'user' LIMIT 1").get() as
    | { handle: string; name: string }
    | undefined;
  const namesUser = (label: string) => {
    const l = label.toLowerCase();
    return me != null && (l.includes(me.handle.toLowerCase()) || l.includes(me.name.toLowerCase()));
  };
  for (const tr of out.trends ?? []) {
    if (stored >= 3) break;
    guard("trend", () => {
      const label = cap(tr.label, 80);
      if (!label || namesUser(label)) return;
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
    // A post that did numbers earns hundreds of followers, not thousands.
    const delta = clampInt(out.user_follower_delta, 0, 500, 0);
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
/** A price chart for a post about a ticker the market actually has. */
function chartOf(ticker: string | null | undefined): PostMedia | null {
  if (typeof ticker !== "string") return null;
  const t = ticker.trim().replace(/^\$/, "").toUpperCase();
  if (!t) return null;
  const known = db().prepare("SELECT 1 FROM stocks WHERE ticker = ?").get(t);
  return known ? { kind: "chart", ticker: t } : null;
}

const MEME_IDS = new Set(MEME_TEMPLATES.map((m) => m.id));

/** A meme the writer asked for, if the template exists and it has something to say. */
function memeOf(m: { template: string; top: string; bottom: string } | null | undefined): PostMedia | null {
  if (!m || typeof m.template !== "string") return null;
  const template = m.template.trim().toLowerCase();
  const top = cap(m.top, 90);
  const bottom = cap(m.bottom, 90);
  return MEME_IDS.has(template) && (top || bottom) ? { kind: "meme", template, top, bottom } : null;
}

/** The famous accounts whose posts may carry a meme (the list lives in media.ts). */
export { MEME_POSTERS };

/** A famous account's meme, kept only for an account that really posts them. */
function famousMemeOf(handle: string, m: { template: string; top: string; bottom: string } | null | undefined): PostMedia | null {
  return MEME_POSTERS.includes(handle.toLowerCase()) ? memeOf(m) : null;
}

const STOP = new Set(
  "the a an and or but of to in on at for with is are was were be been it its this that these those i you he she we they my your his her our their not no so as by from if then than just all one what who when how why will would can could do does did has have had about into out up over before after right now".split(" "),
);

/** The words that carry a post's meaning, lowercased. */
function keyWords(text: string): Set<string> {
  return new Set(
    text.toLowerCase().replace(/@\w+/g, " ").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

/** How much two posts say the same thing: shared key words over the smaller post's key words. */
function overlap(a: string, b: string): number {
  const x = keyWords(a);
  const y = keyWords(b);
  if (x.size < 3 || y.size < 3) return 0;
  let shared = 0;
  for (const w of x) if (y.has(w)) shared++;
  return shared / Math.min(x.size, y.size);
}

/** Whether an ordinary account's new reply repeats itself or the thread: it has
 *  already answered this post, it is re-telling one of its own recent lines,
 *  or it is saying what another reply under the same post already said. */
function repeats(author: string, text: string, parentId: number | null): boolean {
  const conn = db();
  if (parentId != null) {
    if (conn.prepare("SELECT 1 FROM posts WHERE reply_to = ? AND author = ? AND deleted = 0 LIMIT 1").get(parentId, author)) return true;
    const siblings = conn
      .prepare("SELECT text FROM posts WHERE reply_to = ? AND deleted = 0 ORDER BY id DESC LIMIT 40")
      .all(parentId) as { text: string }[];
    if (siblings.some((s) => overlap(s.text, text) >= 0.6)) return true;
  }
  const own = conn
    .prepare("SELECT text FROM posts WHERE author = ? AND deleted = 0 ORDER BY id DESC LIMIT 6")
    .all(author) as { text: string }[];
  return own.some((o) => overlap(o.text, text) >= 0.5);
}

const STYLES = new Set([
  "deadpan", "sarcasm", "absurd", "wordplay", "roast", "selfdeprecating", "online", "wholesome",
  "expert", "eyewitness", "question", "contrarian", "pedant", "fan", "complaint",
]);
const styleOf = (s: unknown): string | null => (typeof s === "string" && STYLES.has(s) ? s : null);

/** A tier list with its handles resolved to famous accounts; null unless enough of it is valid. */
function tiersOf(list: { label: string; members: string[] }[] | null | undefined): PostMedia | null {
  if (!Array.isArray(list)) return null;
  const find = db().prepare(
    "SELECT handle, name, avatar FROM accounts WHERE handle = ? COLLATE NOCASE AND kind IN ('figure', 'outlet', 'org')",
  );
  const used = new Set<string>();
  const tiers: TierRow[] = [];
  for (const t of list.slice(0, 6)) {
    const label = cap(t?.label, 24);
    const members: TierRow["members"] = [];
    for (const h of Array.isArray(t?.members) ? t.members.slice(0, 7) : []) {
      const row = find.get(String(h).replace(/^@/, "")) as TierRow["members"][number] | undefined;
      if (!row || used.has(row.handle.toLowerCase())) continue;
      used.add(row.handle.toLowerCase());
      members.push({ handle: row.handle, name: row.name, avatar: row.avatar });
    }
    if (label && members.length) tiers.push({ label, members });
  }
  return tiers.length >= 3 && used.size >= 5 ? { kind: "tiers", tiers } : null;
}

/** `gifs` holds a resolved GIF for each post index that asked for one (the lookup
 *  is a network call, so the caller does it before the transaction). `maxMedia`
 *  caps how many posts in the batch carry a GIF or meme. */
export function applyCrowd(
  out: CrowdOutput,
  meta: CrowdMeta,
  win: Window,
  gifs: Map<number, PostMedia> = new Map(),
  maxMedia = 0,
): NewPostInfo[] {
  let mediaUsed = 0;
  let tiersUsed = false;
  const tagged: number[] = []; // posts that tag @brok
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
      // A meme, GIF or tier list may stand with few words or none.
      const hasMedia = mediaUsed < maxMedia && (gifs.has(i) || !!memeOf(p.meme) || !!tiersOf(p.tier_list));
      if ((!text && !hasMedia) || seen.has(key)) return;
      const reply = refs.resolve(p.reply_to);
      let quote = refs.resolve(p.quote_of);
      if (reply && quote && reply.id === quote.id) quote = null;
      // An account answers a post once, and does not tell the same joke twice.
      if (repeats(author.handle, text, reply?.id ?? null)) return;
      let at = Math.round(win.start + ((win.end - win.start) * (i + rand(0, 1))) / posts.length);
      for (const target of [reply, quote]) if (target) at = Math.max(at, target.created_at + 5 * SECOND);
      // A reply belongs to whatever it answers: that post's storyline, or none
      // when it answers a routine post. Only standalone posts take the beat's.
      const src = reply ?? quote;
      const fromTarget = !!src;
      // An account's own everyday post is no part of the story: filed under
      // it, later replies would argue the story under a post about lunch.
      const own = !fromTarget && p.everyday === true;
      // One tier list per batch at most; it stands alone rather than answering a post.
      const tiers = !tiersUsed && !reply && !quote ? tiersOf(p.tier_list) : null;
      if (tiers) tiersUsed = true;
      const media = mediaUsed < maxMedia ? (gifs.get(i) ?? memeOf(p.meme) ?? tiers) : null;
      if (!text && !media) return; // a tier list that cannot stand (it answers a post) leaves nothing to post
      // A wordless GIF or meme takes its meaning from the post it answers; alone
      // on the timeline it is a reaction to nothing.
      if (!text && !fromTarget && media?.kind !== "tiers") return;
      const id = insertPost({
        author: author.handle,
        text,
        createdAt: at,
        replyTo: reply?.id ?? null,
        quoteOf: quote?.id ?? null,
        storylineId: fromTarget ? src.storyline_id : own ? null : meta.storylineId,
        domain: fromTarget && src.domain ? (src.domain as Domain) : own ? (author.domain as Domain) : meta.domain,
        tone:
          fromTarget && src.tone ? (src.tone as Tone) : own || (fromTarget && src.storyline_id == null) ? "wholesome" : meta.tone,
        topics: fromTarget ? parseJsonList(src.topics) : own ? [] : meta.topics,
        heat: clampInt(p.heat, 1, 10, Math.max(1, meta.heat - 2)),
        media,
        style: styleOf(p.style),
        tactic: p.tactic ?? null,
        ...translationOf(p, text),
      });
      if (media) mediaUsed++;
      const info: NewPostInfo = { id, author: author.handle, text, replyTo: reply?.id ?? null, createdAt: at };
      inserted.push(info);
      seen.add(key);
      notifyUser(accts, info, reply, quote);
      if (tagsBrok(text)) tagged.push(id);
    });
  });
  // Brok answers one tag per batch, once this batch is committed.
  if (tagged.length) onBrokTag(tagged[0]);
  return inserted;
}
