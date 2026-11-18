// User authentication and session management.
// Server-only: uses Node native crypto for secure password hashing and token generation.
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db, now } from "./db";

export const SESSION_COOKIE = "tangents_session";
const SESSION_TTL_MS = 30 * 24 * 3600_000; // 30 days

export interface AuthUser {
  id: number;
  handle: string;
  email: string | null;
  createdAt: number;
}

export interface SessionData {
  token: string;
  userHandle: string;
  expiresAt: number;
}

/** Hash a password using PBKDF2 with a random 16-byte salt */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100_000, 64, "sha512").toString("hex");
  return { hash, salt };
}

/** Verify a password against an existing hash and salt */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const check = crypto.pbkdf2Sync(password, salt, 100_000, 64, "sha512").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(check, "hex"));
}

/** Generate a secure 32-byte session token */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Create a session in the database */
export function createSession(userHandle: string): SessionData {
  const token = generateSessionToken();
  const t = now();
  const expiresAt = t + SESSION_TTL_MS;

  db()
    .prepare(
      "INSERT INTO sessions (token, user_handle, expires_at, created_at) VALUES (?, ?, ?, ?)"
    )
    .run(token, userHandle, expiresAt, t);

  return { token, userHandle, expiresAt };
}

/** Validate a session token */
export function getSession(token: string): SessionData | null {
  if (!token) return null;
  const t = now();
  const row = db()
    .prepare(
      "SELECT token, user_handle, expires_at FROM sessions WHERE token = ? AND expires_at > ?"
    )
    .get(token, t) as { token: string; user_handle: string; expires_at: number } | undefined;

  if (!row) return null;
  return { token: row.token, userHandle: row.user_handle, expiresAt: row.expires_at };
}

/** Invalidate/delete a session */
export function deleteSession(token: string): void {
  db().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

/** Get the currently authenticated user from Next.js request cookies */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const session = getSession(token);
    if (!session) return null;

    const row = db()
      .prepare("SELECT id, handle, email, created_at FROM users WHERE LOWER(handle) = LOWER(?)")
      .get(session.userHandle) as { id: number; handle: string; email: string | null; created_at: number } | undefined;

    if (!row) return null;
    return {
      id: row.id,
      handle: row.handle,
      email: row.email,
      createdAt: row.created_at,
    };
  } catch {
    return null;
  }
}
