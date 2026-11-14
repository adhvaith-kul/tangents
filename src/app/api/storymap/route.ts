// GET /api/storymap: the story beats the world has written, for the Story map.
import { ok } from "@/lib/feed-http";
import { getStoryMap } from "@/lib/storymap";

export const dynamic = "force-dynamic";

export function GET() {
  return ok(getStoryMap());
}
