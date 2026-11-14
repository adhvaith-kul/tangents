"use client";
// X's left navigation: logo, nav items, the Post button, the simulation
// controls and the account pill pinned at the bottom. Collapses to icons
// below 1280px.
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useMe } from "@/lib/client";
import type { SidebarResponse, SimStatus } from "@/lib/types";
import { Glyph } from "./glyphs";
import { SimControls } from "./SimControls";
import { openComposer } from "./state";

const ICON = 26.25;

function NavItem({
  href,
  label,
  active,
  icon,
  badge,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: ReactNode;
  badge?: number;
}) {
  return (
    <Link href={href} aria-label={label} className="group flex w-full justify-center xl:justify-start">
      <div className="flex items-center rounded-full p-3 transition-colors group-hover:bg-x-hover">
        <div className="relative flex text-x-text">
          {icon}
          {badge ? (
            <span className="absolute -right-px -top-[6px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-x-blue px-1 text-[11px] font-normal leading-3 text-white">
              {badge > 20 ? "20+" : badge}
            </span>
          ) : null}
        </div>
        <span
          className={`ml-5 mr-4 hidden text-xl leading-6 text-x-text xl:inline ${active ? "font-bold" : "font-normal"}`}
        >
          {label}
        </span>
      </div>
    </Link>
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
  const me = useMe();
  const profileHref = me ? `/${me.handle}` : "/";
  const at = (prefix: string) => pathname === prefix || pathname.startsWith(prefix + "/");
  const onProfile = me != null && pathname.toLowerCase() === `/${me.handle.toLowerCase()}`;

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
          <NavItem href="/markets" label="Markets" active={at("/markets")} icon={<Icon name="chart" size={ICON} />} />
          <NavItem
            href="/world"
            label="Behind the scenes"
            active={at("/world")}
            icon={<Icon name="globe" size={ICON} />}
          />
          <NavItem
            href={profileHref}
            label="Profile"
            active={onProfile}
            icon={onProfile ? <Glyph name="personFilled" size={ICON} /> : <Icon name="person" size={ICON} />}
          />
        </nav>
        <div className="my-4 flex justify-center xl:justify-start">
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
        <div className="mt-auto py-3">
          {me ? (
            <div className="flex w-full cursor-pointer items-center justify-center rounded-full p-3 transition-colors hover:bg-x-hover xl:justify-start">
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
    </header>
  );
}
