// Writes behind the API routes: onboarding, posting, interaction state. Server-only.
import { db, now, tx, userHandle } from "./db";
import type { PostRow } from "./db";
import { CAST } from "./cast";
import { recordInteractions, recordUserPost, seedPref } from "./prefs";
import { insertPost } from "./write";
import type { Account, Domain, InteractionEvent, OnboardRequest, PostView, Tone } from "./types";
import { accountView, postView } from "./views";

export type Result<T> = { ok: true; value: T } | { ok: false; status: number; error: string };
const bad = (status: number, error: string): { ok: false; status: number; error: string } => ({
  ok: false, status, error,
});

export function onboard(req: Partial<OnboardRequest>): Result<Account> {
  const name = typeof req.name === "string" ? req.name.trim() : "";
  const handle = typeof req.handle === "string" ? req.handle.trim().replace(/^@/, "") : "";
  if (name.length < 1 || name.length > 50) return bad(400, "Name must be 1 to 50 characters.");
  if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) {
    return bad(400, "Handle must be 1 to 15 letters, digits or underscores.");
  }
  if (req.interest !== "tech" && req.interest !== "pop" && req.interest !== "both") {
    return bad(400, "Choose an interest.");
  }
  if (userHandle()) return bad(409, "An account already exists.");
  // These would collide with the app's own routes at /<handle>.
  const reserved = ["explore", "post", "news", "markets", "notifications", "world", "api", "avatars"];
  if (reserved.includes(handle.toLowerCase())) return bad(409, "That handle is already taken.");
  const taken = db().prepare("SELECT 1 FROM accounts WHERE handle = ?").get(handle);
  if (taken) return bad(409, "That handle is already taken.");

  const domains: Domain[] = req.interest === "both" ? ["tech", "pop"] : [req.interest];
  const joined = new Date(now()).toLocaleString("en-US", { month: "long", year: "numeric" });
  const follow = CAST.filter((c) => (c.kind === "figure" || c.kind === "outlet") && domains.includes(c.domain));
  tx(() => {
    db()
      .prepare(
        `INSERT INTO accounts (handle, name, bio, kind, domain, badge, followers, following, avatar, banner, location, joined)
         VALUES (?, ?, '', 'user', ?, NULL, 0, ?, NULL, '#333639', NULL, ?)`,
      )
      .run(handle, name, req.interest === "both" ? "crossover" : domains[0], follow.length, joined);
    const ins = db().prepare("INSERT OR IGNORE INTO follows (handle) VALUES (?)");
    for (const c of follow) ins.run(c.handle);
    for (const d of domains) seedPref("domain", d, 3);
  });
  return { ok: true, value: accountView(handle) as Account };
}

export function createPost(text: unknown, replyTo: unknown, quoteOf: unknown): Result<PostView> {
  const me = userHandle();
  if (!me) return bad(401, "Create an account first.");
  const body = typeof text === "string" ? text.trim() : "";
  if (body.length < 1 || body.length > 280) return bad(400, "Posts must be 1 to 280 characters.");
  const asId = (v: unknown) => (v == null ? null : Number.isInteger(v) ? (v as number) : NaN);
  const replyId = asId(replyTo);
  const quoteId = asId(quoteOf);
  if (Number.isNaN(replyId) || Number.isNaN(quoteId)) return bad(400, "Invalid post id.");

  const t = now();
  const find = (id: number) =>
    db().prepare("SELECT * FROM posts WHERE id = ? AND created_at <= ? AND deleted = 0").get(id, t) as unknown as
      | PostRow
      | undefined;
  const parent = replyId != null ? find(replyId) : undefined;
  const quoted = quoteId != null ? find(quoteId) : undefined;
  if (replyId != null && !parent) return bad(404, "The post you are replying to was not found.");
  if (quoteId != null && !quoted) return bad(404, "The post you are quoting was not found.");

  const src = parent ?? quoted;
  const id = tx(() =>
    insertPost({
      author: me,
      text: body,
      createdAt: t,
      replyTo: parent?.id ?? null,
      quoteOf: quoted?.id ?? null,
      storylineId: src?.storyline_id ?? null,
      domain: (src?.domain as Domain | null) ?? null,
      tone: (src?.tone as Tone | null) ?? null,
      topics: src ? (JSON.parse(src.topics || "[]") as string[]) : [],
      heat: src?.heat,
    }),
  );
  if (parent) recordUserPost("reply", parent.id);
  else if (quoted) recordUserPost("quote", quoted.id);
  return { ok: true, value: postView(id) as PostView };
}

