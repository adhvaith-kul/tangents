// POST /api/post: the user publishes a post, reply or quote.
import { createPost } from "@/lib/feed-actions";
import { fail, ok, readJson } from "@/lib/feed-http";
import { onUserPost } from "@/lib/sim";
import type { CreatePostResponse } from "@/lib/types";

export async function POST(req: Request) {
  const body = await readJson(req);
  if (!body) return fail(400, "Invalid request.");
  const r = createPost(body.text, body.replyTo, body.quoteOf);
  if (!r.ok) return fail(r.status, r.error);
  onUserPost(r.value.id);
  return ok<CreatePostResponse>({ post: r.value });
}
