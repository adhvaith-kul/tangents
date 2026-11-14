"use client";
// A post and its conversation: ancestors as a thread, the focused post, the
// reply composer, the author's own continuation as a connected thread, then
// everyone else's replies. Polls every 5 seconds for new replies.
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { PostCard } from "@/components/PostCard";
import { Shell } from "@/components/Shell";
import { Composer } from "@/components/core/Composer";
import { ErrorState } from "@/components/core/ErrorState";
import { Spinner } from "@/components/core/Spinner";
import { ThreadContext } from "@/components/core/ThreadContext";
import { onPostCreated } from "@/components/core/state";
import { useResource } from "@/components/core/useResource";
import type { PostView, ThreadResponse } from "@/lib/types";

/** The author continuing their own post: their reply to it, their reply to
 *  that, and so on. Found by following the chain, wherever it sits in the list. */
function continuation(post: PostView, replies: PostView[]): PostView[] {
  const author = post.author.handle.toLowerCase();
  const run: PostView[] = [];
  let parent = post.id;
  for (;;) {
    const next = replies.find(
      (r) => r.replyTo?.id === parent && r.author.handle.toLowerCase() === author && !r.deleted,
    );
    if (!next || run.includes(next)) break;
    run.push(next);
    parent = next.id;
  }
  return run;
}

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const postId = Number(id);
  const { data, notFound, error, reload, setData } = useResource<ThreadResponse>(
    `/api/post/${encodeURIComponent(id)}`,
    5000,
  );
  const focused = useRef<HTMLDivElement>(null);
  const scrolledFor = useRef<string | null>(null);

  // The user's reply shows at once, ahead of the next poll.
  useEffect(
    () =>
      onPostCreated((p) => {
        if (p.replyTo?.id !== postId) return;
        setData((d) => (d.replies.some((r) => r.id === p.id) ? d : { ...d, replies: [p, ...d.replies] }));
      }),
    [postId, setData],
  );

  // As on X, open with the focused post at the top when it has ancestors.
  useEffect(() => {
    if (!data || scrolledFor.current === id) return;
    scrolledFor.current = id;
    if (data.ancestors.length > 0 && focused.current) {
      window.scrollTo({ top: focused.current.getBoundingClientRect().top + window.scrollY - 53 });
    }
  }, [data, id]);

  const thread = useMemo(() => (data ? continuation(data.post, data.replies) : []), [data]);
  // Posts whose parent is on screen directly above them need no "Replying to" line.
  const visible = useMemo(
    () => new Set<number>(data ? [...data.ancestors.map((a) => a.id), data.post.id, ...thread.map((p) => p.id)] : []),
    [data, thread],
  );

  let body;
  if (notFound) {
    body = (
      <div className="mx-auto flex max-w-[400px] flex-col items-center px-8 py-10 text-center">
        <div className="text-[15px] leading-5 text-x-dim">
          Hmm...this page doesn’t exist. Try searching for something else.
        </div>
        <Link
          href="/explore"
          className="mt-7 flex h-9 items-center rounded-full bg-x-blue px-4 text-[15px] font-bold leading-5 text-white transition-colors hover:bg-x-blue-hover"
        >
          Search
        </Link>
      </div>
    );
  } else if (error) {
    body = <ErrorState onRetry={reload} />;
  } else if (!data) {
    body = <Spinner className="py-8" />;
  } else {
    body = (
      <ThreadContext.Provider value={visible}>
        {data.ancestors.map((p) => (
          <PostCard key={p.id} post={p} variant="thread" />
        ))}
        <div
          ref={focused}
          style={data.ancestors.length > 0 ? { minHeight: "calc(100vh - 53px)" } : undefined}
        >
          <PostCard key={data.post.id} post={data.post} variant="detail" />
          <Composer key={`reply-${data.post.id}`} variant="reply" replyTo={data.post} />
          {thread.map((p, i) => (
            <PostCard key={p.id} post={p} variant={i < thread.length - 1 ? "thread" : "feed"} />
          ))}
          {data.replies
            .filter((p) => !thread.includes(p))
            .map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
        </div>
      </ThreadContext.Provider>
    );
  }

  return (
    <Shell title="Post" back>
      {body}
    </Shell>
  );
}
