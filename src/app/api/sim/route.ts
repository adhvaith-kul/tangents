// GET /api/sim: simulation status. POST /api/sim { action }: control the simulation.
// POST /api/sim { pace }: change how fast the world moves.
// POST /api/sim { whatIf, storylineId? }: propose a premise, optionally as the next
// development of one storyline. POST /api/sim { wrap: storylineId }: bring one to a close.
// POST /api/sim { breaking: "surprise" | "scandal" | "national" | "global" }: start a major event.
import { heartbeat, simAction, simBreaking, simPace, simStatus, simWhatIf, simWrap } from "@/lib/sim";
import { PACES, type Pace, type SimAction } from "@/lib/types";
import { checkRateLimit, isLlmBudgetExceeded } from "@/lib/guardrails";
import { withUserContext } from "@/lib/feed-http";

export const dynamic = "force-dynamic";

const ACTIONS: SimAction[] = ["pause", "resume", "tick", "skip_day", "save", "restore", "reset"];

export function GET(req: Request) {
  return withUserContext(req, () => {
    heartbeat();
    return Response.json(simStatus());
  });
}

export async function POST(req: Request) {
  return withUserContext(req, async () => {
    const ip = req.headers.get("x-forwarded-for") || "local";
    const rateLimit = checkRateLimit(`sim:${ip}`, 12, 1);
    if (!rateLimit.ok) {
      return Response.json({ error: "Too many simulation requests. Please slow down." }, { status: 429 });
    }

    const budget = isLlmBudgetExceeded();
    if (budget.exceeded) {
      return Response.json(
        { error: `Daily LLM safety budget reached (${Math.round(budget.usedTokens / 1000)}k / ${Math.round(budget.limit / 1000)}k tokens). Paused to protect costs.` },
        { status: 429 }
      );
    }
    let action: unknown;
    let pace: unknown;
    let whatIf: unknown;
    let storylineId: number | null = null;
    let wrap: number | null = null;
    let breaking: unknown;
    try {
      const body = (await req.json()) as
        | { action?: unknown; pace?: unknown; whatIf?: unknown; storylineId?: unknown; wrap?: unknown; breaking?: unknown }
        | null;
      action = body?.action;
      pace = body?.pace;
      whatIf = body?.whatIf;
      storylineId = Number.isInteger(body?.storylineId) ? (body?.storylineId as number) : null;
      wrap = Number.isInteger(body?.wrap) ? (body?.wrap as number) : null;
      breaking = body?.breaking;
    } catch {
      return Response.json({ error: "Invalid request." }, { status: 400 });
    }
    if (action === undefined && typeof pace === "string" && PACES.includes(pace as Pace)) {
      return Response.json(simPace(pace as Pace));
    }
    if (action === undefined && typeof whatIf === "string") {
      heartbeat();
      try {
        return Response.json(simWhatIf(whatIf, storylineId));
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 409 });
      }
    }
    if (action === undefined && wrap != null) {
      heartbeat();
      try {
        return Response.json(simWrap(wrap));
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 409 });
      }
    }
    if (action === undefined && breaking !== undefined) {
      heartbeat();
      try {
        return Response.json(simBreaking(breaking));
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
  });
}
