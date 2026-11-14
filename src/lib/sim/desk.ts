// The news desk: keeps real news flowing into a world that has diverged from
// reality. Each fresh real headline is compared with what this world has
// established and marked as new, as continuing an open storyline, or as
// conflicting with it. A conflicting headline is rewritten to fit: the world's
// own history always wins. One cheap model call per batch, run when headlines
// refresh, never during a tick.
import { db, tx } from "../db";
import { generate } from "../llm";
import { DeskSchema } from "../schemas";
import { recentResults } from "../sports";

const BATCH = 24;

const SYSTEM = `You run the news desk of a simulated world. The world began from real events and has since developed its own history, recorded in a ledger of facts and a set of open storylines. Real headlines keep arriving. Your job is to say how each one fits this world, so that real news keeps feeding it without contradicting what has already happened here.

For each headline choose one relation:
- "new": about something this world has not touched. The premise is the headline, lightly cleaned up.
- "continues": a development in one of the open storylines, consistent with the ledger. Give the storyline's number. The premise states the development as it applies here.
- "conflicts": contradicts the ledger or an open storyline (in this world something different has already happened to the same people or company). Give the storyline's number if there is one. Rewrite the premise so that the same kind of thing happens in a way that fits this world: keep who is involved and what is at stake, change what must change. The world's history always wins; never undo a fact in the ledger.
- "skip": cannot be made to fit, duplicates another headline in the list, or is about a death, a killing, sexual content, children, self-harm or serious illness.

The premise is one plain sentence in the style of a news headline. Do not add drama; a later writer does that. Return one item for every headline you were given.`;

let running = false;

/** Run the desk when few assessed headlines are left to offer the director. */
export function deskIfLow(): void {
  try {
    const left = db()
      .prepare("SELECT COUNT(*) AS n FROM headlines WHERE used = 0 AND relation IN ('new', 'continues', 'conflicts')")
      .get() as { n: number };
    if (left.n < 12) void runDesk();
  } catch (err) {
    console.error("[sim] news desk check failed:", err);
  }
}

/** Classify headlines the desk has not seen yet. Returns how many it handled. Never throws. */
export async function runDesk(): Promise<number> {
  if (running) return 0;
  running = true;
  try {
    const conn = db();
    const fresh = conn
      .prepare(
        `SELECT id, source, title, domain FROM headlines
         WHERE used = 0 AND relation IS NULL
         ORDER BY COALESCE(published_at, fetched_at) DESC, id DESC LIMIT ?`,
      )
      .all(BATCH) as { id: number; source: string; title: string; domain: string }[];
    if (!fresh.length) return 0;
    const stories = conn
      .prepare("SELECT id, title, summary FROM storylines WHERE status = 'open' ORDER BY updated_at DESC LIMIT 8")
      .all() as { id: number; title: string; summary: string }[];
    // A new world has nothing to contradict: everything is new.
    if (!stories.length) {
      conn.prepare("UPDATE headlines SET relation = 'new' WHERE used = 0 AND relation IS NULL").run();
      return fresh.length;
    }
    const facts = conn.prepare("SELECT text FROM facts ORDER BY id DESC LIMIT 40").all() as { text: string }[];
    const results = recentResults();
    const user = [
      `OPEN STORYLINES:\n${stories.map((s) => `#${s.id} ${s.title}\n  ${s.summary}`).join("\n")}`,
      `LEDGER (established in this world, newest first):\n${facts.map((f) => `- ${f.text}`).join("\n")}`,
      // Scores here are this world's own; a headline with the real score conflicts.
      ...(results.length ? [`RESULTS IN THIS WORLD (part of the ledger):\n${results.map((r) => `- ${r}`).join("\n")}`] : []),
      `REAL HEADLINES:\n${fresh.map((h) => `${h.id}. [${h.domain}] ${h.title} (${h.source})`).join("\n")}`,
    ].join("\n\n");
    const out = await generate({ role: "desk", system: SYSTEM, user, schema: DeskSchema });
    if (!out) return 0;
    const known = new Set(fresh.map((h) => h.id));
    const storyIds = new Set(stories.map((s) => s.id));
    const update = conn.prepare("UPDATE headlines SET relation = ?, storyline_id = ?, adapted = ? WHERE id = ?");
    tx(() => {
      for (const item of out.items) {
        if (!known.has(item.id)) continue;
        const story = item.storyline_id != null && storyIds.has(item.storyline_id) ? item.storyline_id : null;
        const premise = typeof item.premise === "string" ? item.premise.trim().slice(0, 300) : "";
        update.run(item.relation, story, item.relation === "new" || !premise ? null : premise, item.id);
      }
      // Anything the model left out is treated as new rather than asked about again.
      conn
        .prepare(`UPDATE headlines SET relation = 'new' WHERE relation IS NULL AND id IN (${fresh.map(() => "?").join(",")})`)
        .run(...fresh.map((h) => h.id));
    });
    return out.items.length;
  } catch (err) {
    console.error("[sim] news desk failed:", err);
    return 0;
  } finally {
    running = false;
  }
}
