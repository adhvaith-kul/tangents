"use client";
// The data behind both side columns: GET /api/sidebar every 5 seconds and on
// any bus event. The last response is kept between screens so the columns do
// not flash empty on navigation.
import { useCallback, useEffect, useState } from "react";
import { bus, getJson } from "@/lib/client";
import type { SidebarResponse, SimStatus } from "@/lib/types";
import { noteFollowState } from "./state";

let cache: SidebarResponse | undefined;

export function useSidebar() {
  const [data, setData] = useState<SidebarResponse | undefined>(cache);

  useEffect(() => {
    let alive = true;
    const load = () =>
      getJson<SidebarResponse>("/api/sidebar")
        .then((d) => {
          cache = d;
          d.whoToFollow.forEach((a) => noteFollowState(a.handle, a.isFollowing));
          if (alive) setData(d);
        })
        .catch(() => {});
    void load();
    const id = setInterval(load, 5000);
    const offs = (["sim", "follow", "posted"] as const).map((evt) => bus.on(evt, load));
    return () => {
      alive = false;
      clearInterval(id);
      offs.forEach((off) => off());
    };
  }, []);

  /** Apply a SimStatus returned by POST /api/sim before the next poll. */
  const setSim = useCallback((sim: SimStatus) => {
    setData((prev) => {
      if (!prev) return prev;
      cache = { ...prev, sim };
      return cache;
    });
  }, []);

  return { data, setSim };
}
