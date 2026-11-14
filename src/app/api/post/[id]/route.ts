// GET /api/post/[id]: ancestors, the post, replies. DELETE: remove your own post.
import { deletePost } from "@/lib/feed-actions";
import { fail, intParam, ok } from "@/lib/feed-http";
import { getThread } from "@/lib/feed-world";
import { onOpenPost } from "@/lib/sim";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = intParam((await params).id);
  if (id == null) return fail(404, "Post not found.");
  const res = deletePost(id);
  return res.ok ? ok(res.value) : fail(res.status, res.error);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = intParam((await params).id);
  const thread = id == null ? null : getThread(id);
  if (!thread) return fail(404, "Post not found.");
  // A thin thread fills in while the user reads it. The page polls, so this
  // runs once per post (the engine remembers) rather than on every request.
  onOpenPost(thread.post.id);
  return ok(thread);
}
