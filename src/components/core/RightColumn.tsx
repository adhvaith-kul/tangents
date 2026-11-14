"use client";
// X's right column: the search field pinned at the top, then the Markets,
// Today's News, What's happening and Who to follow cards. Like X, the cards stick so their
// bottom stays in view when they are taller than the window.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/icons";
import { Sparkline } from "@/components/Sparkline";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { openBrowser } from "@/components/browser/open";
import { formatCount, formatPct, formatPrice } from "@/lib/format";
import type { Account, NewsItem, SidebarResponse, StockView, Trend } from "@/lib/types";
import { FollowButton } from "./FollowButton";
import { SearchField } from "./SearchField";

const SEARCH_H = 53;
/** X's footer links. Decorative: there are no such pages here. */
const FOOTER = ["Terms", "Privacy", "Cookies", "Accessibility", "Ads Info"];

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
      <div className="flex items-start justify-between">
        <div className="truncate text-[13px] leading-4 text-x-dim">{t.category}</div>
        <span className="ml-2 flex h-4 shrink-0 items-center text-x-dim">
          <Icon name="more" size={18.75} />
        </span>
      </div>
      <div className="mt-0.5 break-words text-[15px] font-bold leading-5 text-x-text">{t.label}</div>
      <div className="mt-1 text-[13px] leading-4 text-x-dim">{formatCount(t.posts)} posts</div>
    </div>
  );
}

/** "Trending now", "5 hours ago", "1 day ago": how X dates a news item. */
function newsAge(startedAt: number, now: number): string {
  const hours = Math.floor(Math.max(0, now - startedAt) / 3_600_000);
  if (hours < 1) return "Trending now";
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

function NewsRow({ n, now }: { n: NewsItem; now: number }) {
  const router = useRouter();
  const article = n.article;
  const open = () => (article ? openBrowser(article) : router.push(`/explore?q=${encodeURIComponent(n.headline)}`));
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => e.key === "Enter" && open()}
      className="cursor-pointer px-4 py-4 transition-colors hover:bg-x-hover-soft"
    >
      <div className="line-clamp-2 break-words text-[15px] font-bold leading-5 text-x-text">{n.headline}</div>
      <div className="mt-1.5 flex h-6 items-center">
        {n.avatars.length > 0 ? (
          <div className="mr-2 flex shrink-0">
            {n.avatars.map((a, i) => (
              <span
                key={a.handle}
                style={{ zIndex: n.avatars.length - i }}
                className={`relative flex h-6 w-6 items-center justify-center rounded-full bg-x-bg ${i > 0 ? "-ml-3" : ""}`}
              >
                <Avatar account={{ ...a, kind: "figure" }} size={22} />
              </span>
            ))}
          </div>
        ) : null}
        <span className="truncate text-[13px] leading-4 text-x-dim">
          {newsAge(n.startedAt, now)} · {n.category} · {n.posts.toLocaleString("en-US")} posts
        </span>
      </div>
    </div>
  );
}

const NEWS_HIDDEN = "tangents.newsHidden";

/** X's "Today's News": the day's biggest stories, with a close button that hides it for the session. */
function NewsCard({ news, now }: { news: NewsItem[]; now: number }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try {
      // After mount, so the server and first client render agree.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (sessionStorage.getItem(NEWS_HIDDEN) === "1") setHidden(true);
    } catch {
      // storage unavailable: the card just stays
    }
  }, []);
  if (hidden) return null;
  const hide = () => {
    setHidden(true);
    try {
      sessionStorage.setItem(NEWS_HIDDEN, "1");
    } catch {
      // hidden until the next load only
    }
  };
  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-x-border">
      <div className="flex h-14 items-center justify-between px-4">
        <h2 className="text-xl font-extrabold leading-6 text-x-text">Today’s News</h2>
        <button
          type="button"
          aria-label="Close"
          onClick={hide}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#eff3f4] transition-colors hover:bg-x-hover"
        >
          <Icon name="close" size={18} />
        </button>
      </div>
      {news.map((n) => (
        <NewsRow key={n.storylineId} n={n} now={now} />
      ))}
    </section>
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
      className="flex min-h-[66px] cursor-pointer items-center px-4 py-3 transition-colors hover:bg-x-hover-soft"
    >
      <Avatar account={a} size={40} />
      <div className="ml-2 mr-3 min-w-0 flex-1 text-[15px] leading-5">
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
        <div className="sticky top-0 z-10 flex h-[53px] items-end bg-x-bg pb-0.5">
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
        {sidebar?.news && sidebar.news.length > 0 && !onExplore ? (
          <NewsCard news={sidebar.news} now={sidebar.sim.now} />
        ) : null}
        {sidebar && sidebar.trends.length > 0 && !onExplore ? (
          <Card title="What’s happening" more="/explore">
            {sidebar.trends.map((t) => (
              <TrendRow key={t.id} t={t} />
            ))}
          </Card>
        ) : null}
        {sidebar && sidebar.whoToFollow.length > 0 ? (
          <Card title="Who to follow" more="/explore">
            {sidebar.whoToFollow.map((a) => (
              <FollowRow key={a.handle} a={a} />
            ))}
          </Card>
        ) : null}
        <nav aria-label="Footer" className="flex flex-wrap px-4 text-[13px] leading-5 text-x-dim">
          {FOOTER.map((label) => (
            <span key={label} className="my-0.5 cursor-pointer pr-3 hover:underline">
              {label} ·
            </span>
          ))}
          <span className="my-0.5 flex cursor-pointer items-center pr-3 hover:underline">
            More <Icon name="more" size={13} className="ml-0.5" />
          </span>
          <span className="my-0.5">© 2026 X Corp.</span>
        </nav>
      </div>
    </aside>
  );
}
