// The only functions that insert posts and notifications, shared by the
// simulation engine and the user's own posting route.
// Server-only.
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
  /** Kind of humour or remark, for a labelled reply. */
  style?: string | null;
  /** Set together: the language name in English and the English translation of `text`. */
  lang?: string | null;
  translation?: string | null;
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
                          domain, tone, topics, heat, t_likes, t_reposts, t_replies, t_views, media, style, lang, translation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      p.author, p.text, p.createdAt, p.replyTo ?? null, rootId, p.quoteOf ?? null,
      p.articleId ?? null, p.storylineId ?? null, p.domain ?? null, p.tone ?? null,
      JSON.stringify(p.topics ?? []), heat, t.likes, t.reposts, t.replies, t.views,
      p.media ? JSON.stringify(p.media) : null,
      p.style ?? null,
      p.lang ?? null, p.translation ?? null,
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
