// The only functions that insert posts and notifications, shared by the
// simulation engine and the user's own posting route.
// FROZEN after phase 1. Server-only.
import { db, type PostRow } from "./db";
import { targetsFor } from "./engagement";
import type { Domain, NotificationType, PostMedia, Tone } from "./types";

export interface NewPost {
  author: string;
  text: string;
  createdAt: number; // simulation ms; a future time schedules the post
  replyTo?: number | null;
  quoteOf?: number | null;
  articleId?: number | null;
  storylineId?: number | null;
  domain?: Domain | null;
  tone?: Tone | null;
  topics?: string[];
  heat?: number;
  media?: PostMedia | null;
}

/** Insert a post and return its id. Thread root and engagement targets are derived here. */
export function insertPost(p: NewPost): number {
  const conn = db();
  let rootId: number | null = null;
  if (p.replyTo != null) {
    const parent = conn.prepare("SELECT id, root_id FROM posts WHERE id = ?").get(p.replyTo) as
      | Pick<PostRow, "id" | "root_id">
      | undefined;
    if (parent) rootId = parent.root_id ?? parent.id;
  }
  const author = conn.prepare("SELECT followers FROM accounts WHERE handle = ?").get(p.author) as
    | { followers: number }
    | undefined;
  const heat = p.heat ?? 3;
  const t = targetsFor(author?.followers ?? 100, heat);
  const res = conn
    .prepare(
      `INSERT INTO posts (author, text, created_at, reply_to, root_id, quote_of, article_id, storyline_id,
                          domain, tone, topics, heat, t_likes, t_reposts, t_replies, t_views, media)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      p.author, p.text, p.createdAt, p.replyTo ?? null, rootId, p.quoteOf ?? null,
      p.articleId ?? null, p.storylineId ?? null, p.domain ?? null, p.tone ?? null,
      JSON.stringify(p.topics ?? []), heat, t.likes, t.reposts, t.replies, t.views,
      p.media ? JSON.stringify(p.media) : null,
    );
  return Number(res.lastInsertRowid);
}

export interface NewNotification {
  type: NotificationType;
  actor: string;
  postId?: number | null; // the reply / quote / mention
  targetPostId?: number | null; // the user's post that was liked / reposted
  count?: number;
  createdAt: number; // simulation ms; a future time delays the notification
}

export function insertNotification(n: NewNotification): number {
  const res = db()
    .prepare(
      `INSERT INTO notifications (type, actor, post_id, target_post_id, count, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(n.type, n.actor, n.postId ?? null, n.targetPostId ?? null, n.count ?? 1, n.createdAt);
  return Number(res.lastInsertRowid);
}
