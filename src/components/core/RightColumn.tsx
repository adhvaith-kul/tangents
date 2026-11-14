"use client";
// X's right column: the search field pinned at the top, then the Markets,
// What's happening and Who to follow cards. Like X, the cards stick so their
// bottom stays in view when they are taller than the window.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { Sparkline } from "@/components/Sparkline";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { formatCount, formatPct, formatPrice } from "@/lib/format";
import type { Account, SidebarResponse, StockView, Trend } from "@/lib/types";
import { FollowButton } from "./FollowButton";
import { SearchField } from "./SearchField";

const SEARCH_H = 53;

function Card({ title, children, more }: { title: string; children: ReactNode; more?: string }) {
  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-x-border">
      <h2 className="px-4 py-3 text-xl font-extrabold leading-6 text-x-text">{title}</h2>
      {children}
      {more ? (
        <Link
          href={more}
          className="block p-4 text-[15px] leading-5 text-x-blue transition-colors hover:bg-x-hover-soft"
        >
          Show more
        </Link>
      ) : null}
    </section>
  );
}

function StockRow({ s }: { s: StockView }) {
  const up = s.changePct >= 0;
  return (
    <div className="flex items-center px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-bold leading-5 text-x-text">{s.ticker}</div>
        <div className="truncate text-[13px] leading-4 text-x-dim">{s.name}</div>
      </div>
      <div className="mx-3 shrink-0">
        <Sparkline points={s.history} up={up} />
      </div>
      <div className="w-[88px] shrink-0 text-right">
        <div className="text-[15px] font-bold leading-5 text-x-text tabular-nums">{formatPrice(s.price)}</div>
        <div className={`text-[13px] leading-4 tabular-nums ${up ? "text-x-green" : "text-x-red"}`}>
          {formatPct(s.changePct)}
        </div>
      </div>
    </div>
  );
}

function TrendRow({ t }: { t: Trend }) {
  const router = useRouter();
  const href = `/explore?q=${encodeURIComponent(t.label)}`;
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(e) => e.key === "Enter" && router.push(href)}
      className="cursor-pointer px-4 py-3 transition-colors hover:bg-x-hover-soft"
    >
      <div className="truncate text-[13px] leading-4 text-x-dim">{t.category}</div>
      <div className="mt-0.5 break-words text-[15px] font-bold leading-5 text-x-text">{t.label}</div>
      <div className="mt-1 text-[13px] leading-4 text-x-dim">{formatCount(t.posts)} posts</div>
    </div>
  );
}

function FollowRow({ a }: { a: Account }) {
  const router = useRouter();
  const href = `/${a.handle}`;
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(e) => e.key === "Enter" && router.push(href)}
      className="flex cursor-pointer items-center px-4 py-3 transition-colors hover:bg-x-hover-soft"
    >
      <Avatar account={a} size={40} />
      <div className="mx-3 min-w-0 flex-1 text-[15px] leading-5">
        <div className="flex min-w-0 items-center">
          <span className="truncate font-bold text-x-text hover:underline">{a.name}</span>
          {a.badge ? (
            <span className="ml-0.5 flex shrink-0">
              <VerifiedBadge badge={a.badge} size={18.75} />
            </span>
          ) : null}
        </div>
        <div className="truncate text-x-dim">@{a.handle}</div>
      </div>
      <FollowButton handle={a.handle} isFollowing={a.isFollowing} size="sm" />
    </div>
  );
}

export function RightColumn({ sidebar }: { sidebar: SidebarResponse | undefined }) {
  const pathname = usePathname();
  // Explore has its own search field and trends, so X leaves them out here.
  const onExplore = pathname === "/explore" || pathname.startsWith("/explore/");
  const cards = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(onExplore ? 0 : SEARCH_H);

  useEffect(() => {
    const el = cards.current;
    if (!el) return;
    const offset = onExplore ? 0 : SEARCH_H;
    const update = () => setTop(Math.min(offset, window.innerHeight - el.offsetHeight));
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [onExplore]);

  return (
    <aside className="ml-5 hidden w-[290px] shrink-0 min-[1000px]:block min-[1078px]:ml-[30px] min-[1078px]:mr-[10px] min-[1078px]:w-[350px]">
      {onExplore ? null : (
        <div className="sticky top-0 z-10 flex h-[53px] items-center bg-x-bg">
          <SearchField />
        </div>
      )}
      <div ref={cards} className="sticky pb-6 pt-3" style={{ top }}>
        {sidebar && sidebar.stocks.length > 0 ? (
          <Card title="Markets" more="/markets">
            {sidebar.stocks.slice(0, 4).map((s) => (
              <StockRow key={s.ticker} s={s} />
            ))}
          </Card>
        ) : null}
        {sidebar && sidebar.trends.length > 0 && !onExplore ? (
          <Card title="What’s happening" more="/explore">
            {sidebar.trends.map((t) => (
              <TrendRow key={t.id} t={t} />
            ))}
          </Card>
        ) : null}
        {sidebar && sidebar.whoToFollow.length > 0 ? (
          <Card title="Who to follow">
            {sidebar.whoToFollow.map((a) => (
              <FollowRow key={a.handle} a={a} />
            ))}
          </Card>
        ) : null}
      </div>
    </aside>
  );
}
