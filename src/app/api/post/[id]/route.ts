// GET /api/post/[id]: ancestors, the post, replies.
import { fail, intParam, ok } from "@/lib/feed-http";
import { getThread } from "@/lib/feed-world";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = intParam((await params).id);
  const thread = id == null ? null : getThread(id);
  return thread ? ok(thread) : fail(404, "Post not found.");
}
