"use client";
// The compose dialog opened by the Post button, a reply icon or "Quote": a
// 600px black panel over X's blue-grey backdrop. When replying it shows the
// parent post joined to the composer by the thread line.
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/icons";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useSimNow } from "@/lib/client";
import { timeAgo } from "@/lib/format";
import type { PostView } from "@/lib/types";
import { Composer } from "./Composer";
import { RichText } from "./RichText";
import { closeComposer, useComposerTarget } from "./state";

function ParentPost({ post }: { post: PostView }) {
  const now = useSimNow();
  const { author } = post;
  return (
    <div className="flex px-4 pt-1">
      <div className="mr-2 flex w-10 shrink-0 flex-col items-center">
        <Avatar account={author} size={40} />
        <div className="-mb-2 mt-1 w-0.5 flex-1 bg-[#333639]" />
      </div>
      <div className="min-w-0 flex-1 pb-3 text-[15px] leading-5">
        <div className="flex min-w-0 items-center">
          <span className="truncate font-bold text-x-text">{author.name}</span>
          {author.badge ? (
            <span className="ml-0.5 flex shrink-0">
              <VerifiedBadge badge={author.badge} size={18.75} />
            </span>
          ) : null}
          <span className="ml-1 truncate text-x-dim">@{author.handle}</span>
          <span className="shrink-0 px-1 text-x-dim">·</span>
          <span className="shrink-0 text-x-dim">{timeAgo(post.createdAt, now)}</span>
        </div>
        <div className="whitespace-pre-wrap break-words text-x-text">
          <RichText text={post.text} />
        </div>
        <div className="pt-3 text-x-dim">
          Replying to <span className="text-x-blue">@{author.handle}</span>
        </div>
      </div>
    </div>
  );
}

export function ComposerDialog() {
  const target = useComposerTarget();
  const open = target != null;

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && closeComposer();
    window.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", key);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!target) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-[rgba(91,112,131,0.4)]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeComposer();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="mb-auto mt-[5vh] flex max-h-[90vh] w-[600px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl bg-x-bg"
      >
        <div className="flex h-[53px] shrink-0 items-center px-4">
          <button
            type="button"
            aria-label="Close"
            onClick={closeComposer}
            className="-ml-2 flex h-[34px] w-[34px] items-center justify-center rounded-full text-x-text transition-colors hover:bg-x-hover"
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto pb-1">
          {target.replyTo ? <ParentPost post={target.replyTo} /> : null}
          <Composer
            variant="dialog"
            replyTo={target.replyTo}
            quote={target.quote}
            autoFocus
            onDone={closeComposer}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
