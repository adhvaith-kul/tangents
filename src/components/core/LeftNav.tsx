"use client";
// X's left navigation: logo, X's eight nav items, the Post button, one line of
// simulation status and the account pill pinned at the bottom. Collapses to
// icons below 1280px. This app's own screens (Markets, Behind the scenes,
// Settings) live under More; the assistant slot is Brok.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { GrokMark, Icon } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useMe } from "@/lib/client";
import type { SidebarResponse, SimStatus } from "@/lib/types";
import { GearGlyph } from "@/components/settings/GearGlyph";
import { FloatingButtons } from "./FloatingButtons";
import { Glyph } from "./glyphs";
import { Menu } from "./Menu";
import { usePendingPosts } from "./pending";
import { SimControls } from "./SimControls";
import { openComposer } from "./state";
import { setXray, useXray } from "./xray";

const ICON = 26.25;

function NavItem({
  href,
  onSelect,
  label,
  active,
  icon,
  badge,
  dot = false,
}: {
  /** A link when set; otherwise a button that calls onSelect. */
  href?: string;
  onSelect?: (anchor: DOMRect) => void;
  label: string;
  active: boolean;
  icon: ReactNode;
  badge?: number;
  /** X's small blue dot: something new is waiting. */
  dot?: boolean;
}) {
  const inner = (
    <div className="flex items-center rounded-full p-3 transition-colors group-hover:bg-x-hover">
      <div className="relative flex text-x-text">
        {icon}
        {badge ? (
          <span className="absolute -right-px -top-[6px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-x-blue px-1 text-[11px] font-normal leading-3 text-white">
            {badge > 20 ? "20+" : badge}
          </span>
        ) : dot ? (
          <span className="absolute -top-1 right-0 h-[7px] w-[7px] rounded-full bg-x-blue" />
        ) : null}
      </div>
      <span
        className={`ml-5 mr-4 hidden text-xl leading-6 text-x-text xl:inline ${active ? "font-bold" : "font-normal"}`}
      >
        {label}
      </span>
    </div>
  );
  const box = "group flex w-full justify-center xl:justify-start";
  if (href) {
    return (
      <Link href={href} aria-label={label} className={box}>
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      aria-label={label}
      className={box}
      onClick={(e) => onSelect?.((e.currentTarget.firstElementChild ?? e.currentTarget).getBoundingClientRect())}
    >
      {inner}
    </button>
  );
}

export function LeftNav({
  sidebar,
  onSim,
}: {
  sidebar: SidebarResponse | undefined;
  onSim: (s: SimStatus) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const me = useMe();
  const pending = usePendingPosts();
  const [more, setMore] = useState<DOMRect | null>(null);
  const xray = useXray();
  const profileHref = me ? `/${me.handle}` : "/";
  const at = (prefix: string) => pathname === prefix || pathname.startsWith(prefix + "/");
  const onProfile = me != null && pathname.toLowerCase() === `/${me.handle.toLowerCase()}`;
  const onMore = at("/markets") || at("/world") || at("/settings");

  return (
    <header className="flex w-[88px] shrink-0 justify-end xl:w-[275px]">
      <div className="sticky top-0 flex h-screen w-[88px] flex-col overflow-y-auto px-2 xl:w-[275px]">
        <div className="flex justify-center py-0.5 xl:justify-start">
          <Link
            href="/"
            aria-label="X"
            className="flex h-[52px] w-[52px] items-center justify-center rounded-full text-x-text transition-colors hover:bg-x-hover"
          >
            <Logo size={30} />
          </Link>
        </div>
        <nav className="mt-0.5 flex flex-col">
          <NavItem
            href="/"
            label="Home"
            active={pathname === "/"}
            dot={pending > 0}
            icon={pathname === "/" ? <Icon name="home" size={ICON} /> : <Glyph name="homeOutline" size={ICON} />}
          />
          <NavItem
            href="/explore"
            label="Explore"
            active={at("/explore")}
            icon={at("/explore") ? <Glyph name="searchBold" size={ICON} /> : <Icon name="search" size={ICON} />}
          />
          <NavItem
            href="/notifications"
            label="Notifications"
            active={at("/notifications")}
            badge={sidebar?.unread}
            icon={at("/notifications") ? <Glyph name="bellFilled" size={ICON} /> : <Icon name="bell" size={ICON} />}
          />
          <NavItem href="/i/brok" label="Brok" active={at("/i/brok")} icon={<GrokMark size={ICON} />} />
          <NavItem
            href={profileHref}
            label="Profile"
            active={onProfile}
            icon={onProfile ? <Glyph name="personFilled" size={ICON} /> : <Icon name="person" size={ICON} />}
          />
          <NavItem
            label="More"
            active={onMore}
            onSelect={(anchor) => setMore(anchor)}
            icon={<Icon name="moreCircle" size={ICON} />}
          />
        </nav>
        <div className="my-2 flex justify-center xl:justify-start">
          <button
            type="button"
            onClick={() => openComposer()}
            aria-label="Post"
            className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-x-button text-[17px] font-bold leading-5 text-[#0f1419] transition-colors hover:bg-x-button-hover xl:w-[90%]"
          >
            <span className="xl:hidden">
              <Glyph name="feather" size={24} />
            </span>
            <span className="hidden xl:inline">Post</span>
          </button>
        </div>
        <SimControls sim={sidebar?.sim} onSim={onSim} />
        <div className="mt-auto pb-3">
          {me ? (
            <div className="flex w-full cursor-pointer items-center justify-center rounded-full border border-transparent p-3 transition-colors hover:bg-x-hover xl:justify-start">
              <Avatar account={me} size={40} />
              <div className="mx-3 hidden min-w-0 flex-1 text-[15px] leading-5 xl:block">
                <div className="flex min-w-0 items-center">
                  <span className="truncate font-bold text-x-text">{me.name}</span>
                  {me.badge ? (
                    <span className="ml-0.5 flex shrink-0">
                      <VerifiedBadge badge={me.badge} size={18.75} />
                    </span>
                  ) : null}
                </div>
                <div className="truncate text-x-dim">@{me.handle}</div>
              </div>
              <span className="hidden text-x-text xl:flex">
                <Icon name="more" size={18.75} />
              </span>
            </div>
          ) : null}
        </div>
      </div>
      {more ? (
        <Menu
          anchor={more}
          align="left"
          onClose={() => setMore(null)}
          items={[
            { icon: <Icon name="chart" size={18.75} />, label: "Markets", onSelect: () => router.push("/markets") },
            { icon: <Icon name="globe" size={18.75} />, label: "Behind the scenes", onSelect: () => router.push("/world") },
            { icon: <GearGlyph size={18.75} />, label: "Settings", onSelect: () => router.push("/settings") },
            // Not X's: the quick way to see what each post on screen is doing.
            { icon: <Glyph name="info" size={18.75} />, label: xray ? "Turn X-ray off" : "Turn X-ray on", onSelect: () => setXray(!xray) },
          ]}
        />
      ) : null}
      <FloatingButtons />
    </header>
  );
}
