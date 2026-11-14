// Tiny helpers shared by the API route handlers. Server-only.
import type { NextResponse } from "next/server";
import { NextResponse as Res } from "next/server";

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
