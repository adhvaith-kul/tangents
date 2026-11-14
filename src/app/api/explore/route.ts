// GET /api/explore?q=&tab=for_you|trending|news|<a subject tab>
import { getExplore } from "@/lib/feed";
import { SUBJECT_TABS, type ExploreTab } from "@/lib/subjects";
import { ok } from "@/lib/feed-http";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const tab = params.get("tab") ?? "";
  const known: ExploreTab[] = ["for_you", "trending", "news", ...SUBJECT_TABS.map((t) => t.key)];
  return ok(
    getExplore((params.get("q") ?? "").trim().slice(0, 100), known.includes(tab as ExploreTab) ? (tab as ExploreTab) : "for_you"),
  );
}
