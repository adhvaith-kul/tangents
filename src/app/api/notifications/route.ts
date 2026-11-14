// GET /api/notifications: the 50 newest visible, then marks them read.
import { ok } from "@/lib/feed-http";
import { getNotifications } from "@/lib/feed-world";
import type { NotificationsResponse } from "@/lib/types";

export async function GET() {
  return ok<NotificationsResponse>({ notifications: getNotifications() });
}
