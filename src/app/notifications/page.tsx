"use client";
// Notifications, in X's row styles.
import Link from "next/link";
import { Shell } from "@/components/Shell";
import { PostCard } from "@/components/PostCard";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/icons";
import { Spinner } from "@/components/secondary/Spinner";
import { useApi } from "@/lib/client";
import type { AccountLite, NotificationView } from "@/lib/types";

const ICONS = {
  like: { name: "likeFilled", colour: "text-x-pink", verb: "liked your post" },
  repost: { name: "repost", colour: "text-x-green", verb: "reposted your post" },
  follow: { name: "person", colour: "text-x-blue", verb: "followed you" },
} as const;

function Summary({ actors, count, verb }: { actors: AccountLite[]; count: number; verb: string }) {
  const first = actors[0];
  const others = Math.max(0, count - 1);
  return (
    <div className="text-[15px] leading-5">
      <span className="font-bold">{first.name}</span>
      {others > 0 && ` and ${others} other${others === 1 ? "" : "s"}`} {verb}
    </div>
  );
}

function GroupRow({ n }: { n: NotificationView }) {
  if (n.type !== "like" && n.type !== "repost" && n.type !== "follow") return null;
  if (n.actors.length === 0) return null;
  const spec = ICONS[n.type];
  const href = n.type === "follow" ? `/${n.actors[0].handle}` : n.target ? `/post/${n.target.id}` : null;
  const body = (
    <div className={`flex gap-3 border-b border-x-border px-4 py-3 ${n.read ? "" : "bg-[rgba(29,155,240,0.07)]"} ${href ? "hover:bg-x-hover-soft" : ""}`}>
      <div className={`flex w-10 shrink-0 justify-end pt-0.5 ${spec.colour}`}>
        <Icon name={spec.name} size={28} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex gap-2">
          {n.actors.slice(0, 8).map((a) => (
            <Avatar key={a.handle} account={a} size={32} />
          ))}
        </div>
        <Summary actors={n.actors} count={n.count} verb={spec.verb} />
        {n.target && <div className="mt-1 whitespace-pre-wrap text-[15px] leading-5 text-x-dim">{n.target.text}</div>}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}

export default function NotificationsPage() {
  const { data } = useApi<{ notifications: NotificationView[] }>("/api/notifications", { refreshMs: 5000 });
  return (
    <Shell title="Notifications">
      {!data ? (
        <Spinner />
      ) : (
        data.notifications.map((n) =>
          n.post ? (
            <div key={n.id} className={n.read ? "" : "bg-[rgba(29,155,240,0.07)]"}>
              <PostCard post={n.post} />
            </div>
          ) : (
            <GroupRow key={n.id} n={n} />
          ),
        )
      )}
    </Shell>
  );
}
