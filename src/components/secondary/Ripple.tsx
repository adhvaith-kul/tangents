"use client";
// The ripple screen: one storyline's origin at the centre and everything it set
// off around it, replayed in the order it happened. Opened from the story map.
import { EmptyState } from "@/components/core/EmptyState";
import { PageHeader } from "@/components/core/PageHeader";
import { Shell } from "@/components/Shell";
import { Spinner } from "@/components/secondary/Spinner";
import { useApi } from "@/lib/client";
import type { RippleResponse } from "@/lib/types";
import { RippleCanvas } from "./RippleCanvas";

const LEFT_NOUN: Record<RippleResponse["left"][number]["kind"], string> = {
  replies: "replies",
  posts: "posts",
  memes: "memes",
  beats: "developments",
  other: "more",
};

/** "+41 replies, +3 posts not shown", or null when nothing was left out. */
function footnote(left: RippleResponse["left"]): string | null {
  if (!left.length) return null;
  return `${left.map((l) => `+${l.count} ${LEFT_NOUN[l.kind]}`).join(", ")} not shown`;
}

export function RippleScreen({ storylineId }: { storylineId: number | null }) {
  const { data, error } = useApi<RippleResponse>(storylineId != null ? `/api/ripple?storyline=${storylineId}` : null);
  // A link to another storyline's ripple keeps this page; show nothing stale meanwhile.
  const current = data?.storyline?.id === storylineId ? data : undefined;

  let body: React.ReactNode;
  if (storylineId == null || (error && !current)) {
    body = (
      <div className="p-8 text-center text-[15px] text-x-dim">
        {storylineId == null || error?.startsWith("404") ? "This story could not be found." : "The ripple could not be loaded."}
      </div>
    );
  } else if (!current) {
    body = <Spinner />;
  } else if (current.nodes.length === 0) {
    body = <EmptyState title="Nothing yet" body="Once this story has its first development, what it set off will show up here." />;
  } else {
    body = <RippleCanvas key={current.storyline!.id} nodes={current.nodes} footnote={footnote(current.left)} />;
  }

  return (
    <Shell header={<PageHeader back title="Ripple" subtitle={current?.storyline?.title} />}>
      {body}
    </Shell>
  );
}
