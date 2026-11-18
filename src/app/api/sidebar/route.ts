// GET /api/sidebar
import { getSidebar } from "@/lib/feed";
import { ok, withUserContext } from "@/lib/feed-http";
import { getTodaysNews } from "@/lib/feed-world";
import { heartbeat } from "@/lib/sim";

export async function GET(req: Request) {
  return withUserContext(req, () => {
    heartbeat();
    return ok({ ...getSidebar(), news: getTodaysNews() });
  });
}
