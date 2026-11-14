"use client";
// Explore: search results for ?q=, otherwise Today's News and Trending.
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Shell } from "@/components/Shell";
import { PostCard } from "@/components/PostCard";
import { Avatar } from "@/components/Avatar";
import { SearchField } from "@/components/secondary/SearchField";
import { Spinner } from "@/components/secondary/Spinner";
import { useApi, useSimNow } from "@/lib/client";
import { formatCount, timeAgo } from "@/lib/format";
import type { ExploreResponse } from "@/lib/types";

function ExploreBody() {
  const q = (useSearchParams().get("q") ?? "").trim();
  const { data } = useApi<ExploreResponse>(`/api/explore?q=${encodeURIComponent(q)}`, { refreshMs: 10_000 });
  const now = useSimNow();

  return (
    <Shell header={<SearchField key={q} q={q} />}>
      {!data ? (
        <Spinner />
      ) : q ? (
        data.posts.map((p) => <PostCard key={p.id} post={p} />)
      ) : (
        <>
          {data.articles.length > 0 && (
            <section>
              <h2 className="px-4 py-3 text-xl font-extrabold">Today’s News</h2>
              {data.articles.map((a) => (
                <Link
                  key={a.id}
                  href={`/news/${a.id}`}
                  className="block px-4 py-3 hover:bg-x-hover-soft"
                >
                  <div className="text-[15px] font-bold leading-5">{a.headline}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-[13px] text-x-dim">
                    <Avatar account={a.outlet} size={16} />
                    <span>{a.outlet.name}</span>
                    <span>·</span>
                    <span>{timeAgo(a.createdAt, now)}</span>
                  </div>
                </Link>
              ))}
            </section>
          )}
          {data.trends.length > 0 && (
            <section className="border-t border-x-border">
              <h2 className="px-4 py-3 text-xl font-extrabold">Trending</h2>
              {data.trends.map((t, i) => (
                <Link
                  key={t.id}
                  href={`/explore?q=${encodeURIComponent(t.label)}`}
                  className="block px-4 py-3 hover:bg-x-hover-soft"
                >
                  <div className="text-[13px] leading-4 text-x-dim">
                    {i + 1} · {t.category}
                  </div>
                  <div className="text-[15px] font-bold leading-5">{t.label}</div>
                  <div className="text-[13px] leading-4 text-x-dim">{formatCount(t.posts)} posts</div>
                </Link>
              ))}
            </section>
          )}
        </>
      )}
    </Shell>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={null}>
      <ExploreBody />
    </Suspense>
  );
}
