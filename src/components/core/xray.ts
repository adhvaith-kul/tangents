"use client";
// Whether X-ray is on, shared by every post on screen. X-ray is a stored
// setting; this keeps one copy in the browser so thirty posts do not each ask.
import { useEffect, useSyncExternalStore } from "react";
import { bus, getJson, postJson } from "@/lib/client";
import type { Settings } from "@/lib/types";

let on: boolean | undefined; // undefined = not loaded yet
let request: Promise<void> | null = null;
const subs = new Set<() => void>();

function set(value: boolean) {
  on = value;
  subs.forEach((fn) => fn());
}

function load(): Promise<void> {
  request ??= getJson<Settings>("/api/settings")
    .then((s) => set(s.xray))
    .catch(() => set(false))
    .finally(() => {
      request = null;
    });
  return request;
}

// The Settings screen saves through its own hook and says so on the bus.
if (typeof window !== "undefined") bus.on("settings", () => void load());

/** False until the setting has loaded. */
export function useXray(): boolean {
  const value = useSyncExternalStore(
    (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    () => on,
    () => undefined,
  );
  useEffect(() => {
    if (on === undefined) void load();
  }, []);
  return value ?? false;
}

export function setXray(value: boolean): void {
  set(value);
  postJson<Settings>("/api/settings", { xray: value }).catch(() => void load());
}
