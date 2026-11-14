// Threads. When a post opens one ("Here's how:", "1/", "More below 👇") and
// its writer did not supply the rest, a short follow-up call writes the
// continuation as the same account's replies to itself, the way threads sit on
// X. Only if that call fails is the opener trimmed instead, so nothing is ever
// left promising posts that do not exist.
import { WRITABLE, fullBrief } from "../briefs";
import { db, now, tx } from "../db";
import { generate } from "../llm";
import { CROWD_VOICES } from "../personas";
import { threadSystem, threadUser } from "../prompts";
import { ThreadSchema } from "../schemas";
import { insertPost } from "../write";
import { HANGING, unhang } from "./apply";
import { parseJsonList } from "./digest";
import type { Domain, Tone } from "../types";

const SECOND = 1000;
const HOUR = 3_600_000;

interface Opener {
  id: number;
  author: string;
  name: string;
  kind: string;
  text: string;
  created_at: number;
  storyline_id: number | null;
  domain: string | null;
  tone: string | null;
  topics: string;
  heat: number;
}

/** Recent posts that open a thread nobody continued. */
function openers(limit: number): Opener[] {
  const t = now();
  const rows = db()
    .prepare(
      `SELECT p.id, p.author, a.name, a.kind, p.text, p.created_at, p.storyline_id, p.domain, p.tone, p.topics, p.heat
       FROM posts p JOIN accounts a ON a.handle = p.author
       WHERE p.deleted = 0 AND a.kind != 'user' AND p.created_at > ? AND p.created_at <= ?
         AND p.quote_of IS NULL AND p.media IS NULL AND p.article_id IS NULL
         AND NOT EXISTS (SELECT 1 FROM polls WHERE post_id = p.id)
         AND NOT EXISTS (SELECT 1 FROM posts r WHERE r.reply_to = p.id AND r.author = p.author)
         AND NOT EXISTS (SELECT 1 FROM posts u WHERE u.id = p.reply_to AND u.author = p.author)
       ORDER BY p.created_at DESC`,
    )
    // Posts written a moment ago are scheduled a little into the future.
    .all(t - 24 * HOUR, t + 10 * 60 * SECOND) as unknown as Opener[];
  return rows.filter((r) => HANGING.test(r.text)).slice(0, limit);
}

function briefFor(o: Opener): string {
  const cast = WRITABLE.find((c) => c.handle.toLowerCase() === o.author.toLowerCase());
  if (cast) return fullBrief(cast);
  return `## @${o.author} (${o.name})\n${CROWD_VOICES[o.author] ?? "An ordinary account."}`;
}

async function complete(o: Opener): Promise<void> {
  const storyline = o.storyline_id == null
    ? null
    : ((db().prepare("SELECT title, summary FROM storylines WHERE id = ?").get(o.storyline_id) as
        | { title: string; summary: string } | undefined) ?? null);
  let parts: string[] = [];
  try {
    const out = await generate({
      // Famous accounts get the stronger writer; their voice is the product.
      role: o.kind === "figure" ? "director" : "crowd",
      system: threadSystem(),
      user: threadUser({ handle: o.author, opener: o.text, brief: briefFor(o), storyline }),
      schema: ThreadSchema,
    });
    parts = (out?.posts ?? []).map((p) => String(p).trim()).filter(Boolean).slice(0, 4);
  } catch (err) {
    console.error("[sim] thread continuation failed:", err);
  }
  tx(() => {
    // Someone may have continued or deleted it while the model was writing.
    const still = db()
      .prepare(
        `SELECT 1 AS ok FROM posts p WHERE p.id = ? AND p.deleted = 0
           AND NOT EXISTS (SELECT 1 FROM posts r WHERE r.reply_to = p.id AND r.author = p.author)`,
      )
      .get(o.id);
    if (!still) return;
    if (!parts.length) {
      db().prepare("UPDATE posts SET text = ? WHERE id = ?").run(unhang(o.text), o.id);
      return;
    }
    let parent = o.id;
    parts.forEach((text, i) => {
      parent = insertPost({
        author: o.author,
        text: Array.from(text).slice(0, 1200).join(""),
        createdAt: o.created_at + (i + 1) * 20 * SECOND,
        replyTo: parent,
        storylineId: o.storyline_id,
        domain: o.domain as Domain | null,
        tone: o.tone as Tone | null,
        topics: parseJsonList(o.topics),
        // Readers drop off down a thread.
        heat: Math.max(1, o.heat - 1 - i),
      });
    });
  });
}

/** Write the rest of up to `limit` open threads. Never throws. */
export async function completeThreads(limit = 2): Promise<void> {
  try {
    for (const o of openers(limit)) await complete(o);
  } catch (err) {
    console.error("[sim] completing threads failed:", err);
  }
}
