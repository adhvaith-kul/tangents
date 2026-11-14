"use client";
// A news story: headline, outlet, body, then the posts about it.
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Shell } from "@/components/Shell";
import { PostCard } from "@/components/PostCard";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Spinner } from "@/components/secondary/Spinner";
import { track, useApi } from "@/lib/client";
import { fullTime } from "@/lib/format";
import type { ArticleResponse } from "@/lib/types";

export default function NewsPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useApi<ArticleResponse>(`/api/article/${id}`, { refreshMs: 10_000 });
  const tracked = useRef(false);
  const loaded = data?.article.id;

  useEffect(() => {
    if (loaded == null || tracked.current) return;
    tracked.current = true;
    // Open events are keyed by post id; the contract gives articles no other key.
    track({ type: "open", articleId: loaded });
  }, [loaded]);

  const a = data?.article;
  return (
    <Shell title="Today’s News" back>
      {!data || !a ? (
        <Spinner />
      ) : (
        <>
          <article className="px-4 pb-4 pt-3">
            <h1 className="text-[26px] font-extrabold leading-8 tracking-tight">{a.headline}</h1>
            <Link href={`/${a.outlet.handle}`} className="mt-3 flex items-center gap-3">
              <Avatar account={a.outlet} size={40} />
              <div className="min-w-0 leading-5">
                <div className="flex items-center gap-1 font-bold">
                  <span className="truncate hover:underline">{a.outlet.name}</span>
                  <VerifiedBadge badge={a.outlet.badge} />
                </div>
                <div className="text-[13px] text-x-dim">
                  @{a.outlet.handle} · {fullTime(a.createdAt)}
                </div>
              </div>
            </Link>
            <p className="mt-4 text-[17px] leading-6 text-x-dim">{a.dek}</p>
            <div className="mt-4 space-y-4 text-[17px] leading-[26px]">
              {a.body
                .split(/\n\s*\n/)
                .filter((p) => p.trim())
                .map((p, i) => (
                  <p key={i} className="whitespace-pre-wrap">
                    {p.trim()}
                  </p>
                ))}
            </div>
          </article>
          <h2 className="border-y border-x-border px-4 py-3 text-xl font-extrabold">Posts</h2>
          {data.posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </>
      )}
    </Shell>
  );
}
