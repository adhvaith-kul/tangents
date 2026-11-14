// One tick: digest, director call, apply the beat, crowd call, apply the crowd,
// housekeeping. Model calls run outside any transaction; each result is
// applied in a single tx() so readers never see half a beat.
import { db, kvGet, kvSet, now, tx, type PostRow } from "../db";
import { generate } from "../llm";
import { resolveGif } from "../media";
import { markHeadlineUsed } from "../news";
import { getSettings } from "../settings";
import type { CrowdOutput } from "../schemas";
import type { PostMedia } from "../types";
import { decayPrefs, prefMap } from "../prefs";
import {
  ambientSystem, ambientUser, crowdSystem, crowdUser, directorSystem, directorUser, type CrowdInput,
} from "../prompts";
import { AmbientSchema, CrowdSchema, DirectorSchema, type DirectorOutput } from "../schemas";
import { noiseTick, scheduleMoves } from "../stocks";
import type { WorldDigest } from "../types";
import {
  applyAmbient, applyBeat, applyCrowd, type BeatResult, type CrowdMeta, type Mode, type NewPostInfo, type Window,
} from "./apply";
import { buildDigest, digestPost, parseJsonList } from "./digest";
import { planMedia, tierEligibleFor, tierPool } from "./mediaPlan";
import { tickMs } from "./pace";
import type { Domain, Tone } from "../types";
import { volumes } from "../usage";
import { completeThreads } from "./threads";

const SECOND = 1000;
const HOUR = 3_600_000;


export interface TickOptions {
  mode: Mode;
  /** user_post mode: the user's post to react to. */
  focusPostId?: number | null;
  /** A premise the reader proposed; the beat opens a storyline from it. */
  seed?: string;
  /** The reader is steering this storyline: the seed is its next development,
   *  or, with wrap, the beat closes it. */
  steer?: { storylineId: number; wrap: boolean };
  /** bootstrap mode: the window ends this many hours before now. */
  hoursBack?: number;
}

function safely(what: string, fn: () => void): void {
  try {
    fn();
  } catch (err) {
    console.error(`[sim] ${what} failed:`, err);
  }
}

/** Computed after the director call returns, so the window starts at the real "now". */
function beatWindow(opts: TickOptions): Window {
  const t = now();
  if (opts.mode === "bootstrap") {
    const end = t - (opts.hoursBack ?? 0) * HOUR;
    return { start: end - HOUR, end };
  }
  const lead = opts.mode === "user_post" ? 3 + Math.random() * 5 : 1;
  const start = t + Math.round(lead * SECOND);
  // What the reader asked for lands within 40 seconds. An ordinary beat opens
  // at once and then unfolds over most of the cycle, so its reactions arrive
  // between other posts instead of in one block.
  const quick = opts.mode !== "normal" || !!opts.seed || !!opts.steer;
  const span = quick ? Math.min(tickMs(), 40 * SECOND) : Math.max(40 * SECOND, 0.8 * tickMs());
  return { start, end: start + span };
}

/** The last 40% of the window. Outside bootstrap it never starts in the past,
 *  so pollers asking for posts newer than what they have still see them. */
function crowdWindow(mode: Mode, w: Window): Window {
  const len = w.end - w.start;
  const start = w.start + 0.6 * len;
  if (mode === "bootstrap") return { start, end: w.end };
  const s = Math.max(start, now() + 2 * SECOND);
  return { start: s, end: s + 0.4 * len };
}

