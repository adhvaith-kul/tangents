// Brok: the site's built-in assistant, this world's stand-in for Grok. People
// tag it under a post ("@brok is this true?") and it answers in the thread;
// the reader can also ask it things privately on its own page. It answers from
// this world's record (storylines, the facts ledger, prices, the thread in
// front of it) and never changes the world. Server-only.
import { db, now, tx, userHandle } from "./db";
import { generate } from "./llm";
import { CONTENT_RULES } from "./prompts";
import { BrokSchema } from "./schemas";
import { digestStocks } from "./stocks";
import { insertNotification, insertPost } from "./write";

export const BROK = "brok";
const TAG = /(^|[^\w@])@brok\b/i;

/** Whether a post is addressed to Brok. */
export function tagsBrok(text: string): boolean {
  return TAG.test(text);
}

/** The account row, created with the world and added to older worlds on start. */
export const BROK_ACCOUNT = {
  handle: BROK,
  name: "Brok",
  bio: "Ask me anything. I read the whole timeline so you don't have to.",
  kind: "org",
  domain: "tech",
  badge: "gold",
  followers: 6_400_000,
  following: 1,
  avatar: "/logos/brok.svg",
  banner: "/logos/brok-banner.svg",
  location: null,
  joined: "November 2023",
} as const;

let systemCache: string | null = null;

function system(): string {
  systemCache ??= `You are Brok, the AI assistant built into Tangents, a social network that looks and works like X. People tag you under posts or ask you directly. Everything on this site is a simulated world and the reader knows it, but you never say so: to you this world is simply the world, and its record is the record.

# How you answer

- From the record you are given: the open storylines, the facts ledger, prices, and the thread in front of you. That record is the truth here. If a post contradicts it, say so plainly and say what the record shows. If the record supports it, confirm it and add the one detail that matters.
- If the record does not cover the question, answer from general knowledge where that is safe, and say what you cannot verify. Never invent a new fact about this world: no new events, quotes, deals, numbers or motives. You report and explain; you do not make news.
- Short. One to three sentences in a thread, at most 280 characters there. On your own page you may run to a short paragraph or a few lines when the question needs it.
- Voice: dry, direct, a little cheeky, never fawning. You do not hedge for the sake of it, you do not lecture, you do not thank people for the question. A flat verdict first ("True.", "No.", "Half right."), then the reason.
- Asked to roast someone or something, do it properly: specific, about what they did and said in this world or are known for, funny rather than cruel. Then stop.
- Asked who is right in an argument, pick a side when the record supports one and say why; when it does not, say what each has right.
- Asked to explain a post, say what it is about, what led to it and why people care, for someone who has just arrived.
- Mention accounts by @handle when you refer to them. No hashtags, no emoji unless the question is a joke, no markdown, no links.
- You have no opinions on who should win elections and you give no financial, medical or legal advice; say so in a line if pushed, then give the facts.

# Rules

${CONTENT_RULES}`;
  return systemCache;
}

interface Row {
  id: number; author: string; text: string; reply_to: number | null; article_id: number | null;
  storyline_id: number | null; created_at: number;
}

function postRow(id: number): Row | undefined {
  return db()
    .prepare("SELECT id, author, text, reply_to, article_id, storyline_id, created_at FROM posts WHERE id = ? AND deleted = 0")
    .get(id) as Row | undefined;
}

/** The post, what it answers (up to five levels up), and any page attached along the way. */
function threadContext(postId: number): { lines: string[]; storylineId: number | null } {
  const chain: Row[] = [];
  let cur = postRow(postId);
  while (cur && chain.length < 6) {
    chain.push(cur);
    cur = cur.reply_to != null ? postRow(cur.reply_to) : undefined;
  }
  chain.reverse();
  const lines: string[] = [];
  for (const p of chain) {
    lines.push(`@${p.author}: ${p.text}`);
    if (p.article_id != null) {
      const a = db().prepare("SELECT outlet, headline, dek, body FROM articles WHERE id = ?").get(p.article_id) as
        | { outlet: string; headline: string; dek: string; body: string } | undefined;
      if (a) lines.push(`  [linked page from @${a.outlet}] ${a.headline}. ${a.dek} ${a.body.slice(0, 900)}`);
    }
  }
  return { lines, storylineId: chain.find((p) => p.storyline_id != null)?.storyline_id ?? null };
}

