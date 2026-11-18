// POST /api/auth/login
import { cookies } from "next/headers";
import { authDb, createSession, SESSION_COOKIE, verifyPassword } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/feed-http";
import { checkRateLimit } from "@/lib/guardrails";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  const limit = checkRateLimit(`login:${ip}`, 5, 0.2); // max 5 attempts per burst
  if (!limit.ok) {
    return fail(429, "Too many login attempts. Please wait a moment.");
  }

  const body = await readJson(req);
  if (!body) return fail(400, "Invalid JSON.");

  const identifier = typeof body.identifier === "string" ? body.identifier.trim().replace(/^@/, "") : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!identifier || !password) {
    return fail(400, "Please provide your handle/email and password.");
  }

  const user = authDb()
    .prepare(
      "SELECT id, handle, name, email, password_hash, password_salt FROM users WHERE LOWER(handle) = LOWER(?) OR (email IS NOT NULL AND LOWER(email) = LOWER(?))"
    )
    .get(identifier, identifier) as
    | { id: number; handle: string; name: string; email: string | null; password_hash: string; password_salt: string }
    | undefined;

  if (!user || !verifyPassword(password, user.password_hash, user.password_salt)) {
    return fail(401, "Invalid handle/email or password.");
  }

  // Create session
  const session = createSession(user.handle);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 3600,
  });

  return ok({
    success: true,
    user: {
      handle: user.handle,
      name: user.name || user.handle,
      email: user.email,
    },
  });
}