async function runCrowd(
  opts: TickOptions,
  digest: WorldDigest,
  out: DirectorOutput,
  beat: BeatResult,
  window: Window,
  focusPostId: number | null,
  routine: NewPostInfo[] = [],
): Promise<string | null> {
  const posts = beat.posts.map((p) =>
    digestPost({ id: p.id, author: p.author, text: p.text, reply_to: p.replyTo, created_at: p.createdAt }),
  );
  let userPostRef: string | null = null;
  if (focusPostId != null) {
    const row = db()
      .prepare("SELECT id, author, text, reply_to, created_at FROM posts WHERE id = ? AND deleted = 0")
      .get(focusPostId) as Pick<PostRow, "id" | "author" | "text" | "reply_to" | "created_at"> | undefined;
    if (row) {
      posts.unshift(digestPost(row));
      userPostRef = `p${row.id}`;
    }
  }
  // Replies ordinary accounts already left on this story, so strangers can answer each other.
  const earlier = (
    db()
      .prepare(
        `SELECT p.id, p.author, p.text, p.reply_to, p.created_at FROM posts p
         JOIN accounts a ON a.handle = p.author
         WHERE p.storyline_id = ? AND a.kind = 'crowd' AND p.created_at <= ? AND p.deleted = 0
           AND NOT EXISTS (SELECT 1 FROM posts d WHERE d.deleted = 1 AND d.id IN (p.reply_to, p.root_id, p.quote_of))
         ORDER BY p.created_at DESC, p.id DESC LIMIT 5`,
      )
      .all(beat.meta.storylineId, now()) as unknown as Pick<
      PostRow,
      "id" | "author" | "text" | "reply_to" | "created_at"
    >[]
  ).map((p) => digestPost(p));
  if (beat.standout) {
    const so = beat.standout;
    earlier.unshift(digestPost({ id: so.id, author: so.author, text: so.text, reply_to: so.replyTo, created_at: so.createdAt }));
  }
  const input: CrowdInput = {
    beat: {
      kind: out.beat.kind,
      title: out.beat.title,
      summary: out.beat.summary,
      domain: beat.meta.domain,
      tone: beat.meta.tone,
    },
    brief: out.crowd_brief,
    posts,
    earlier,
    user: digest.user ? { handle: digest.user.handle, name: digest.user.name } : null,
    userPostRef,
    taste: digest.taste,
    count: (opts.mode === "bootstrap" ? volumes().crowdBootstrap : volumes().crowd) + (routine.length ? volumes().crowdEveryday : 0),
    everyday: routine.map((p) =>
      digestPost({ id: p.id, author: p.author, text: p.text, reply_to: p.replyTo, created_at: p.createdAt }),
    ),
    everydayCount: routine.length ? volumes().crowdEveryday : 0,
  };
  const cap = mediaCap(beat.meta.heat, beat.meta.tone);
  const plan = planMedia(cap, tierEligibleFor(beat.meta.storylineId, beat.meta.heat));
  if (plan.tierList) plan.tierHandles = tierPool(beat.meta.storylineId, beat.meta.domain);
  input.media = plan;
  try {
    const crowd = await generate({ role: "crowd", system: crowdSystem(), user: crowdUser(input), schema: CrowdSchema });
    if (!crowd) {
      console.error("[sim] crowd call returned nothing usable");
      return "The crowd model returned nothing usable; this beat has no crowd replies.";
    }
    const gifs = await findGifs(crowd, plan.gifs);
    const win = crowdWindow(opts.mode, window);
    tx(() => applyCrowd(crowd, beat.meta, win, gifs, cap));
    return null;
  } catch (err) {
    console.error("[sim] crowd call failed:", err);
    return `The crowd call failed: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/** How many posts in a crowd batch may carry a GIF or meme, from the reader's setting. */
/** How many posts in a batch may carry a GIF, meme or tier list. The setting is
 *  the ceiling. Under it the number follows the moment (a messy, loud beat gets
 *  a reply section full of them; a routine post gets none) and what the reader
 *  has shown they like. */
function mediaCap(heat = 5, tone: string | null = null): number {
  const level = getSettings().media;
  if (level === 0) return 0;
  const [base, ceiling] = level === 1 ? [2, 3] : [4, 7];
  const rowdy = tone === "shitpost" || tone === "meltdown" || tone === "feud" || tone === "drama" || tone === "gossip";
  const moment = heat >= 7 || (rowdy && heat >= 5) ? 1.6 : heat <= 3 || tone === "business" ? 0.4 : 1;
  const w = prefMap();
  const liked = (w.get("format:gif") ?? 0) + (w.get("format:meme") ?? 0);
  const taste = 1 + 0.5 * Math.tanh(liked / 10);
  return Math.max(0, Math.min(ceiling, Math.round(base * moment * taste)));
}

/** Look up the GIFs a batch asked for. A network call each, so it runs before
 *  the transaction that stores the posts; failures just mean no GIF. */
async function findGifs(crowd: CrowdOutput, cap: number): Promise<Map<number, PostMedia>> {
  const out = new Map<number, PostMedia>();
  if (cap === 0) return out;
  const wanted = crowd.posts
    .map((p, i) => ({ i, q: typeof p.gif === "string" ? p.gif.trim() : "" }))
    .filter((x) => x.q)
    .slice(0, cap);
  await Promise.all(
    wanted.map(async ({ i, q }) => {
      const gif = await resolveGif(q).catch(() => null);
      if (gif) out.set(i, { kind: "gif", ...gif, alt: q });
    }),
  );
  return out;
}

/** Record the result of every poll that has closed, so the story can act on it. */
function resolvePolls(): void {
  const conn = db();
  const closed = conn
    .prepare(
      `SELECT pl.post_id, pl.options, pl.targets, pl.user_choice, p.author, p.text, p.storyline_id
       FROM polls pl JOIN posts p ON p.id = pl.post_id
       WHERE pl.resolved = 0 AND pl.closes_at <= ? AND p.deleted = 0`,
    )
    .all(now()) as unknown as {
    post_id: number; options: string; targets: string; user_choice: number | null;
    author: string; text: string; storyline_id: number | null;
  }[];
  for (const poll of closed) {
    const labels = JSON.parse(poll.options) as string[];
    const votes = (JSON.parse(poll.targets) as number[]).slice();
    if (poll.user_choice != null && votes[poll.user_choice] != null) votes[poll.user_choice] += 1;
    const total = votes.reduce((a, b) => a + b, 0) || 1;
    const win = votes.indexOf(Math.max(...votes));
    const question = poll.text.replace(/\s+/g, " ").slice(0, 110);
    conn
      .prepare("INSERT INTO facts (text, subjects, storyline_id, created_at) VALUES (?, ?, ?, ?)")
      .run(
        `@${poll.author}'s poll ("${question}") closed with "${labels[win]}" winning on ${Math.round((votes[win] / total) * 100)}% of ${total.toLocaleString("en-US")} votes.`,
        JSON.stringify([poll.author]), poll.storyline_id, now(),
      );
    conn.prepare("UPDATE polls SET resolved = 1 WHERE post_id = ?").run(poll.post_id);
  }
}