/** Delete one of the user's own posts. As on X: the post disappears from every
 *  list, replies to it stay (with a tombstone above them), posts that quoted it
 *  show it as unavailable, and the likes and reposts it collected go with it. */
export function deletePost(id: number): Result<{ ok: true }> {
  const me = userHandle();
  if (!me) return bad(401, "Create an account first.");
  const row = db().prepare("SELECT author, deleted FROM posts WHERE id = ?").get(id) as
    | { author: string; deleted: number }
    | undefined;
  if (!row || row.deleted) return bad(404, "Post not found.");
  if (row.author.toLowerCase() !== me.toLowerCase()) return bad(403, "You can only delete your own posts.");
  tx(() => {
    db().prepare("UPDATE posts SET deleted = 1 WHERE id = ?").run(id);
    db().prepare("DELETE FROM notifications WHERE target_post_id = ?").run(id);
    db().prepare("DELETE FROM viewer_state WHERE post_id = ?").run(id);
  });
  return { ok: true, value: { ok: true } };
}

const VALID = new Set([
  "like", "unlike", "repost", "unrepost", "bookmark", "unbookmark", "dwell", "skip", "open",
  "profile", "not_interested", "follow", "unfollow",
]);

export function applyInteractions(raw: unknown): InteractionEvent[] | null {
  if (!Array.isArray(raw)) return null;
  const out: InteractionEvent[] = [];
  for (const e of raw.slice(0, 200)) {
    if (!e || typeof e !== "object" || !VALID.has((e as InteractionEvent).type)) continue;
    const ev = e as InteractionEvent;
    out.push({
      type: ev.type,
      postId: Number.isInteger(ev.postId) ? ev.postId : undefined,
      articleId: Number.isInteger(ev.articleId) ? ev.articleId : undefined,
      handle: typeof ev.handle === "string" ? ev.handle.replace(/^@/, "") : undefined,
      ms: typeof ev.ms === "number" && Number.isFinite(ev.ms) ? ev.ms : undefined,
    });
  }
  return out;
}

const FLAG: Record<string, [string, number]> = {
  like: ["liked", 1], unlike: ["liked", 0],
  repost: ["reposted", 1], unrepost: ["reposted", 0],
  bookmark: ["bookmarked", 1], unbookmark: ["bookmarked", 0],
  not_interested: ["hidden", 1],
};

/** Log and credit the events, then apply their state (flags, follows). */
export function interact(events: InteractionEvent[]): void {
  const me = userHandle();
  recordInteractions(events);
  tx(() => {
    const conn = db();
    for (const e of events) {
      const flag = FLAG[e.type];
      if (flag && e.postId != null) {
        const [col, val] = flag; // col comes from the constant table above
        conn.prepare("INSERT OR IGNORE INTO viewer_state (post_id) VALUES (?)").run(e.postId);
        conn.prepare(`UPDATE viewer_state SET ${col} = ? WHERE post_id = ?`).run(val, e.postId);
        continue;
      }
      if (e.type !== "follow" && e.type !== "unfollow") continue;
      let handle = e.handle;
      if (!handle && e.postId != null) {
        handle = (conn.prepare("SELECT author FROM posts WHERE id = ?").get(e.postId) as
          | { author: string } | undefined)?.author;
      }
      const acct = handle
        ? (conn.prepare("SELECT handle FROM accounts WHERE handle = ?").get(handle) as
            | { handle: string } | undefined)
        : undefined;
      if (!acct || !me || acct.handle.toLowerCase() === me.toLowerCase()) continue;
      const d = e.type === "follow" ? 1 : -1;
      const res =
        d === 1
          ? conn.prepare("INSERT OR IGNORE INTO follows (handle) VALUES (?)").run(acct.handle)
          : conn.prepare("DELETE FROM follows WHERE handle = ?").run(acct.handle);
      if (Number(res.changes) === 0) continue;
      conn.prepare("UPDATE accounts SET followers = MAX(0, followers + ?) WHERE handle = ?").run(d, acct.handle);
      conn.prepare("UPDATE accounts SET following = MAX(0, following + ?) WHERE handle = ?").run(d, me);
    }
  });
}
