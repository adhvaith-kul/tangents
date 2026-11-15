"use client";
// One item on the ripple, in X's visual language: a post is an avatar and its
// first words, a page its publisher and headline, a price move a ticker in green
// or red, a trend its label. Its size is fixed by CHIP_SIZE (RippleLayout.ts);
// the canvas positions it and animates it through `elRef`.
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { openFromClick } from "@/components/browser/open";
import { formatPct } from "@/lib/format";
import type { AccountLite, BeatKind, RippleNode } from "@/lib/types";

const BEAT_LABEL: Record<BeatKind, string> = {
  new_event: "New story",
  advance: "Develops",
  spinoff: "Spin-off",
  crossover: "Crossover",
  user_reaction: "You",
  wrap: "Wrapped up",
};

/** The origin's top line, worded as on the story map. */
function originLabel(n: RippleNode): string {
  const source = n.label ? ` · ${n.label}` : "";
  switch (n.origin) {
    case "headline":
      return `Real headline seed${source}`;
    case "adapted":
      return `Adapted news seed${source}`;
    case "post":
      return "Your post";
    case "whatif":
    case "you":
      return "Your What if";
    case "spinoff":
      return n.label ? `Spun off from: ${n.label}` : "Spin-off";
    default:
      return "AI Invented";
  }
}

const SMALL = "text-[11px] font-bold leading-[14px] text-x-dim";
const LABEL = "text-[11px] font-bold leading-[14px] text-x-blue";
const BODY = "text-[12px] leading-[14px] text-x-text";

function Byline({ account }: { account: AccountLite | null }) {
  if (!account) return null;
  return (
    <div className="flex min-w-0 items-center gap-1">
      <Avatar account={account} size={16} />
      <span className="min-w-0 truncate text-[12px] font-bold leading-4 text-x-text">{account.name}</span>
      <VerifiedBadge badge={account.badge} size={12} />
    </div>
  );
}

function Faces({ faces, size }: { faces: AccountLite[]; size: number }) {
  return (
    <span className="flex shrink-0 -space-x-1">
      {faces.map((f) => (
        <span key={f.handle} className="rounded-full ring-2 ring-black">
          <Avatar account={f} size={size} />
        </span>
      ))}
    </span>
  );
}

function Body({ node, countRef }: { node: RippleNode; countRef: (el: HTMLElement | null) => void }) {
  switch (node.kind) {
    case "origin":
      return (
        <>
          <div className="truncate text-[12px] leading-4 text-x-dim">{originLabel(node)}</div>
          <div className="mt-1 line-clamp-3 text-[14px] font-bold leading-[18px] text-x-text">{node.text}</div>
        </>
      );
    case "beat":
      return (
        <>
          <div className={LABEL}>{node.beatKind ? BEAT_LABEL[node.beatKind] : "Develops"}</div>
          <div className={`mt-0.5 line-clamp-2 ${BODY}`}>{node.text}</div>
        </>
      );
    case "page":
      return (
        <>
          <Byline account={node.account} />
          <div className="mt-0.5 line-clamp-2 text-[12px] font-bold leading-[14px] text-x-text">{node.text}</div>
        </>
      );
    case "meme":
      return (
        <div className="flex h-full gap-2">
          {node.thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={node.thumb} alt="" draggable={false} className="h-10 w-10 shrink-0 rounded-md object-cover" />
          ) : null}
          <div className="min-w-0">
            <div className="truncate text-[12px] font-bold leading-4">{node.account?.name}</div>
            <div className={`line-clamp-2 ${BODY}`}>{node.text}</div>
          </div>
        </div>
      );
    case "tiers":
      return (
        <>
          <Byline account={node.account} />
          <div className="mt-0.5 flex items-center gap-1.5">
            {node.faces?.length ? <Faces faces={node.faces} size={14} /> : null}
            <span className={`min-w-0 truncate ${BODY}`}>{node.text}</span>
          </div>
        </>
      );
    case "move": {
      const up = (node.pct ?? 0) >= 0;
      return (
        <>
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-bold leading-4">{node.ticker}</span>
            <span
              className={`rounded px-1 text-[12px] font-bold leading-4 tabular-nums ${up ? "bg-x-green/15 text-x-green" : "bg-x-red/15 text-x-red"}`}
            >
              {formatPct(node.pct ?? 0)}
            </span>
          </div>
          <div className="truncate text-[11px] leading-[14px] text-x-dim">{node.text}</div>
        </>
      );
    }
    case "trend":
      return (
        <>
          <div className="text-[11px] leading-[14px] text-x-dim">Trending</div>
          <div className="truncate text-[13px] font-bold leading-4">{node.text}</div>
        </>
      );
    case "note":
      return (
        <>
          <div className={`truncate ${SMALL}`}>Readers added context</div>
          <div className={`mt-0.5 line-clamp-2 ${BODY}`}>{node.text}</div>
        </>
      );
    case "replies":
      return (
        <div className="flex h-full items-center gap-1.5">
          {node.faces?.length ? <Faces faces={node.faces} size={16} /> : null}
          <span ref={countRef} className="truncate text-[12px] font-bold leading-4 text-x-dim">
            +{node.arrivals?.length ?? 0} replies
          </span>
        </div>
      );
    case "spinoff":
      return (
        <>
          <div className={LABEL}>Spin-off</div>
          <div className="mt-0.5 line-clamp-2 text-[12px] font-bold leading-[14px] text-x-text">{node.text}</div>
        </>
      );
    default:
      // post and poll
      return (
        <>
          <Byline account={node.account} />
          <div className={`mt-0.5 line-clamp-2 ${BODY}`}>{node.text}</div>
        </>
      );
  }
}

export function RippleChip({
  node, style, elRef, countRef,
}: {
  node: RippleNode;
  style: CSSProperties;
  elRef: (el: HTMLElement | null) => void;
  countRef: (el: HTMLElement | null) => void;
}) {
  const ring =
    node.kind === "origin" ? "border-2 border-x-blue" : node.kind === "beat" ? "border border-x-blue/60" : "border border-x-border";
  const pad = node.kind === "origin" ? "px-3 py-2" : node.kind === "replies" ? "px-2 py-1" : "px-2.5 py-[5px]";
  const className = `absolute block overflow-hidden rounded-2xl bg-x-bg text-left transition-colors hover:bg-x-card ${ring} ${pad}`;
  const body: ReactNode = <Body node={node} countRef={countRef} />;
  const common = { ref: elRef, className, style, draggable: false, title: node.kind === "move" ? node.text : undefined };
  const page = node.page;
  if (node.href && page) {
    return (
      <a {...common} href={node.href} onClick={(e) => openFromClick(e, page)}>
        {body}
      </a>
    );
  }
  if (node.href && node.external) {
    return (
      <a {...common} href={node.href} target="_blank" rel="noopener noreferrer">
        {body}
      </a>
    );
  }
  if (node.href) {
    return (
      <Link {...common} href={node.href}>
        {body}
      </Link>
    );
  }
  return <div {...common}>{body}</div>;
}
