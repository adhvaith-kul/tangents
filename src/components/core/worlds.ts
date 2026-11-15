"use client";
// Worlds from the browser's side: what is saved, what is on screen, and the
// three moves between them. Shared by Settings and the account menu.
import { bus, getJson, postJson, refreshMe } from "@/lib/client";

export interface SavedWorld {
  name: string;
  savedAt: number;
  simTime: number;
  posts: number;
  reader: string | null;
  /** A copy kept as it was saved: leaving it does not save over it. */
  kept: boolean;
}

export interface WorldsState {
  worlds: SavedWorld[];
  /** The world on screen. `willBe` is the name it gets when it is first saved. */
  here: { name: string | null; kept: boolean; posts: number; reader: string | null; willBe: string | null };
}

export { WORLD_NAME } from "@/lib/rules";

export const getWorlds = () => getJson<WorldsState>("/api/worlds");

export const postWorlds = (body: Record<string, string>) => postJson<WorldsState>("/api/worlds", body);

/** A different world is on screen afterwards, so everything refetches. */
async function arrived(): Promise<void> {
  await refreshMe();
  bus.emit("sim");
  bus.emit("settings");
}

/** Open a saved world. The one being left is saved first by the server. */
export async function switchWorld(name: string): Promise<WorldsState> {
  const r = await postWorlds({ load: name });
  await arrived();
  return r;
}

/** Start a new world at sign-up. The one being left is saved first by the server. */
export async function newWorld(): Promise<void> {
  await postJson("/api/sim", { action: "reset" });
  await arrived();
}

/** Delete a saved world; deleting the one on screen ends it and returns to sign-up. */
export async function removeWorld(name: string, onScreen: boolean): Promise<WorldsState> {
  const r = await postWorlds({ remove: name });
  if (onScreen) await arrived();
  return r;
}

/** The server's message out of a failed request. */
export function worldError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  try {
    const j = JSON.parse(raw.replace(/^\d+\s/, "")) as { error?: unknown };
    if (typeof j.error === "string") return j.error;
  } catch {
    // not JSON
  }
  return raw;
}
