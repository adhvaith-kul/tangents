// POST /api/auth/signup
import { cookies } from "next/headers";
import { createSession, hashPassword, SESSION_COOKIE } from "@/lib/auth";
import { db, now } from "@/lib/db";
import { fail, ok, readJson } from "@/lib/feed-http";
import { checkRateLimit } from "@/lib/guardrails";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  const limit = checkRateLimit(`auth:${ip}`, 5, 0.2); // 5 attempts per burst
  if (!limit.ok) {
    return fail(429, "Too many requests. Please wait a moment.");
  }

  const body = await readJson(req);
  if (!body) return fail(400, "Invalid JSON.");

  const handle = typeof body.handle === "string" ? body.handle.trim().replace(/^@/, "") : "";
  const password = typeof body.password === "string" ? body.password : "";
  const email = typeof body.email === "string" && body.email.trim() ? body.email.trim() : null;

  if (!/^[a-zA-Z0-9_]{1,15}$/.test(handle)) {
    return fail(400, "Handle must be 1 to 15 letters, digits, or underscores.");
  }

  if (password.length < 6) {
    return fail(400, "Password must be at least 6 characters.");
  }

  // Check if handle is taken in users or accounts
  const existing = db()
    .prepare("SELECT 1 FROM users WHERE LOWER(handle) = LOWER(?)")
    .get(handle);
  if (existing) {
    return fail(409, "That handle is already registered.");
  }

  const { hash, salt } = hashPassword(password);
  const t = now();

  db()
    .prepare(
      "INSERT INTO users (handle, email, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(handle, email, hash, salt, t);

  // Create session and set cookie
  const session = createSession(handle);
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
      handle,
      email,
    },
  });
}