/** The world as Brok may cite it. */
function record(storylineId: number | null): string {
  const conn = db();
  const out: string[] = [];
  const stories = conn
    .prepare("SELECT id, title, summary, status FROM storylines ORDER BY (id = ?) DESC, (status = 'open') DESC, updated_at DESC LIMIT 7")
    .all(storylineId ?? -1) as { id: number; title: string; summary: string; status: string }[];
  if (stories.length) {
    out.push(`STORYLINES:\n${stories.map((s) => `- ${s.title}${s.status === "open" ? "" : " (over)"}: ${s.summary}`).join("\n")}`);
  }
  const facts = conn
    .prepare("SELECT text FROM facts ORDER BY (storyline_id = ?) DESC, created_at DESC, id DESC LIMIT 30")
    .all(storylineId ?? -1) as { text: string }[];
  if (facts.length) out.push(`FACTS ON RECORD:\n${facts.map((f) => `- ${f.text}`).join("\n")}`);
  const moves = conn
    .prepare("SELECT ticker, pct, reason FROM stock_ticks WHERE reason IS NOT NULL AND t <= ? ORDER BY t DESC LIMIT 8")
    .all(now()) as { ticker: string; pct: number | null; reason: string }[];
  out.push(
    `PRICES: ${digestStocks().map((s) => `${s.ticker} ${s.price} (${s.changePct >= 0 ? "+" : ""}${s.changePct.toFixed(2)}% today)`).join(", ")}`,
  );
  if (moves.length) {
    out.push(`RECENT MOVES AND WHY:\n${moves.map((m) => `- ${m.ticker} ${m.pct != null ? `${m.pct > 0 ? "+" : ""}${m.pct}%` : ""}: ${m.reason}`).join("\n")}`);
  }
  return out.join("\n\n");
}

async function answer(question: string, postId: number | null, where: "thread" | "page", strong: boolean): Promise<string | null> {
  const ctx = postId != null ? threadContext(postId) : { lines: [], storylineId: null };
  const parts = [record(ctx.storylineId)];
  if (ctx.lines.length) parts.push(`THE THREAD (oldest first; the last post is the one you were asked about or tagged in):\n${ctx.lines.join("\n")}`);
  parts.push(`THE QUESTION: ${question}`);
  parts.push(where === "thread" ? "Answer as a reply in the thread, at most 280 characters." : "Answer on your own page, to the reader alone.");
  const out = await generate({
    // The reader's own questions get the stronger model; tags from the crowd get the cheaper one.
    role: strong ? "director" : "crowd",
    system: system(),
    user: parts.join("\n\n"),
    schema: BrokSchema,
  });
  const text = typeof out?.text === "string" ? out.text.trim() : "";
  return text || null;
}

/** The reader asks on Brok's page. Nothing is posted. Throws a message for the page. */
export async function askBrok(ask: string, postId: number | null): Promise<string> {
  const question = ask.replace(/\s+/g, " ").trim().slice(0, 400) || (postId != null ? "Explain this post." : "");
  if (!question) throw new Error("Ask something.");
  if (postId != null && !postRow(postId)) throw new Error("That post is no longer there.");
  const text = await answer(question, postId, "page", true);
  if (!text) throw new Error("Brok had nothing to say. Try again.");
  return text;
}

// One reply at a time, across hot reloads.
const g = globalThis as { __tangentsBrok?: { chain: Promise<unknown>; seen: Set<number> } };
const state = () => (g.__tangentsBrok ??= { chain: Promise.resolve(), seen: new Set() });

/** A post tagged @brok: answer it in the thread. Fire-and-forget; never throws. */
export function onBrokTag(postId: number): void {
  const s = state();
  if (s.seen.has(postId)) return;
  s.seen.add(postId);
  s.chain = s.chain
    .then(async () => {
      const tag = postRow(postId);
      if (!tag || tag.author === BROK) return;
      const me = userHandle();
      const question = tag.text.replace(/@brok\b/gi, "").replace(/\s+/g, " ").trim() || "Explain this.";
      const text = await answer(question, postId, "thread", tag.author === me);
      if (!text) return;
      tx(() => {
        if (!postRow(postId)) return; // deleted while Brok was writing
        // Never before the post it answers, which may still be scheduled a little ahead.
        const at = Math.max(now() + 1500, tag.created_at + 15_000);
        const id = insertPost({
          author: BROK,
          text: Array.from(text).slice(0, 560).join(""),
          createdAt: at,
          replyTo: postId,
          storylineId: tag.storyline_id,
          domain: "tech",
          tone: "business",
          heat: 3,
        });
        if (tag.author === me) insertNotification({ type: "reply", actor: BROK, postId: id, targetPostId: postId, createdAt: at });
      });
    })
    .catch((err) => console.error("[brok] reply failed:", err));
}
