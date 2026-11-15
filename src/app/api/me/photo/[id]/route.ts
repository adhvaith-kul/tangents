// GET /api/me/photo/:id: a profile or banner picture the reader uploaded.
import { fail } from "@/lib/feed-http";
import { photo } from "@/lib/profile";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const found = photo(id);
  if (!found) return fail(404, "Not found.");
  // A new upload gets a new id, so a picture at this address never changes.
  return new Response(new Uint8Array(found.bytes), {
    headers: { "content-type": found.type, "cache-control": "private, max-age=31536000, immutable" },
  });
}
