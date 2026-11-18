// POST /api/auth/logout
import { cookies } from "next/headers";
import { deleteSession, SESSION_COOKIE } from "@/lib/auth";
import { ok } from "@/lib/feed-http";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    deleteSession(token);
    cookieStore.delete(SESSION_COOKIE);
  }
  return ok({ success: true });
}
