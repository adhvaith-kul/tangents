// POST /api/brok { ask, postId? }: the reader asks Brok something, optionally
// about one post. The answer comes back to the page; nothing is posted.
import { askBrok } from "@/lib/brok";
import { userHandle } from "@/lib/db";
import { checkRateLimit } from "@/lib/guardrails";
import { withUserContext } from "@/lib/feed-http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return withUserContext(req, async () => {
    const ip = req.headers.get("x-forwarded-for") || "local";
    const limit = checkRateLimit(`brok:${ip}`, 10, 0.33); // 10 burst, 1 every 3 seconds
    if (!limit.ok) {
      return Response.json({ error: "Too many questions. Please slow down." }, { status: 429 });
    }
    let ask = "";
    let postId: number | null = null;
    try {
      const body = (await req.json()) as { ask?: unknown; postId?: unknown } | null;
      if (typeof body?.ask === "string") ask = body.ask;
      if (Number.isInteger(body?.postId)) postId = body?.postId as number;
    } catch {
      return Response.json({ error: "Invalid request." }, { status: 400 });
    }
    if (!userHandle()) return Response.json({ error: "Create an account first." }, { status: 409 });
    if (!ask.trim() && postId == null) return Response.json({ error: "Ask something." }, { status: 400 });
    try {
      return Response.json({ answer: await askBrok(ask, postId) });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Our own messages are short sentences; anything else is a failed model call.
      const ours = /^(Ask something|That post|Brok had)/.test(message);
      return Response.json({ error: ours ? message : "Brok could not answer just now. Try again." }, { status: ours ? 409 : 502 });
    }
  });
}
