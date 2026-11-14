// GET /api/explore?q=
import { getExplore } from "@/lib/feed";
import { ok } from "@/lib/feed-http";

export async function GET(req: Request) {
  return ok(getExplore((new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 100)));
}
