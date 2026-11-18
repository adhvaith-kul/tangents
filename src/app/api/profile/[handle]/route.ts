// GET /api/profile/[handle]?tab=posts|replies
import { fail, ok, withUserContext } from "@/lib/feed-http";
import { getProfile } from "@/lib/feed-world";

export async function GET(req: Request, { params }: { params: Promise<{ handle: string }> }) {
  return withUserContext(req, async () => {
    const { handle } = await params;
    const tab = new URL(req.url).searchParams.get("tab") === "replies" ? "replies" : "posts";
    const res = getProfile(decodeURIComponent(handle).replace(/^@/, ""), tab);
    return res ? ok(res) : fail(404, "Account not found.");
  });
}
