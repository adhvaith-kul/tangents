// GET /api/worlds: the saved worlds, and the world on screen.
// POST /api/worlds { save: name } | { load: name } | { remove: name } | { rename: name, to: name }.
import { currentWorld, deleteWorld, listWorlds, renameWorld, validWorldName } from "@/lib/db";
import { simAction, simLoadWorld, simSaveWorld } from "@/lib/sim";

export const dynamic = "force-dynamic";

const fail = (status: number, error: string) => Response.json({ error }, { status });
const NAME_RULE = "Use letters, digits, spaces, hyphens or underscores, 40 characters at most.";

/** Every answer carries the same picture: the saved worlds and the one on screen. */
const state = () => ({ worlds: listWorlds(), here: currentWorld() });

export function GET() {
  return Response.json(state());
}

export async function POST(req: Request) {
  let body: { save?: unknown; load?: unknown; remove?: unknown; rename?: unknown; to?: unknown };
  try {
    body = ((await req.json()) ?? {}) as typeof body;
  } catch {
    return fail(400, "Invalid request.");
  }
  const name = body.save ?? body.load ?? body.remove ?? body.rename;
  if (!validWorldName(name)) return fail(400, NAME_RULE);
  try {
    if (body.save !== undefined) {
      simSaveWorld(name);
      return Response.json(state());
    }
    if (body.load !== undefined) {
      const sim = await simLoadWorld(name);
      return Response.json({ ...state(), sim });
    }
    if (body.rename !== undefined) {
      if (!validWorldName(body.to)) return fail(400, NAME_RULE);
      if (!renameWorld(name, body.to)) return fail(409, "That name is taken, or the world is gone.");
      return Response.json(state());
    }
    const onScreen = currentWorld().name?.toLowerCase() === name.trim().toLowerCase();
    if (!deleteWorld(name)) return fail(404, "There is no saved world by that name.");
    // Deleting the world on screen ends it: sign-up, where the others can be opened.
    if (onScreen) await simAction("reset");
    return Response.json(state());
  } catch (err) {
    return fail(409, err instanceof Error ? err.message : String(err));
  }
}
