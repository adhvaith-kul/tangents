// GET /api/markets: every ticker plus the story-driven moves so far.
import { recentMoves, stockViews } from "@/lib/stocks";
import type { MarketsResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export function GET() {
  const body: MarketsResponse = { stocks: stockViews(), moves: recentMoves(30) };
  return Response.json(body);
}
