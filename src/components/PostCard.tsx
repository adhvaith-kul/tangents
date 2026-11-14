"use client";
// One post, as X draws it: a timeline row (feed), the focused post on its own
// page (detail), or a conversation row with a connector to the next (thread).
// The props are frozen; supporting pieces live in src/components/core/.
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { track, useDwell, useMe, useSimNow } from "@/lib/client";
import { formatCount, fullTime, timeAgo } from "@/lib/format";
import type { AccountLite, PostView } from "@/lib/types";
import { PostActions } from "./core/PostActions";
import { ArticleCardView, QuoteCard } from "./core/PostEmbeds";
import { PostMenu } from "./core/PostMenu";
import { RichText, cutText } from "./core/RichText";
import { useParentShown } from "./core/ThreadContext";
import { usePostState } from "./core/state";

export interface PostCardProps {
  post: PostView;
  /** feed: a timeline row. detail: the large focused post on its own page.
   *  thread: a timeline row with a connector line down to the next post. */
  variant?: "feed" | "detail" | "thread";
}

const stop = (e: MouseEvent) => e.stopPropagation();

/** Avatar linking to the profile, darkened slightly on hover as on X. */
function AuthorAvatar({ author, onOpen }: { author: AccountLite; onOpen: (e: MouseEvent) => void }) {
  const shape = author.kind === "outlet" || author.kind === "org" ? "rounded-[18%]" : "rounded-full";
  return (
    <Link href={`/${author.handle}`} onClick={onOpen} className="relative block h-10 w-10">
      <Avatar account={author} size={40} />
      <span className={`absolute inset-0 transition-colors hover:bg-[rgba(26,26,26,0.15)] ${shape}`} />
    </Link>
  );
}

