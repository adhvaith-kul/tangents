// GET /api/explore?q=&tab=for_you|trending|news|sports|entertainment
import { getExplore, type ExploreTab } from "@/lib/feed";
import { ok } from "@/lib/feed-http";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const tab = params.get("tab") ?? "";
  const known: ExploreTab[] = ["for_you", "trending", "news", "sports", "entertainment"];
  return ok(
    getExplore((params.get("q") ?? "").trim().slice(0, 100), known.includes(tab as ExploreTab) ? (tab as ExploreTab) : "for_you"),
  );
}
