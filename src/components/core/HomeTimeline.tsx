"use client";
// The Home timeline for one tab: first page, infinite scroll by cursor, a
// 4-second poll for newer posts collected behind "Show N posts", and the
// user's own new posts inserted at once. Remount (via key) to start over.
import { useCallback, useEffect, useRef, useState } from "react";
import { PostCard } from "@/components/PostCard";
import { getJson } from "@/lib/client";
import type { FeedResponse, PostView } from "@/lib/types";
import { ErrorState } from "./ErrorState";
import { Spinner } from "./Spinner";
import { onPostCreated } from "./state";

export type FeedTab = "foryou" | "following";

export function HomeTimeline({ tab }: { tab: FeedTab }) {
  const [posts, setPosts] = useState<PostView[]>([]);
  const [pending, setPending] = useState<PostView[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const seen = useRef(new Set<number>());
  const newest = useRef(0); // newest createdAt received from the feed route
  const shown = useRef(0); // posts currently on screen
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    shown.current = posts.length;
  }, [posts.length]);

  // Remember posts from the feed route; returns the ones not seen before.
  const absorb = useCallback((list: PostView[]) => {
    const fresh = list.filter((p) => !seen.current.has(p.id));
    for (const p of list) {
      seen.current.add(p.id);
      // The user's own post is stamped "now"; first-run history is back-dated and
      // would fall behind it, so only simulated posts move the polling cursor.
      if (p.author.kind !== "user" && p.createdAt > newest.current) newest.current = p.createdAt;
    }
    return fresh;
  }, []);

  // First page.
  useEffect(() => {
    let alive = true;
    getJson<FeedResponse>(`/api/feed?tab=${tab}`)
      .then((r) => {
        if (!alive) return;
        const fresh = absorb(r.posts);
        setPosts((prev) => [...prev, ...fresh]);
        setCursor(r.nextCursor);
        setStatus("ready");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [tab, attempt, absorb]);

  // Newer posts.
  useEffect(() => {
    if (status !== "ready") return;
    let alive = true;
    const poll = () =>
      getJson<FeedResponse>(`/api/feed?tab=${tab}&after=${newest.current}`)
        .then((r) => {
          if (!alive) return;
          const fresh = absorb(r.posts);
          if (fresh.length === 0) return;
          if (shown.current === 0) setPosts(fresh);
          else setPending((prev) => [...fresh, ...prev]);
        })
        .catch(() => {});
    const id = setInterval(poll, 4000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [tab, status, absorb]);

  // Older posts when the end of the list comes near.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || cursor == null || loadingMore || status !== "ready") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setLoadingMore(true);
        getJson<FeedResponse>(`/api/feed?tab=${tab}&cursor=${cursor}`)
          .then((r) => {
            const fresh = absorb(r.posts);
            setPosts((prev) => [...prev, ...fresh]);
            setCursor(r.nextCursor);
          })
          .catch(() => {})
          .finally(() => setLoadingMore(false));
      },
      { rootMargin: "0px 0px 800px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [tab, cursor, loadingMore, status, absorb]);

  // The user's own top-level posts appear immediately.
  useEffect(
    () =>
      onPostCreated((post) => {
        if (post.replyTo) return;
        seen.current.add(post.id);
        setPosts((prev) => [post, ...prev.filter((p) => p.id !== post.id)]);
      }),
    [],
  );

  if (status === "error" && posts.length === 0) {
    return (
      <ErrorState
        onRetry={() => {
          setStatus("loading");
          setAttempt((n) => n + 1);
        }}
      />
    );
  }

  if (posts.length === 0) return <Spinner className="py-8" />;

  return (
    <div>
      {pending.length > 0 ? (
        <button
          type="button"
          onClick={() => {
            setPosts((prev) => [...pending, ...prev.filter((p) => !pending.some((q) => q.id === p.id))]);
            setPending([]);
          }}
          className="block w-full border-b border-x-border py-4 text-center text-[15px] leading-5 text-x-blue transition-colors hover:bg-x-hover-soft"
        >
          Show {pending.length} {pending.length === 1 ? "post" : "posts"}
        </button>
      ) : null}
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
      <div ref={sentinel} />
      {loadingMore ? <Spinner className="py-8" /> : null}
    </div>
  );
}
