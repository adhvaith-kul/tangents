"use client";
// Browser-side helpers shared by every screen: fetching with polling, the
// simulation clock, the signed-in user, and engagement tracking.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Account, InteractionEvent, MeResponse } from "./types";

// ---------------------------------------------------------------- clock

let clockOffset = 0; // simulation time minus the browser's Date.now()

/** Current simulation time. Use this, never Date.now(), for post ages. */
export function simNow(): number {
  return Date.now() + clockOffset;
}

function noteServerTime(json: unknown) {
  const j = json as { now?: unknown; sim?: { now?: unknown } } | null;
  const n = typeof j?.now === "number" ? j.now : typeof j?.sim?.now === "number" ? j.sim.now : null;
  if (n != null) clockOffset = n - Date.now();
}

/** Simulation time that re-renders the component every intervalMs. */
export function useSimNow(intervalMs = 15_000): number {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((x) => x + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return simNow();
}

// ------------------------------------------------------------- fetching

export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const json = (await res.json()) as T;
  noteServerTime(json);
  return json;
}

export async function postJson<T>(url: string, body: unknown, method: "POST" | "PATCH" = "POST"): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const json = (await res.json()) as T;
  noteServerTime(json);
  return json;
}

export interface ApiState<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean; // true only until the first response
  reload: () => void;
  setData: (next: T | ((prev: T | undefined) => T | undefined)) => void;
}

/** GET a JSON endpoint, optionally re-fetching every refreshMs. Pass null to skip. */
export function useApi<T>(url: string | null, opts: { refreshMs?: number } = {}): ApiState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(url != null);
  const [nonce, setNonce] = useState(0);
  const { refreshMs } = opts;

  useEffect(() => {
    if (url == null) return;
    let alive = true;
    const load = () =>
      getJson<T>(url)
        .then((d) => {
          if (!alive) return;
          setData(d);
          setError(null);
        })
        .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)))
        .finally(() => alive && setLoading(false));
    load();
    const id = refreshMs ? setInterval(load, refreshMs) : null;
    return () => {
      alive = false;
      if (id) clearInterval(id);
    };
  }, [url, refreshMs, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, error, loading, reload, setData };
}

// ----------------------------------------------------------- event bus

type BusEvent = "posted" | "sim" | "follow" | "settings";
const listeners = new Map<BusEvent, Set<() => void>>();

/** Cross-component signals: "posted" after the user posts, "sim" after a
 *  simulation control is used, "follow" after a follow or unfollow. */
export const bus = {
  on(evt: BusEvent, fn: () => void): () => void {
    if (!listeners.has(evt)) listeners.set(evt, new Set());
    listeners.get(evt)!.add(fn);
    return () => listeners.get(evt)!.delete(fn);
  },
  emit(evt: BusEvent) {
    listeners.get(evt)?.forEach((fn) => fn());
  },
};

// ------------------------------------------------------------- the user

let me: Account | null | undefined; // undefined = not loaded yet
const meSubs = new Set<() => void>();
let meRequest: Promise<void> | null = null;

function loadMe(): Promise<void> {
  meRequest ??= getJson<MeResponse>("/api/me")
    .then((r) => {
      me = r.user;
    })
    .catch(() => {
      me = null;
    })
    .finally(() => {
      meRequest = null;
      meSubs.forEach((fn) => fn());
    });
  return meRequest;
}

/** Re-fetch the signed-in user, e.g. after onboarding or a follower change. */
export function refreshMe(): Promise<void> {
  return loadMe();
}

/** The user's account: undefined while loading, null before onboarding. */
export function useMe(): Account | null | undefined {
  const value = useSyncExternalStore(
    (fn) => {
      meSubs.add(fn);
      return () => meSubs.delete(fn);
    },
    () => me,
    () => undefined,
  );
  useEffect(() => {
    if (me === undefined) void loadMe();
  }, []);
  return value;
}

// ------------------------------------------------------------- tracking

let queue: InteractionEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  flushTimer = null;
  if (queue.length === 0) return;
  const events = queue;
  queue = [];
  const body = JSON.stringify({ events });
  if (document.visibilityState === "hidden" && navigator.sendBeacon) {
    navigator.sendBeacon("/api/interact", new Blob([body], { type: "application/json" }));
    return;
  }
  void fetch("/api/interact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

/** Record an engagement signal. Batched and sent every two seconds. */
export function track(event: InteractionEvent): void {
  queue.push(event);
  flushTimer ??= setTimeout(flush, 2000);
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

/** Attach to a post's root element to report dwell time and quick skips. */
export function useDwell(postId: number): (el: HTMLElement | null) => void {
  const observer = useRef<IntersectionObserver | null>(null);
  const enteredAt = useRef<number | null>(null);

  return useCallback(
    (el: HTMLElement | null) => {
      const leave = () => {
        if (enteredAt.current == null) return;
        const ms = Date.now() - enteredAt.current;
        enteredAt.current = null;
        if (ms < 1000) track({ type: "skip", postId });
        else track({ type: "dwell", postId, ms: Math.min(ms, 30_000) });
      };
      observer.current?.disconnect();
      observer.current = null;
      if (!el) {
        leave();
        return;
      }
      observer.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) enteredAt.current ??= Date.now();
          else leave();
        },
        { threshold: 0.6 },
      );
      observer.current.observe(el);
    },
    [postId],
  );
}