export function PostCard({ post, variant = "feed" }: PostCardProps) {
  const router = useRouter();
  const now = useSimNow();
  const me = useMe();
  const dwellRef = useDwell(post.id);
  const { viewer, counts, hidden } = usePostState(post);
  const parentShown = useParentShown(post.replyTo?.id);

  if (post.deleted) {
    // An ancestor its author deleted: the replies below it stay.
    return (
      <div className="px-4 py-3">
        <div className="rounded-2xl border border-x-border bg-x-card px-4 py-3 text-[15px] leading-5 text-x-dim">
          This Post was deleted by the Post author.
        </div>
      </div>
    );
  }
  if (hidden && variant !== "detail") return null;

  const { author } = post;
  const isOwn = author.kind === "user" || (me != null && me.handle.toLowerCase() === author.handle.toLowerCase());
  const href = `/post/${post.id}`;

  const openPost = () => {
    track({ type: "open", postId: post.id });
    router.push(href);
  };
  const openProfile = (e: MouseEvent) => {
    e.stopPropagation();
    track({ type: "profile", handle: author.handle, postId: post.id });
  };
  const onRowClick = (e: MouseEvent) => {
    // Selecting text inside a post should not navigate away.
    if (window.getSelection()?.toString()) return;
    if (e.metaKey || e.ctrlKey) {
      track({ type: "open", postId: post.id });
      window.open(href, "_blank");
      return;
    }
    openPost();
  };

  const replying =
    post.replyTo && !parentShown ? (
      <div className="text-[15px] leading-5 text-x-dim">
        Replying to{" "}
        <Link href={`/${post.replyTo.handle}`} onClick={stop} className="text-x-blue hover:underline">
          @{post.replyTo.handle}
        </Link>
      </div>
    ) : null;

  const embeds = (
    <>
      {post.quote ? <QuoteCard quote={post.quote} /> : null}
      {post.quoteUnavailable ? (
        <div className="mt-3 rounded-2xl border border-x-border bg-x-card px-3 py-3 text-[15px] leading-5 text-x-dim">
          This Post is unavailable.
        </div>
      ) : null}
      {post.article ? <ArticleCardView article={post.article} /> : null}
    </>
  );

  const badge = author.badge ? (
    <span className="ml-0.5 flex shrink-0">
      <VerifiedBadge badge={author.badge} size={18.75} />
    </span>
  ) : null;

  if (variant === "detail") {
    return (
      <article className="px-4 pt-3">
        <div className="flex items-center">
          <div className="mr-2 shrink-0">
            <AuthorAvatar author={author} onOpen={openProfile} />
          </div>
          <div className="min-w-0 flex-1 text-[15px] leading-5">
            <div className="flex min-w-0 items-center">
              <Link
                href={`/${author.handle}`}
                onClick={openProfile}
                className="truncate font-bold text-x-text hover:underline"
              >
                {author.name}
              </Link>
              {badge}
            </div>
            <Link href={`/${author.handle}`} onClick={openProfile} className="block truncate text-x-dim">
              @{author.handle}
            </Link>
          </div>
          <div className="ml-2 self-start pt-1.5">
            <PostMenu post={post} own={isOwn} onDeleted={() => router.push("/")} />
          </div>
        </div>
        {replying ? <div className="mt-3">{replying}</div> : null}
        <div className="mt-3.5 whitespace-pre-wrap break-words text-[17px] leading-6 text-x-text">
          <RichText text={post.text} />
        </div>
        {embeds}
        <div className="my-4 text-[15px] leading-5 text-x-dim">
          <Link href={href} className="hover:underline" title={fullTime(post.createdAt)}>
            {fullTime(post.createdAt)}
          </Link>
          {counts.views > 0 ? (
            <>
              <span className="px-1">·</span>
              <span className="font-bold text-x-text">{formatCount(counts.views)}</span>{" "}
              <span className="text-sm">Views</span>
            </>
          ) : null}
        </div>
        <PostActions post={post} viewer={viewer} counts={counts} variant="detail" />
      </article>
    );
  }

  const thread = variant === "thread";
  const { text, cut } = cutText(post.text);

  return (
    <article
      ref={variant === "feed" ? dwellRef : undefined}
      onClick={onRowClick}
      className={`flex cursor-pointer px-4 pt-3 transition-colors hover:bg-x-hover-soft ${thread ? "" : "border-b border-x-border pb-3"}`}
    >
      <div className="relative mr-2 w-10 shrink-0">
        <AuthorAvatar author={author} onOpen={openProfile} />
        {thread ? (
          <div className="absolute bottom-0 left-[19px] top-[44px] z-[1] w-0.5 bg-[#333639]" />
        ) : null}
      </div>
      <div className={`min-w-0 flex-1 ${thread ? "pb-3" : ""}`}>
        <div className="flex items-start justify-between">
          <div className="flex min-w-0 items-center text-[15px] leading-5">
            <Link
              href={`/${author.handle}`}
              onClick={openProfile}
              className="min-w-0 truncate font-bold text-x-text hover:underline"
            >
              {author.name}
            </Link>
            {badge}
            <Link href={`/${author.handle}`} onClick={openProfile} className="ml-1 min-w-0 truncate text-x-dim">
              @{author.handle}
            </Link>
            <span className="shrink-0 px-1 text-x-dim">·</span>
            <Link
              href={href}
              onClick={(e) => {
                e.stopPropagation();
                track({ type: "open", postId: post.id });
              }}
              title={fullTime(post.createdAt)}
              className="shrink-0 whitespace-nowrap text-x-dim hover:underline"
            >
              {timeAgo(post.createdAt, now)}
            </Link>
          </div>
          <div className="ml-2 flex h-5 items-center">
            <PostMenu post={post} own={isOwn} />
          </div>
        </div>
        {replying}
        <div className="whitespace-pre-wrap break-words text-[15px] leading-5 text-x-text">
          <RichText text={text} />
        </div>
        {cut ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openPost();
            }}
            className="text-[15px] leading-5 text-x-blue hover:underline"
          >
            Show more
          </button>
        ) : null}
        {embeds}
        <PostActions post={post} viewer={viewer} counts={counts} variant="feed" />
      </div>
    </article>
  );
}