function housekeeping(newEvent: boolean): void {
  safely("decayPrefs", decayPrefs);
  safely("resolvePolls", () => tx(resolvePolls));
  safely("dormancy", () => {
    db()
      .prepare("UPDATE storylines SET status = 'dormant' WHERE status = 'open' AND updated_at < ?")
      .run(now() - 24 * HOUR);
  });
  safely("wildcard", () => {
    const n = Number(kvGet("beats_since_wildcard") ?? 0) || 0;
    kvSet("beats_since_wildcard", String(n >= 7 ? 0 : n + 1));
  });
  safely("ticksSinceNewEvent", () => {
    const n = newEvent ? 0 : (Number(kvGet("ticks_since_new_event") ?? 0) || 0) + 1;
    kvSet("ticks_since_new_event", String(n));
  });
}

/** The first `n` everyday posts, plus the rest of any thread one of them opens:
 *  an account's replies to its own post do not count towards the number asked for. */
function routinePosts(posts: DirectorOutput["everyday"], n: number): DirectorOutput["everyday"] {
  const kept = new Map<string, string>(); // ref -> author, lowercased
  let openers = 0;
  return posts.filter((p) => {
    const ref = String(p.ref ?? "").trim().toLowerCase();
    const author = String(p.author ?? "").replace(/^@/, "").toLowerCase();
    const parent = typeof p.reply_to === "string" ? p.reply_to.trim().toLowerCase() : "";
    const continues = !!parent && kept.get(parent) === author;
    if (!continues && openers >= n) return false;
    if (!continues) openers++;
    if (ref) kept.set(ref, author);
    return true;
  });
}

/** Run one tick. Throws when the director call fails or declines; everything
 *  after the beat is best effort. Returns a warning when the crowd part failed. */
