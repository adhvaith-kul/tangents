// GET /api/auth/me
import { getAuthUser } from "@/lib/auth";
import { ok } from "@/lib/feed-http";

export async function GET() {
  const user = await getAuthUser();
  return ok({ user });
}
