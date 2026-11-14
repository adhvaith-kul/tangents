// POST /api/interact: engagement events (taste signals and like / repost / follow state).
import { applyInteractions, interact } from "@/lib/feed-actions";
import { fail, ok, readJson } from "@/lib/feed-http";

export async function POST(req: Request) {
  const body = await readJson(req);
  const events = body ? applyInteractions(body.events) : null;
  if (!events) return fail(400, "Expected { events: [...] }.");
  interact(events);
  return ok({ ok: true as const });
}
