// GET /api/sim: simulation status. POST /api/sim { action }: control the simulation.
// POST /api/sim { pace }: change how fast the world moves.
import { heartbeat, simAction, simPace, simStatus, simWhatIf } from "@/lib/sim";
import { PACES, type Pace, type SimAction } from "@/lib/types";

export const dynamic = "force-dynamic";

const ACTIONS: SimAction[] = ["pause", "resume", "tick", "skip_day", "save", "restore", "reset"];

export function GET() {
  heartbeat();
  return Response.json(simStatus());
}

export async function POST(req: Request) {
  let action: unknown;
  let pace: unknown;
  let whatIf: unknown;
  try {
    const body = (await req.json()) as { action?: unknown; pace?: unknown; whatIf?: unknown } | null;
    action = body?.action;
    pace = body?.pace;
    whatIf = body?.whatIf;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (action === undefined && typeof pace === "string" && PACES.includes(pace as Pace)) {
    return Response.json(simPace(pace as Pace));
  }
  if (action === undefined && typeof whatIf === "string") {
    heartbeat();
    try {
      return Response.json(simWhatIf(whatIf));
    } catch (err) {
      return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 409 });
    }
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
