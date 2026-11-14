// POST /api/poll { postId, option }: cast the user's vote in a poll.
import { fail, ok, readJson } from "@/lib/feed-http";
import { votePoll } from "@/lib/polls";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await readJson(req);
  const postId = body?.postId;
  const option = body?.option;
  if (typeof postId !== "number" || !Number.isInteger(postId) || typeof option !== "number") {
    return fail(400, "Expected { postId, option }.");
  }
  const res = votePoll(postId, option);
  return "error" in res ? fail(res.status, res.error) : ok({ poll: res.poll });
}
