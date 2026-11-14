"use client";
// The "More" caret on a post: "Not interested in this post" and
// "Follow / Unfollow @handle". A post carries no follow state, so the first
// time the menu is wanted for an author it asks the profile route.
import { useState } from "react";
import { Icon } from "@/components/icons";
import { bus, getJson } from "@/lib/client";
import type { PostView, ProfileResponse } from "@/lib/types";
import { Glyph } from "./glyphs";
import { Menu, type MenuItem } from "./Menu";
import { hidePost, noteFollowState, setFollow, useFollowing } from "./state";

const asked = new Set<string>();
if (typeof window !== "undefined") bus.on("sim", () => asked.clear());

function learnFollowState(handle: string) {
  if (asked.has(handle)) return;
  asked.add(handle);
  getJson<ProfileResponse>(`/api/profile/${encodeURIComponent(handle)}?tab=posts`)
    .then((r) => noteFollowState(handle, r.account.isFollowing))
    .catch(() => asked.delete(handle));
}

export function PostMenu({ post }: { post: PostView }) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const { handle } = post.author;
  const following = useFollowing(handle);

  const items: MenuItem[] = [
    {
      icon: <Glyph name="frown" size={18.75} />,
      label: "Not interested in this post",
      onSelect: () => hidePost(post.id),
    },
  ];
  if (following !== undefined) {
    items.push({
      icon: <Glyph name={following ? "personX" : "personPlus"} size={18.75} />,
      label: `${following ? "Unfollow" : "Follow"} @${handle}`,
      onSelect: () => void setFollow(handle, !following, post.id),
    });
  }

  return (
    <>
      <button
        type="button"
        aria-label="More"
        onPointerEnter={() => following === undefined && learnFollowState(handle)}
        onClick={(e) => {
          e.stopPropagation();
          if (following === undefined) learnFollowState(handle);
          setAnchor(e.currentTarget.getBoundingClientRect());
        }}
        className="group relative flex shrink-0 items-center justify-center text-x-dim transition-colors hover:text-x-blue"
      >
        <span className="absolute -inset-2 rounded-full transition-colors group-hover:bg-x-blue/10" />
        <Icon name="more" size={18.75} className="relative" />
      </button>
      {anchor ? <Menu anchor={anchor} items={items} onClose={() => setAnchor(null)} /> : null}
    </>
  );
}
