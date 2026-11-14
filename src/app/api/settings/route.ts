// GET /api/settings: the content settings. POST: a partial Settings to save,
// { reset: true } for the defaults, { resetTaste: true } to clear what
// personalisation has learned (prefs and interactions, not viewer_state).
import { db } from "@/lib/db";
import { getSettings, saveSettings } from "@/lib/settings";
import { DEFAULT_SETTINGS } from "@/lib/types";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(getSettings());
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    const parsed = (await req.json()) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (body.resetTaste === true) {
    db().exec("DELETE FROM prefs; DELETE FROM interactions;");
    return Response.json(getSettings());
  }
  if (body.reset === true) return Response.json(saveSettings({ ...DEFAULT_SETTINGS }));
  return Response.json(saveSettings(body));
}