export async function runTick(opts: TickOptions): Promise<string | null> {
  const focusPostId = opts.mode === "user_post" ? (opts.focusPostId ?? null) : null;
  try {
    const digest = buildDigest(opts.mode, focusPostId, opts.seed ?? null, opts.steer ?? null);
    // A combined cycle: the same call writes the everyday posts for the gap after the beat.
    const everyday = opts.mode === "normal" && volumes().combined ? volumes().ambient : 0;
    const out = await generate({
      role: "director",
      system: directorSystem(),
      user: directorUser(digest, { everyday }),
      schema: DirectorSchema,
    });
    if (!out) throw new Error("The director model declined or returned output that did not match the schema.");

    const window = beatWindow(opts);
    const beat = tx(() =>
      applyBeat(out, {
        mode: opts.mode, window, focusPostId, seeded: !!opts.seed || !!opts.steer,
        premise: opts.seed ?? null, wrap: !!opts.steer?.wrap,
      }),
    );
    if (opts.steer?.wrap) {
      // A wrapped storyline is finished: the director is no longer offered it.
      safely("wrap", () => db().prepare("UPDATE storylines SET status = 'dormant' WHERE id = ?").run(opts.steer!.storylineId));
    }

    // These call into other modules, which may manage their own transactions.
    if (beat.headlineId != null) {
      const id = beat.headlineId;
      safely("markHeadlineUsed", () => markHeadlineUsed(id));
    }
    if (beat.stockMoves.length) {
      safely("scheduleMoves", () => scheduleMoves(beat.stockMoves, beat.movesAt, beat.meta.storylineId));
    }

    // Everyday posts trickle out between the end of this beat and the next one.
    const routine =
      everyday && Array.isArray(out.everyday) && out.everyday.length
        ? tx(() =>
            applyAmbient(
              { posts: routinePosts(out.everyday, everyday), reposts: [] },
              // Across the same stretch as the beat, so the two interleave.
              { start: window.start + 12 * SECOND, end: Math.max(window.end, window.start + tickMs()) },
            ),
          )
        : [];

    // Any thread the beat opened is finished while the crowd is being written.
    const threads = completeThreads();
    const warning = await runCrowd(opts, digest, out, beat, window, focusPostId, routine);
    await threads;
    housekeeping(beat.newEvent);
    return warning;
  } finally {
    safely("noiseTick", () => noiseTick(now()));
  }
}

type PostLite = Pick<PostRow, "id" | "author" | "text" | "reply_to" | "created_at">;

/** An ambient tick: everyday posts from the cast, then everyday chatter from the
 *  crowd. Touches no storyline, fact, relationship or price. Returns a warning
 *  when the crowd part failed; throws when the first call fails. */
export async function runAmbient(): Promise<string | null> {
  try {
    const digest = buildDigest("normal", null);
    const out = await generate({
      role: "director",
      system: ambientSystem(),
      user: ambientUser({
        simTime: digest.simTime,
        timeline: digest.timeline,
        openStorylines: digest.storylines.map((s) => s.title),
        taste: digest.taste,
        count: volumes().ambient,
      }),
      schema: AmbientSchema,
    });
    if (!out) throw new Error("The model declined or returned unusable everyday posts.");

    const start = now() + SECOND;
    const window: Window = { start, end: start + Math.min(tickMs(), 40 * SECOND) };
    const posts = tx(() => applyAmbient(out, window));
    if (!posts.length) return null;
    const threads = completeThreads();

    const input: CrowdInput = {
      beat: {
        kind: "ambient",
        title: "An ordinary hour on the timeline",
        summary: "Nothing in particular is happening. Accounts are posting their routine updates.",
        domain: "crossover",
        tone: "wholesome",
      },
      brief: "Routine posts from well-known accounts, and ordinary people going about their day.",
      posts: posts.map((p) =>
        digestPost({ id: p.id, author: p.author, text: p.text, reply_to: p.replyTo, created_at: p.createdAt }),
      ),
      user: digest.user ? { handle: digest.user.handle, name: digest.user.name } : null,
      userPostRef: null,
      taste: digest.taste,
      count: volumes().thread,
    };
    const cap = mediaCap(3, "wholesome");
    const plan = planMedia(cap, false);
    input.media = plan;
    try {
      const crowd = await generate({ role: "crowd", system: crowdSystem(), user: crowdUser(input), schema: CrowdSchema });
      if (!crowd) return "The crowd model returned nothing usable for the everyday posts.";
      const meta: CrowdMeta = { storylineId: null, domain: "crossover", tone: "wholesome", topics: [], heat: 3 };
      const gifs = await findGifs(crowd, plan.gifs);
      const s = Math.max(window.start + 0.6 * (window.end - window.start), now() + 2 * SECOND);
      tx(() => applyCrowd(crowd, meta, { start: s, end: s + 0.4 * (window.end - window.start) }, gifs, cap));
      return null;
    } catch (err) {
      console.error("[sim] ambient crowd call failed:", err);
      return `The crowd call failed: ${err instanceof Error ? err.message : String(err)}`;
    } finally {
      await threads;
    }
  } finally {
    safely("noiseTick", () => noiseTick(now()));
  }
}

