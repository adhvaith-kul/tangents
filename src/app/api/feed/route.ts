// GET /api/feed?tab=foryou|following&cursor=&after=
import { heartbeat } from "@/lib/sim";
import { getFeed } from "@/lib/feed";
import { intParam, ok, withUserContext } from "@/lib/feed-http";

export async function GET(req: Request) {
  return withUserContext(req, () => {
    heartbeat();
    const q = new URL(req.url).searchParams;
    const tab = q.get("tab") === "following" ? "following" : "foryou";
    return ok(getFeed(tab, intParam(q.get("cursor")), intParam(q.get("after"))));
  });
}
