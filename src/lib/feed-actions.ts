// Writes behind the API routes: onboarding, posting, interaction state. Server-only.
import { db, now, tx, userHandle } from "./db";
import type { PostRow } from "./db";
import { CAST } from "./cast";
import { recordInteractions, recordUserPost, seedPref } from "./prefs";
import { INTERESTS } from "./interests";
import { getSettings, saveSettings } from "./settings";
import { insertPost } from "./write";
import { SUBJECTS, type Subject } from "./subjects";
import type { Account, Domain, InteractionEvent, Level, OnboardRequest, PostView, Settings, Tone } from "./types";
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
  const asked: unknown[] = Array.isArray(req.interests) ? req.interests : [];
  const domains: Domain[] = SUBJECTS.filter((s) => asked.includes(s));
  if (!domains.length) return bad(400, "Choose at least one interest.");
  if (userHandle()) return bad(409, "An account already exists.");
  // These would collide with the app's own routes at /<handle>.
  const reserved = [
    "explore", "post", "news", "markets", "notifications", "world", "settings", "messages", "calls", "brok", "i", "api",
    "avatars", "crowd", "headers", "logos", "memes",
  ];
  if (reserved.includes(handle.toLowerCase())) return bad(409, "That handle is already taken.");
  const taken = db().prepare("SELECT 1 FROM accounts WHERE handle = ?").get(handle);
  if (taken) return bad(409, "That handle is already taken.");

  const joined = new Date(now()).toLocaleString("en-US", { month: "long", year: "numeric" });
  // Within a subject, picking narrower interests follows their accounts and the
  // subject's outlets; picking none follows everyone in the subject.
  const picks = new Set(Array.isArray(req.picks) ? req.picks.filter((k): k is string => typeof k === "string") : []);
  const picked = domains.flatMap((d) => (d === "crossover" ? [] : INTERESTS[d].filter((i) => picks.has(i.key))));
  const narrowed = new Set(picked.map((i) => SUBJECTS.find((s) => INTERESTS[s].includes(i))));
  const wanted = new Set(picked.flatMap((i) => i.handles.map((h) => h.toLowerCase())));
  const follow = CAST.filter(
    (c) =>
      (c.kind === "figure" || c.kind === "outlet" || c.kind === "org") &&
      (wanted.has(c.handle.toLowerCase()) ||
        (domains.includes(c.domain) && (c.kind === "outlet" || !narrowed.has(c.domain as Subject)))),
  );
  tx(() => {
    db()
      .prepare(
        `INSERT INTO accounts (handle, name, bio, kind, domain, badge, followers, following, avatar, banner, location, joined)
         VALUES (?, ?, '', 'user', ?, NULL, 0, ?, NULL, '#333639', NULL, ?)`,
      )
      .run(handle, name, domains.length > 1 ? "crossover" : domains[0], follow.length, joined);
    const ins = db().prepare("INSERT OR IGNORE INTO follows (handle) VALUES (?)");
    for (const c of follow) ins.run(c.handle);
    for (const d of domains) seedPref("domain", d, 3);
    for (const h of wanted) seedPref("author", h, 2);
    for (const t of new Set(picked.flatMap((i) => i.topics))) seedPref("topic", t, 3);
    // Subjects left unpicked stay in the world, so stories can still cross over,
    // but rarely; picked ones are at least at their normal level.
    const current = getSettings();
    const dials: Partial<Settings> = {};
    for (const s of SUBJECTS) {
      dials[s] = (domains.includes(s) ? Math.max(current[s], 2) : Math.min(current[s], 1)) as Level;
    }
    saveSettings(dials);
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
 *  show it as unavailable, and the likes and reposts it collected go with it.
 *
 *  It also stops feeding the story. What others already posted, published or
 *  traded on stays, but a storyline the post started is closed, the facts and
 *  trends that came from it are dropped, and the simulation no longer sees the
 *  post or the replies under it (see NOT_UNDER_DELETED in sim/digest.ts). */
export function deletePost(id: number): Result<{ ok: true }> {
  const me = userHandle();
  if (!me) return bad(401, "Create an account first.");
  const row = db().prepare("SELECT author, deleted, storyline_id FROM posts WHERE id = ?").get(id) as
    | { author: string; deleted: number; storyline_id: number | null }
    | undefined;
  if (!row || row.deleted) return bad(404, "Post not found.");
  if (row.author.toLowerCase() !== me.toLowerCase()) return bad(403, "You can only delete your own posts.");
  tx(() => {
    db().prepare("UPDATE posts SET deleted = 1 WHERE id = ?").run(id);
    db().prepare("DELETE FROM notifications WHERE target_post_id = ?").run(id);
    db().prepare("DELETE FROM viewer_state WHERE post_id = ?").run(id);
    db().prepare("DELETE FROM reposts WHERE post_id = ?").run(id);

    const sl = row.storyline_id;
    if (sl != null) {
      // What that storyline remembers about the user came from this post.
      db()
        .prepare(
          `DELETE FROM facts WHERE storyline_id = ?
             AND EXISTS (SELECT 1 FROM json_each(facts.subjects) WHERE LOWER(value) = LOWER(?))`,
        )
        .run(sl, me);
      const story = db().prepare("SELECT origin FROM storylines WHERE id = ?").get(sl) as { origin: string } | undefined;
      const others = db()
        .prepare("SELECT COUNT(*) AS n FROM posts WHERE storyline_id = ? AND author = ? AND deleted = 0")
        .get(sl, me) as { n: number };
      // A storyline the user's post started ends with the post, unless another of their posts still carries it.
      if (story?.origin === "user" && others.n === 0) {
        db().prepare("UPDATE storylines SET status = 'dormant' WHERE id = ?").run(sl);
        db().prepare("DELETE FROM facts WHERE storyline_id = ?").run(sl);
        db().prepare("DELETE FROM trends WHERE storyline_id = ?").run(sl);
      }
    }
  });
  return { ok: true, value: { ok: true } };
}

const VALID = new Set([
  "like", "unlike", "repost", "unrepost", "bookmark", "unbookmark", "dwell", "skip", "open",
  "profile", "not_interested", "show_less", "follow", "unfollow",
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
        if (me && e.type === "repost") {
          conn
            .prepare(
              `INSERT OR IGNORE INTO reposts (account, post_id, created_at)
               SELECT ?, id, ? FROM posts WHERE id = ? AND deleted = 0`,
            )
            .run(me, now(), e.postId);
        } else if (me && e.type === "unrepost") {
          conn.prepare("DELETE FROM reposts WHERE account = ? AND post_id = ?").run(me, e.postId);
        }
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
