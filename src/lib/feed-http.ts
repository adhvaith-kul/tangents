// Tiny helpers shared by the API route handlers. Server-only.
import type { NextResponse } from "next/server";
import { NextResponse as Res } from "next/server";
import { getSession } from "./auth";
import { runWithUser } from "./db";

export function ok<T>(body: T): NextResponse {
  return Res.json(body);
}

export function fail(status: number, error: string): NextResponse {
  return Res.json({ error }, { status });
}

/** Parsed JSON body, or null when it is missing or malformed. */
export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const v = await req.json();
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function intParam(s: string | null | undefined): number | null {
  if (s == null || s === "" || !/^-?\d+$/.test(s)) return null;
  return Number(s);
}

/** Extract the authenticated user's handle from the request cookie */
export function getUserHandleFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/tangents_session=([^;]+)/);
  if (!match) return null;
  const token = decodeURIComponent(match[1].trim());
  const session = getSession(token);
  return session ? session.userHandle : null;
}

/** Execute a route handler scoped to the caller's isolated sandbox */
export function withUserContext<T>(req: Request, handler: () => Promise<T> | T): Promise<T> {
  const handle = getUserHandleFromRequest(req);
  if (handle) {
    return runWithUser(handle, () => Promise.resolve(handler()));
  }
  return Promise.resolve(handler());
}
