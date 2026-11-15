// POST /api/post: the user publishes a post, reply or quote; a new post may carry a poll.
import { onBrokTag, tagsBrok } from "@/lib/brok";
import { createPost } from "@/lib/feed-actions";
import { fail, ok, readJson } from "@/lib/feed-http";
import { onUserPost } from "@/lib/sim";
import type { CreatePostResponse } from "@/lib/types";

export async function POST(req: Request) {
  const body = await readJson(req);
  if (!body) return fail(400, "Invalid request.");
  const r = createPost(body.text, body.replyTo, body.quoteOf, body.poll);
  if (!r.ok) return fail(r.status, r.error);
  // A post addressed to Brok gets Brok's answer, not a reaction from the world.
  if (tagsBrok(r.value.text)) onBrokTag(r.value.id);
  else onUserPost(r.value.id);
  return ok<CreatePostResponse>({ post: r.value });
}
