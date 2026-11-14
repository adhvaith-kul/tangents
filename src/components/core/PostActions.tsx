"use client";
// The action row under a post: reply, repost (with its Repost / Quote menu),
// like, views, bookmark and share. Each icon sits in a round halo tinted with
// the action's colour on hover; counts are hidden at zero.
import { useState, type MouseEvent, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";
import { formatCount } from "@/lib/format";
import type { PostCounts, PostView, ViewerState } from "@/lib/types";
import { Glyph } from "./glyphs";
import { Menu } from "./Menu";
import { openComposer, toggleFlag } from "./state";

type Tone = "blue" | "green" | "pink";

// Full class strings so Tailwind can see them.
const TONE: Record<Tone, { hover: string; halo: string; on: string }> = {
  blue: { hover: "hover:text-x-blue", halo: "group-hover:bg-x-blue/10", on: "text-x-blue" },
  green: { hover: "hover:text-x-green", halo: "group-hover:bg-x-green/10", on: "text-x-green" },
  pink: { hover: "hover:text-x-pink", halo: "group-hover:bg-x-pink/10", on: "text-x-pink" },
};

function Action({
  icon,
  label,
  tone,
  count,
  active = false,
  large,
  onClick,
}: {
  icon: IconName;
  label: string;
  tone: Tone;
  count?: number;
  active?: boolean;
  large: boolean;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
}) {
  const t = TONE[tone];
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      className={`group flex items-center text-[13px] leading-4 transition-colors ${active ? t.on : "text-x-dim"} ${t.hover}`}
    >
      <span className="relative flex items-center justify-center">
        <span
          className={`absolute rounded-full transition-colors ${large ? "-inset-[9px]" : "-inset-2"} ${t.halo}`}
        />
        <Icon name={icon} size={large ? 22.5 : 18.75} className="relative" />
      </span>
      {count ? <span className="px-1 tabular-nums">{formatCount(count)}</span> : null}
    </button>
  );
}

export function PostActions({
  post,
  viewer,
  counts,
  variant,
}: {
  post: PostView;
  viewer: ViewerState;
  counts: PostCounts;
  variant: "feed" | "detail";
}) {
  const [repostMenu, setRepostMenu] = useState<DOMRect | null>(null);
  const large = variant === "detail";

  const reply = (
    <Action
      icon="reply"
      label="Reply"
      tone="blue"
      count={counts.replies}
      large={large}
      onClick={() => openComposer({ replyTo: post })}
    />
  );
  const repost = (
    <Action
      icon="repost"
      label={viewer.reposted ? "Undo repost" : "Repost"}
      tone="green"
      count={counts.reposts}
      active={viewer.reposted}
      large={large}
      onClick={(e) => setRepostMenu(e.currentTarget.getBoundingClientRect())}
    />
  );
  const like = (
    <Action
      icon={viewer.liked ? "likeFilled" : "like"}
      label={viewer.liked ? "Unlike" : "Like"}
      tone="pink"
      count={counts.likes}
      active={viewer.liked}
      large={large}
      onClick={() => toggleFlag(post, viewer, "liked")}
    />
  );
  const bookmark = (
    <Action
      icon={viewer.bookmarked ? "bookmarkFilled" : "bookmark"}
      label={viewer.bookmarked ? "Remove Bookmark" : "Bookmark"}
      tone="blue"
      active={viewer.bookmarked}
      large={large}
      onClick={() => toggleFlag(post, viewer, "bookmarked")}
    />
  );
  const share = <Action icon="share" label="Share post" tone="blue" large={large} />;

  let row: ReactNode;
  if (large) {
    row = (
      <div className="flex h-12 items-center justify-around border-y border-x-border px-1">
        {reply}
        {repost}
        {like}
        {bookmark}
        {share}
      </div>
    );
  } else {
    row = (
      <div className="mt-3 flex max-w-[425px] items-center justify-between">
        {reply}
        {repost}
        {like}
        <Action icon="views" label="View post analytics" tone="blue" count={counts.views} large={false} />
        <div className="flex items-center gap-3">
          {bookmark}
          {share}
        </div>
      </div>
    );
  }

  return (
    <>
      {row}
      {repostMenu ? (
        <Menu
          anchor={repostMenu}
          onClose={() => setRepostMenu(null)}
          items={[
            {
              icon: <Icon name="repost" size={18.75} />,
              label: viewer.reposted ? "Undo repost" : "Repost",
              onSelect: () => toggleFlag(post, viewer, "reposted"),
            },
            {
              icon: <Glyph name="quote" size={18.75} />,
              label: "Quote",
              onSelect: () => openComposer({ quote: post }),
            },
          ]}
        />
      ) : null}
    </>
  );
}
