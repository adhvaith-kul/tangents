// GET /api/usage: tokens and model calls so far today, for the Settings screen.
import { usageSummary } from "@/lib/usage";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(usageSummary());
}
