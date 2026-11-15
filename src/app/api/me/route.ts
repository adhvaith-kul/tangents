// GET /api/me, POST /api/me (onboarding), PATCH /api/me (edit profile).
import { userHandle } from "@/lib/db";
import { heartbeat } from "@/lib/sim";
import { onboard } from "@/lib/feed-actions";
import { fail, ok, readJson } from "@/lib/feed-http";
import { updateProfile } from "@/lib/profile";
import type { EditProfileRequest, MeResponse, OnboardRequest } from "@/lib/types";
import { accountView } from "@/lib/views";

function me(): MeResponse {
  const h = userHandle();
  return { user: h ? accountView(h) : null };
}

export async function GET() {
  return ok(me());
}

export async function POST(req: Request) {
  const body = await readJson(req);
  if (!body) return fail(400, "Invalid request.");
  const r = onboard(body as Partial<OnboardRequest>);
  if (!r.ok) return fail(r.status, r.error);
  heartbeat();
  return ok(me());
}

export async function PATCH(req: Request) {
  const body = await readJson(req);
  if (!body) return fail(400, "Invalid request.");
  const r = updateProfile(body as Partial<EditProfileRequest>);
  if (!r.ok) return fail(r.status, r.error);
  return ok(me());
}
