// Where each famous account stands now: one living note per figure, outlet or
// official account, written by the director only on a beat that moved it (a
// side taken, a promise, being proved wrong, a falling-out, a reversal). The
// new note replaces the old one. The director sees an account's note under
// its brief, so positions carry from beat to beat.
import { db } from "../db";
import type { WorldDigest } from "../types";

/** At most this many notes per beat, each at most this many characters. */
export const MAX_STANDS = 3;
export const MAX_STAND_CHARS = 320;

/** Store one account's note, replacing any earlier one. The caller has checked the account. */
export function saveStand(handle: string, note: string, at: number): void {
  db()
    .prepare(
      `INSERT INTO stands (handle, note, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(handle) DO UPDATE SET note = excluded.note, updated_at = excluded.updated_at`,
    )
    .run(handle, note, at);
}

/** Every note, newest first. */
export function allStands(): { handle: string; note: string; updated_at: number }[] {
  return db().prepare("SELECT handle, note, updated_at FROM stands ORDER BY updated_at DESC, handle").all() as {
    handle: string; note: string; updated_at: number;
  }[];
}

/** The notes for the director's digest; the prompt keeps only the briefed accounts'. */
export function digestStands(t: number): WorldDigest["stands"] {
  return allStands().map((r) => ({ handle: r.handle, note: r.note, msAgo: Math.max(0, t - r.updated_at) }));
}
