// GET /api/sidebar
import { getSidebar } from "@/lib/feed";
import { ok } from "@/lib/feed-http";
import { heartbeat } from "@/lib/sim";

export async function GET() {
  heartbeat();
  return ok(getSidebar());
}
