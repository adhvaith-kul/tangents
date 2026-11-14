// GET /api/notifications: the 50 newest visible, then marks them read.
import { ok } from "@/lib/feed-http";
import { getNotifications } from "@/lib/feed-world";

export async function GET() {
  return ok({ notifications: getNotifications() });
}
