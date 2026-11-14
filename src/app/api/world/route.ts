// GET /api/world: the Behind the scenes data.
import { ok } from "@/lib/feed-http";
import { getWorld } from "@/lib/feed-world";

export async function GET() {
  return ok(getWorld());
}
