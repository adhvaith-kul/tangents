"use client";
// How many new posts are waiting on the Home timeline, shared so the Home nav
// item can show X's blue dot while the timeline holds them back.
import { useSyncExternalStore } from "react";

let count = 0;
const subs = new Set<() => void>();

export function setPendingPosts(n: number) {
  if (n === count) return;
  count = n;
  subs.forEach((fn) => fn());
}

export function usePendingPosts(): number {
  return useSyncExternalStore(
    (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    () => count,
    () => 0,
  );
}
