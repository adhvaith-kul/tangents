// GET /api/post/[id]: ancestors, the post, replies. DELETE: remove your own post.
import { deletePost } from "@/lib/feed-actions";
import { fail, intParam, ok } from "@/lib/feed-http";
import { getThread } from "@/lib/feed-world";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = intParam((await params).id);
  if (id == null) return fail(404, "Post not found.");
  const res = deletePost(id);
  return res.ok ? ok(res.value) : fail(res.status, res.error);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = intParam((await params).id);
  const thread = id == null ? null : getThread(id);
  return thread ? ok(thread) : fail(404, "Post not found.");
}
