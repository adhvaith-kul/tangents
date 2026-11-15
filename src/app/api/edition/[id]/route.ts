// GET /api/edition/[id]: The Arc's edition behind a published page (the article id).
import { fail, intParam, ok } from "@/lib/feed-http";
import { getEdition } from "@/lib/paper";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = intParam((await params).id);
  const res = id == null ? null : getEdition(id);
  return res ? ok(res) : fail(404, "Edition not found.");
}
