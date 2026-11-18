// GET /api/markets: every ticker plus the story-driven moves so far.
import { recentMoves, stockViews } from "@/lib/stocks";
import type { MarketsResponse } from "@/lib/types";
import { withUserContext } from "@/lib/feed-http";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return withUserContext(req, () => {
    const body: MarketsResponse = { stocks: stockViews(), moves: recentMoves(30) };
    return Response.json(body);
  });
}
