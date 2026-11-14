// Posts that promise more than they contain. When a post opens a thread
// ("Here's how:", "1/", "More below 👇") and its writer did not supply the rest,
// a short follow-up call writes the continuation as the same account's replies
// to itself, the way threads sit on X. When an outlet's or an official
// account's post carries a link with no page behind it, a follow-up call writes
// that page. Only if the call fails is the post trimmed instead, so nothing is
// ever left promising what does not exist.
import { WRITABLE, fullBrief } from "../briefs";
import { db, now, tx } from "../db";
import { generate } from "../llm";
import { CROWD_VOICES } from "../personas";
import { pageSystem, pageUser, threadSystem, threadUser } from "../prompts";
import { PageSchema, ThreadSchema } from "../schemas";
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

const LINK = /https?:\/\/\S+/;

/** Recent posts by publishers that link to a page nobody wrote. */
function dangling(limit: number): Opener[] {
  const t = now();
  const rows = db()
    .prepare(
      `SELECT p.id, p.author, a.name, a.kind, p.text, p.created_at, p.storyline_id, p.domain, p.tone, p.topics, p.heat
       FROM posts p JOIN accounts a ON a.handle = p.author
       WHERE p.deleted = 0 AND a.kind IN ('org', 'outlet') AND p.article_id IS NULL
         AND p.created_at > ? AND p.created_at <= ? AND p.text LIKE '%http%'
       ORDER BY p.created_at DESC`,
    )
    .all(t - 24 * HOUR, t + 10 * 60 * SECOND) as unknown as Opener[];
  return rows.filter((r) => LINK.test(r.text)).slice(0, limit);
}

/** Write the page a post links to and attach it; if that fails, take the link out. */
async function publish(o: Opener): Promise<void> {
  const storyline = o.storyline_id == null
    ? null
    : ((db().prepare("SELECT title, summary FROM storylines WHERE id = ?").get(o.storyline_id) as
        | { title: string; summary: string } | undefined) ?? null);
  let page: { kind: string; headline: string; dek: string; body: string } | null = null;
  try {
    page = await generate({
      role: "crowd",
      system: pageSystem(),
      user: pageUser({ handle: o.author, post: o.text, brief: briefFor(o), storyline }),
      schema: PageSchema,
    });
  } catch (err) {
    console.error("[sim] page for a linked post failed:", err);
  }
  tx(() => {
    const still = db().prepare("SELECT 1 AS ok FROM posts WHERE id = ? AND deleted = 0 AND article_id IS NULL").get(o.id);
    if (!still) return;
    const headline = (page?.headline ?? "").trim().slice(0, 300);
    const body = (page?.body ?? "").trim().slice(0, 20_000);
    if (!page || !headline || !body) {
      // Without a page the link would lead nowhere: drop it, and any promise left hanging with it.
      const bare = o.text.replace(/\s*https?:\/\/\S+/g, "").trim();
      db().prepare("UPDATE posts SET text = ? WHERE id = ?").run(HANGING.test(bare) ? unhang(bare) : bare || o.text, o.id);
      return;
    }
    // Outlets publish articles; official accounts publish their own announcements.
    const kind = o.kind === "outlet" ? "article" : page.kind === "article" ? "blog" : page.kind;
    const art = db()
      .prepare("INSERT INTO articles (outlet, headline, dek, body, storyline_id, created_at, kind) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(o.author, headline, (page.dek ?? "").trim().slice(0, 600), body, o.storyline_id, o.created_at, kind);
    db().prepare("UPDATE posts SET article_id = ? WHERE id = ?").run(Number(art.lastInsertRowid), o.id);
  });
}

/** Write the rest of up to `limit` open threads, and the pages behind up to
 *  `limit` links that lead nowhere. Never throws. */
export async function completeThreads(limit = 2): Promise<void> {
  try {
    // Links first: "Here's how: <link>" is a post with a page, not a thread.
    for (const o of dangling(limit)) await publish(o);
    for (const o of openers(limit)) await complete(o);
  } catch (err) {
    console.error("[sim] completing threads failed:", err);
  }
}
