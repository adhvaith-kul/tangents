"use client";
// Follow / Following, as on X: a light pill to follow; once following, an
// outlined pill that turns red and reads "Unfollow" on hover.
import { useState } from "react";
import { setFollow, useFollowing } from "./state";

export function FollowButton({
  handle,
  isFollowing,
  size = "md",
}: {
  handle: string;
  /** What the API last reported. */
  isFollowing: boolean;
  /** sm: 32px, 14px text (Who to follow). md: 36px, 15px text (profile). */
  size?: "sm" | "md";
}) {
  const following = useFollowing(handle, isFollowing) ?? false;
  const [hover, setHover] = useState(false);
  const box = size === "sm" ? "h-8 px-4 text-[14px]" : "h-9 px-4 text-[15px]";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setHover(false);
        void setFollow(handle, !following);
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`shrink-0 rounded-full font-bold leading-5 transition-colors ${box} ${
        following
          ? "min-w-[104px] border border-[#536471] text-x-text hover:border-[#67070f] hover:bg-x-red/10 hover:text-x-red"
          : "bg-x-button text-[#0f1419] hover:bg-x-button-hover"
      }`}
    >
      {following ? (hover ? "Unfollow" : "Following") : "Follow"}
    </button>
  );
}
