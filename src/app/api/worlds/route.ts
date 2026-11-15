// GET /api/worlds: the saved worlds. POST /api/worlds { save: name } | { load: name } | { remove: name }.
import { deleteWorld, listWorlds, validWorldName } from "@/lib/db";
import { simLoadWorld, simSaveWorld } from "@/lib/sim";

export const dynamic = "force-dynamic";

const fail = (status: number, error: string) => Response.json({ error }, { status });

export function GET() {
  return Response.json({ worlds: listWorlds() });
}

export async function POST(req: Request) {
  let body: { save?: unknown; load?: unknown; remove?: unknown };
  try {
    body = ((await req.json()) ?? {}) as typeof body;
  } catch {
    return fail(400, "Invalid request.");
  }
  const name = body.save ?? body.load ?? body.remove;
  if (!validWorldName(name)) return fail(400, "Use letters, digits, spaces, hyphens or underscores, 40 characters at most.");
  try {
    if (body.save !== undefined) return Response.json({ worlds: simSaveWorld(name) });
    if (body.load !== undefined) {
      const sim = await simLoadWorld(name);
      return Response.json({ worlds: listWorlds(), sim });
    }
    if (!deleteWorld(name)) return fail(404, "There is no saved world by that name.");
    return Response.json({ worlds: listWorlds() });
  } catch (err) {
    return fail(409, err instanceof Error ? err.message : String(err));
  }
}
