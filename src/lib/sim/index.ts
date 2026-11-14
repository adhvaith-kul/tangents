// The simulation engine's public surface. Everything else in src/lib/sim is private.
// OWNER: simulation engine workstream. Signatures are frozen.
import { backend } from "../llm";
import { hasSnapshot, now } from "../db";
import type { SimAction, SimStatus } from "../types";

/** Called by polling routes. Marks a browser tab as active and makes sure the
 *  loop is running; the loop stops itself after 60 seconds without a heartbeat. */
export function heartbeat(): void {}

export function simStatus(): SimStatus {
  return {
    running: false, busy: false, now: now(), lastTickAt: null, ticks: 0,
    backend: backend(), error: null, hasSnapshot: hasSnapshot(),
  };
}

/** pause | resume | tick (run one now) | skip_day | save | restore | reset */
export async function simAction(action: SimAction): Promise<SimStatus> {
  void action;
  return simStatus();
}

/** The user published a post or reply. Fire-and-forget: starts a reaction tick. */
export function onUserPost(postId: number): void {
  void postId;
}
