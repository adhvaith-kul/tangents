// GET /api/ripple?storyline=ID: one storyline's origin and everything it caused.
import { fail, intParam, ok } from "@/lib/feed-http";
import { getRipple } from "@/lib/ripple";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const id = intParam(new URL(req.url).searchParams.get("storyline"));
  if (id == null) return fail(400, "storyline is required");
  const ripple = getRipple(id);
  return ripple.storyline ? ok(ripple) : fail(404, "No such storyline");
}
