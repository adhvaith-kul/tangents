// GET /api/sim: simulation status. POST /api/sim { action }: control the simulation.
import { heartbeat, simAction, simStatus } from "@/lib/sim";
import type { SimAction } from "@/lib/types";

export const dynamic = "force-dynamic";

const ACTIONS: SimAction[] = ["pause", "resume", "tick", "skip_day", "save", "restore", "reset"];

export function GET() {
  heartbeat();
  return Response.json(simStatus());
}

export async function POST(req: Request) {
  let action: unknown;
  try {
    action = ((await req.json()) as { action?: unknown } | null)?.action;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof action !== "string" || !ACTIONS.includes(action as SimAction)) {
    return Response.json({ error: "Unknown action." }, { status: 400 });
  }
  heartbeat();
  try {
    return Response.json(await simAction(action as SimAction));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 409 });
  }
}
