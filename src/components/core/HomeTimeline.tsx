"use client";
// The Home timeline for one tab: first page, infinite scroll by cursor, a
// 4-second poll for newer posts collected behind "Show N posts", and the
// user's own new posts inserted at once. Remount (via key) to start over.
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/icons";
import { PostCard } from "@/components/PostCard";
import { getJson } from "@/lib/client";
import type { AccountLite, FeedResponse, PostView } from "@/lib/types";
import { ErrorState } from "./ErrorState";
import { setPendingPosts } from "./pending";
import { Spinner } from "./Spinner";
import { onPostCreated } from "./state";
import { EmptyState } from "@/components/core/EmptyState";

export type FeedTab = "foryou" | "following";

/** X's floating pill for posts that arrived while the reader was further down:
 *  an arrow, the newest authors' pictures and "posted". */
function NewPostsPill({ authors, onClick }: { authors: AccountLite[]; onClick: () => void }) {
  return (
    <div className="pointer-events-none sticky top-[65px] z-10 flex h-0 justify-center">
      <button
        type="button"
        onClick={onClick}
        aria-label="New posts are available. Go to the top to see them."
        className="pointer-events-auto flex h-[38px] items-center rounded-full bg-x-blue pl-3 pr-4 text-[15px] leading-5 text-white shadow-[0_2px_8px_rgba(0,0,0,0.5)] transition-colors hover:bg-x-blue-hover"
      >
        <Icon name="arrowUp" size={18} />
        <span className="ml-1.5 mr-2 flex">
          {authors.map((a, i) => (
            <span
              key={a.handle}
              className={`flex h-[26px] w-[26px] items-center justify-center rounded-full bg-x-blue ${i > 0 ? "-ml-2.5" : ""}`}
            >
              <Avatar account={{ ...a, kind: "figure" }} size={22} />
            </span>
          ))}
        </span>
        posted
      </button>
    </div>
  );
}

export function HomeTimeline({ tab }: { tab: FeedTab }) {
  const [posts, setPosts] = useState<PostView[]>([]);
  const [pending, setPending] = useState<PostView[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const seen = useRef(new Set<number>());
  const newest = useRef(0); // newest createdAt or repost time received from the feed route
  const shown = useRef(0); // posts currently on screen
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    shown.current = posts.length;
  }, [posts.length]);

  // The Home nav item shows a dot while posts are held back.
  useEffect(() => {
    setPendingPosts(pending.length);
    return () => setPendingPosts(0);
  }, [pending.length]);

  // Past the first screenful the inline bar is out of sight, so the pill takes over.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 300);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const showPending = () => {
    setPosts((prev) => [...pending, ...prev.filter((p) => !pending.some((q) => q.id === p.id))]);
    setPending([]);
    window.scrollTo({ top: 0 });
  };
  const pendingAuthors: AccountLite[] = [];
  for (const p of pending) {
    if (!pendingAuthors.some((a) => a.handle === p.author.handle)) pendingAuthors.push(p.author);
    if (pendingAuthors.length === 3) break;
  }

  // Remember posts from the feed route; returns the ones not seen before (X shows a post once).
  const absorb = useCallback((list: PostView[]) => {
    const fresh = list.filter((p) => !seen.current.has(p.id));
    for (const p of list) {
      seen.current.add(p.id);
      // The user's own post is stamped "now"; first-run history is back-dated and
      // would fall behind it, so only simulated posts move the polling cursor.
      // A repost moves it too, or the same repost would be fetched on every poll.
      const at = Math.max(p.author.kind !== "user" ? p.createdAt : 0, p.repost?.at ?? 0);
      if (at > newest.current) newest.current = at;
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

  if (posts.length === 0) {
    // An empty Following tab is a real state; an empty For you means the world is still warming up.
    if (tab === "following" && status === "ready") {
      return (
        <EmptyState
          title="Welcome to X!"
          body="This is the best place to see what’s happening in your world. Find some people and topics to follow now."
          action={{ label: "Let’s go", href: "/explore" }}
        />
      );
    }
    return <Spinner className="py-8" />;
  }

  return (
    <div>
      {pending.length > 0 && scrolled ? <NewPostsPill authors={pendingAuthors} onClick={showPending} /> : null}
      {pending.length > 0 ? (
        <button
          type="button"
          onClick={showPending}
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
