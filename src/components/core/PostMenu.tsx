"use client";
// The "More" caret on a post. On someone else's post: "Not interested in this
// post" and "Follow / Unfollow @handle" (a post carries no follow state, so the
// first time the menu is wanted for an author it asks the profile route). On
// the user's own post: "Delete", confirmed in a dialog.
import { useState } from "react";
import { Icon } from "@/components/icons";
import { bus, getJson } from "@/lib/client";
import type { PostView, ProfileResponse } from "@/lib/types";
import { DeleteDialog } from "./DeleteDialog";
import { Glyph } from "./glyphs";
import { Menu, type MenuItem } from "./Menu";
import { deleteOwnPost, hidePost, noteFollowState, setFollow, showLess, useFollowing } from "./state";
import { toast } from "./toast";

const asked = new Set<string>();
if (typeof window !== "undefined") bus.on("sim", () => asked.clear());

function learnFollowState(handle: string) {
  if (asked.has(handle)) return;
  asked.add(handle);
  getJson<ProfileResponse>(`/api/profile/${encodeURIComponent(handle)}?tab=posts`)
    .then((r) => noteFollowState(handle, r.account.isFollowing))
    .catch(() => asked.delete(handle));
}

export function PostMenu({
  post,
  own = false,
  onDeleted,
}: {
  post: PostView;
  /** The post belongs to the user. */
  own?: boolean;
  /** Called after the user's post has been deleted. */
  onDeleted?: () => void;
}) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [confirming, setConfirming] = useState(false);
  const { handle } = post.author;
  const following = useFollowing(handle);

  const items: MenuItem[] = own
    ? [
        {
          icon: <Glyph name="trash" size={18.75} />,
          label: "Delete",
          danger: true,
          onSelect: () => setConfirming(true),
        },
      ]
    : [
        {
          icon: <Glyph name="frown" size={18.75} />,
          label: "Not interested in this post",
          onSelect: () => hidePost(post.id),
        },
        {
          icon: <Glyph name="personX" size={18.75} />,
          label: `Show less from @${post.author.handle}`,
          onSelect: () => {
            showLess(post.id, post.author.handle);
            toast(`You’ll see less from @${post.author.handle}`);
          },
        },
      ];
  if (!own && following !== undefined) {
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
        onPointerEnter={() => !own && following === undefined && learnFollowState(handle)}
        onClick={(e) => {
          e.stopPropagation();
          if (!own && following === undefined) learnFollowState(handle);
          setAnchor(e.currentTarget.getBoundingClientRect());
        }}
        className="group relative flex shrink-0 items-center justify-center text-x-dim transition-colors hover:text-x-blue"
      >
        <span className="absolute -inset-2 rounded-full transition-colors group-hover:bg-x-blue/10" />
        <Icon name="more" size={18.75} className="relative" />
      </button>
      {anchor ? <Menu anchor={anchor} items={items} onClose={() => setAnchor(null)} /> : null}
      {confirming ? (
        <DeleteDialog
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            void deleteOwnPost(post.id).then((ok) => {
              toast(ok ? "Your post was deleted" : "Something went wrong, but don’t fret — let’s give it another shot.");
              if (ok) onDeleted?.();
            });
          }}
        />
      ) : null}
    </>
  );
}
