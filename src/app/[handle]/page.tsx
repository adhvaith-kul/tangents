"use client";
// A profile: banner, avatar, Follow / Following (or Edit profile on your own),
// name, bio, meta, counts, then Posts / Replies. An unknown handle shows X's
// "This account doesn't exist" state.
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { Shell } from "@/components/Shell";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ErrorState } from "@/components/core/ErrorState";
import { FollowButton } from "@/components/core/FollowButton";
import { Glyph } from "@/components/core/glyphs";
import { PageHeader } from "@/components/core/PageHeader";
import { RichText } from "@/components/core/RichText";
import { Spinner } from "@/components/core/Spinner";
import { Tabs } from "@/components/core/Tabs";
import { noteFollowState, useFollowing } from "@/components/core/state";
import { useResource } from "@/components/core/useResource";
import { bus } from "@/lib/client";
import { formatCount } from "@/lib/format";
import type { Account, ProfileResponse } from "@/lib/types";
import { EmptyState } from "@/components/core/EmptyState";

type ProfileTab = "posts" | "replies";
const TABS: { key: ProfileTab; label: string }[] = [
  { key: "posts", label: "Posts" },
  { key: "replies", label: "Replies" },
];

function ProfileHead({ account }: { account: Account }) {
  const following = useFollowing(account.handle, account.isFollowing) ?? account.isFollowing;
  // Followers move with an optimistic follow until the API reports it.
  const followers =
    account.followers + (following === account.isFollowing ? 0 : following ? 1 : -1);

  return (
    <div>
      {account.banner.startsWith("/") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={account.banner} alt="" className="h-[200px] w-full bg-[#333639] object-cover" />
      ) : (
        <div className="h-[200px] w-full" style={{ background: account.banner }} />
      )}
      <div className="px-4 pt-3">
        <div className="flex items-start justify-between">
          <div className="-mt-[85px] mb-3">
            <Avatar account={account} size={141.5} className="border-4 border-x-bg" />
          </div>
          {account.isSelf ? (
            <button
              type="button"
              className="h-9 rounded-full border border-[#536471] px-4 text-[15px] font-bold leading-5 text-x-text transition-colors hover:bg-x-hover"
            >
              Edit profile
            </button>
          ) : (
            <FollowButton handle={account.handle} isFollowing={account.isFollowing} />
          )}
        </div>
        <div className="mb-3 mt-1">
          <div className="flex min-w-0 items-center">
            <span className="truncate text-xl font-extrabold leading-6 text-x-text">{account.name}</span>
            {account.badge ? (
              <span className="ml-0.5 flex shrink-0">
                <VerifiedBadge badge={account.badge} size={20} />
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 truncate text-[15px] leading-5 text-x-dim">@{account.handle}</div>
        </div>
        {account.bio ? (
          <div className="mb-3 whitespace-pre-wrap break-words text-[15px] leading-5 text-x-text">
            <RichText text={account.bio} />
          </div>
        ) : null}
        <div className="mb-3 flex flex-wrap gap-x-3 text-[15px] leading-5 text-x-dim">
          {account.location ? (
            <span className="flex items-center">
              <Glyph name="location" size={18.75} className="mr-1" />
              {account.location}
            </span>
          ) : null}
          <span className="flex items-center">
            <Glyph name="calendar" size={18.75} className="mr-1" />
            Joined {account.joined}
          </span>
        </div>
        <div className="mb-3 flex flex-wrap gap-x-5 text-[14px] leading-5 text-x-dim">
          <span>
            <span className="font-bold text-x-text">{formatCount(account.following)}</span> Following
          </span>
          <span>
            <span className="font-bold text-x-text">{formatCount(Math.max(0, followers))}</span> Followers
          </span>
        </div>
      </div>
    </div>
  );
}

function MissingAccount({ handle }: { handle: string }) {
  return (
    <div>
      <div className="h-[200px] w-full bg-[#333639]" />
      <div className="px-4 pt-3">
        <div className="-mt-[85px] mb-3 h-[141.5px] w-[141.5px] rounded-full border-4 border-x-bg bg-x-card" />
        <div className="mb-3 mt-1 truncate text-xl font-extrabold leading-6 text-x-text">@{handle}</div>
      </div>
      <div className="mx-auto my-8 max-w-[400px] px-8">
        <div className="text-[31px] font-extrabold leading-9 text-x-text">This account doesn’t exist</div>
        <div className="mt-2 text-[15px] leading-5 text-x-dim">Try searching for another.</div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const params = useParams<{ handle: string }>();
  const handle = decodeURIComponent(params.handle);
  const [tab, setTab] = useState<ProfileTab>("posts");
  const { data, stale, notFound, error, reload } = useResource<ProfileResponse>(
    `/api/profile/${encodeURIComponent(handle)}?tab=${tab}`,
  );

  useEffect(() => {
    const offs = [bus.on("follow", reload), bus.on("posted", reload), bus.on("sim", reload)];
    return () => offs.forEach((off) => off());
  }, [reload]);

  useEffect(() => {
    if (data) noteFollowState(data.account.handle, data.account.isFollowing);
  }, [data]);

  // Keep the profile head on screen while the other tab loads.
  const account =
    data?.account ??
    (stale && stale.account.handle.toLowerCase() === handle.toLowerCase() ? stale.account : undefined);

  if (notFound) {
    return (
      <Shell title="Profile" back>
        <MissingAccount handle={handle} />
      </Shell>
    );
  }

  const title: ReactNode = account ? (
    <span className="flex min-w-0 items-center">
      <span className="truncate">{account.name}</span>
      {account.badge ? (
        <span className="ml-0.5 flex shrink-0">
          <VerifiedBadge badge={account.badge} size={20} />
        </span>
      ) : null}
    </span>
  ) : null;

  return (
    <Shell
      header={
        <PageHeader title={title} subtitle={data ? `${formatCount(data.postCount)} ${data.postCount === 1 ? "post" : "posts"}` : undefined} back />
      }
    >
      {account ? (
        <>
          <ProfileHead account={account} />
          <Tabs tabs={TABS} active={tab} onSelect={setTab} />
          {data ? (
            data.posts.length === 0 ? (
              <EmptyState
                title={`@${account.handle} hasn’t posted`}
                body="When they do, their posts will show up here."
              />
            ) : (
              data.posts.map((p) => <PostCard key={p.id} post={p} />)
            )
          ) : error ? (
            <ErrorState onRetry={reload} />
          ) : (
            <Spinner className="py-8" />
          )}
        </>
      ) : error ? (
        <ErrorState onRetry={reload} />
      ) : (
        <Spinner className="py-8" />
      )}
    </Shell>
  );
}
