"use client";
// GET a JSON route, optionally polling, keyed by URL: data from a previous
// URL is never shown for a new one. Reports a 404 separately from other errors.
import { useCallback, useEffect, useState } from "react";
import { getJson } from "@/lib/client";

interface Loaded<T> {
  url: string;
  data?: T;
  notFound: boolean;
  error: boolean;
}

export function useResource<T>(url: string, refreshMs?: number) {
  const [state, setState] = useState<Loaded<T> | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = () =>
      getJson<T>(url)
        .then((data) => alive && setState({ url, data, notFound: false, error: false }))
        .catch((e: unknown) => {
          if (!alive) return;
          const notFound = e instanceof Error && e.message.startsWith("404");
          // A failed poll keeps what is on screen.
          setState((prev) => (prev?.url === url && prev.data && !notFound ? prev : { url, notFound, error: !notFound }));
        });
    void load();
    const id = refreshMs ? setInterval(load, refreshMs) : null;
    return () => {
      alive = false;
      if (id) clearInterval(id);
    };
  }, [url, refreshMs, nonce]);

  const current = state?.url === url ? state : null;
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback(
    (fn: (prev: T) => T) => setState((prev) => (prev?.url === url && prev.data ? { ...prev, data: fn(prev.data) } : prev)),
    [url],
  );

  return {
    data: current?.data,
    notFound: current?.notFound ?? false,
    error: current?.error ?? false,
    loading: current == null,
    /** The last data received for any URL, for keeping a page frame while a new URL loads. */
    stale: state?.data,
    reload,
    setData,
  };
}