/** More replies under one post, written when the user opens it. Returns the
 *  number of replies added. */
export async function runThread(postId: number): Promise<number> {
  const conn = db();
  const post = conn
    .prepare(
      "SELECT id, author, text, reply_to, created_at, storyline_id, domain, tone, topics, heat FROM posts WHERE id = ? AND deleted = 0",
    )
    .get(postId) as
    | (PostLite & Pick<PostRow, "storyline_id" | "domain" | "tone" | "topics" | "heat">)
    | undefined;
  if (!post) return 0;

  const targets: PostLite[] = [post];
  if (post.reply_to != null) {
    const parent = conn
      .prepare("SELECT id, author, text, reply_to, created_at FROM posts WHERE id = ? AND deleted = 0")
      .get(post.reply_to) as PostLite | undefined;
    if (parent) targets.unshift(parent);
  }
  const earlier = conn
    .prepare(
      `SELECT id, author, text, reply_to, created_at FROM posts
       WHERE reply_to = ? AND created_at <= ? AND deleted = 0 ORDER BY t_likes DESC LIMIT 6`,
    )
    .all(post.id, now()) as unknown as PostLite[];
  const story = post.storyline_id != null
    ? (conn.prepare("SELECT title, summary FROM storylines WHERE id = ?").get(post.storyline_id) as
        | { title: string; summary: string }
        | undefined)
    : undefined;
  const user = conn.prepare("SELECT handle, name FROM accounts WHERE kind = 'user' LIMIT 1").get() as
    | { handle: string; name: string }
    | undefined;

  const domain = (post.domain as Domain | null) ?? "crossover";
  const tone = (post.tone as Tone | null) ?? "drama";
  const ref = `p${post.id}`;
  const digest = buildDigest("normal", null);
  const input: CrowdInput = {
    beat: {
      kind: "thread",
      title: story?.title ?? "A post on the timeline",
      summary: story?.summary ?? "People are replying to a post.",
      domain,
      tone,
    },
    brief: `More people have found ${ref} and are replying under it. Add to the thread; do not repeat what earlier replies said.`,
    posts: targets.map((p) => digestPost(p)),
    earlier: earlier.map((p) => digestPost(p)),
    exclude: (
      conn.prepare("SELECT DISTINCT author FROM posts WHERE (reply_to = ? OR root_id = ?) AND deleted = 0").all(post.id, post.id) as { author: string }[]
    ).map((r) => r.author),
    user: user ?? null,
    userPostRef: null,
    taste: digest.taste,
    count: volumes().thread,
  };
  const cap = mediaCap();
  const plan = planMedia(cap, false);
  input.media = plan;
  const crowd = await generate({ role: "crowd", system: crowdSystem(), user: crowdUser(input), schema: CrowdSchema });
  if (!crowd) return 0;
  const meta: CrowdMeta = {
    storylineId: post.storyline_id, domain, tone, topics: parseJsonList(post.topics), heat: Math.max(1, post.heat - 2),
  };
  const start = now() + 2 * SECOND;
  // Standalone or quote posts would leak out of the thread; keep only replies inside it.
  const inThread = new Set([ref, ...earlier.map((p) => `p${p.id}`)]);
  crowd.posts = crowd.posts
    .filter((p) => p.reply_to != null && inThread.has(p.reply_to.trim().toLowerCase()))
    .map((p) => ({ ...p, quote_of: null }));
  const gifs = await findGifs(crowd, plan.gifs);
  return tx(() => applyCrowd(crowd, meta, { start, end: start + 25 * SECOND }, gifs, cap)).length;
}
