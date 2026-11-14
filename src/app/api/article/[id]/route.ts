// GET /api/article/[id]
import { fail, intParam, ok } from "@/lib/feed-http";
import { getArticle } from "@/lib/feed-world";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = intParam((await params).id);
  const res = id == null ? null : getArticle(id);
  return res ? ok(res) : fail(404, "Article not found.");
}
