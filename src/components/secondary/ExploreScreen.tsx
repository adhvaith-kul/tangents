"use client";
// The Explore screen. Lives here, outside the route files, because two routes
// show it (/explore, and /news/[id] with the in-app browser over it): a page
// module imported by another page makes Fast Refresh reload the page forever.
// Explore: search results for ?q=, otherwise Today's News and Trending.
import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Shell } from "@/components/Shell";
import { PostCard } from "@/components/PostCard";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/icons";
import { SearchField } from "@/components/secondary/SearchField";
import { Spinner } from "@/components/secondary/Spinner";
import { useApi, useSimNow } from "@/lib/client";
import { formatCount, timeAgo } from "@/lib/format";
import type { ExploreResponse } from "@/lib/types";
import { EmptyState } from "@/components/core/EmptyState";
import { Tabs } from "@/components/core/Tabs";
import { openFromClick } from "@/components/browser/open";

// X's Explore tabs, in X's order.
const TABS = [
  { key: "for_you", label: "For You" },
  { key: "trending", label: "Trending" },
  { key: "news", label: "News" },
  { key: "sports", label: "Sports" },
  { key: "entertainment", label: "Entertainment" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function ExploreBody() {
  const liveQ = (useSearchParams().get("q") ?? "").trim();
  // While the in-app browser shows /news/<id> over this screen the query string
  // is gone from the address; keep showing the results that were under it.
  const overlaid = usePathname().startsWith("/news/");
  const [q, setQ] = useState(liveQ);
  if (!overlaid && q !== liveQ) setQ(liveQ);
  const [tab, setTab] = useState<TabKey>("for_you");
  const { data } = useApi<ExploreResponse>(`/api/explore?q=${encodeURIComponent(q)}&tab=${tab}`, { refreshMs: 10_000 });
  const now = useSimNow();

  return (
    <Shell
      header={
        <>
          <SearchField key={q} q={q} />
          {q ? null : <Tabs tabs={[...TABS]} active={tab} onSelect={setTab} />}
        </>
      }
    >
      {!data ? (
        <Spinner />
      ) : q ? (
        data.posts.length === 0 ? (
          <EmptyState title={`No results for "${q}"`} body="Try searching for something else." />
        ) : (
          data.posts.map((p) => <PostCard key={p.id} post={p} />)
        )
      ) : data.articles.length === 0 && data.trends.length === 0 ? (
        <EmptyState title="Nothing to see here — yet" body="When there is something new, it will show up here." />
      ) : (
        <>
          {data.articles.length > 0 && (
            <section>
              <h2 className="px-4 py-3 text-xl font-extrabold leading-6">Today’s News</h2>
              {data.articles.map((a) => (
                <a
                  key={a.id}
                  href={`/news/${a.id}`}
                  onClick={(e) => openFromClick(e, a)}
                  className="block px-4 py-3 hover:bg-x-hover-soft"
                >
                  <div className="text-[17px] font-bold leading-5">{a.headline}</div>
                  <div className="mt-1.5 flex items-center gap-1.5 text-[13px] leading-4 text-x-dim">
                    <Avatar account={a.outlet} size={16} />
                    <span>{a.outlet.name}</span>
                    <span>·</span>
                    <span>{timeAgo(a.createdAt, now)}</span>
                  </div>
                </a>
              ))}
            </section>
          )}
          {data.trends.length > 0 && (
            <section className="border-t border-x-border">
              <h2 className="px-4 py-3 text-xl font-extrabold leading-6">Trending</h2>
              {data.trends.map((t, i) => (
                <Link
                  key={t.id}
                  href={`/explore?q=${encodeURIComponent(t.label)}`}
                  className="block px-4 py-3 hover:bg-x-hover-soft"
                >
                  <div className="flex min-h-[22px] items-center justify-between text-[13px] leading-4 text-x-dim">
                    <span>
                      {i + 1} · {t.category}
                    </span>
                    <Icon name="more" size={18.75} />
                  </div>
                  <div className="text-[15px] font-bold leading-5">{t.label}</div>
                  <div className="mt-1 text-[13px] leading-4 text-x-dim">{formatCount(t.posts)} posts</div>
                </Link>
              ))}
            </section>
          )}
        </>
      )}
    </Shell>
  );
}

export function ExploreScreen() {
  return (
    <Suspense fallback={null}>
      <ExploreBody />
    </Suspense>
  );
}
