"use client";
// X's poll: outlined buttons before voting, result bars after (or once closed).
// The reader's own poll shows its results from the start: on X the author cannot vote.
import { useState } from "react";
import { Icon } from "@/components/icons";
import { postJson, useSimNow } from "@/lib/client";
import { formatCount } from "@/lib/format";
import type { PollView } from "@/lib/types";

function timeLeft(closesAt: number, t: number): string {
  const min = Math.max(1, Math.ceil((closesAt - t) / 60_000));
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} left`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} left`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} left`;
}

/** The poll with the user's vote applied locally. */
function withVote(p: PollView, option: number): PollView {
  const votes = p.options.map((o, i) => o.votes + (i === option ? 1 : 0));
  const total = votes.reduce((a, b) => a + b, 0);
  return {
    ...p,
    choice: option,
    totalVotes: total,
    options: p.options.map((o, i) => ({ ...o, votes: votes[i], pct: total ? Math.round((votes[i] * 100) / total) : 0 })),
  };
}

export function PollBox({ postId, poll, own = false }: { postId: number; poll: PollView; own?: boolean }) {
  const t = useSimNow(30_000);
  const [local, setLocal] = useState<{ base: PollView; view: PollView } | null>(null);
  // a fresher poll from props wins over a stale local copy
  const p = local && local.base === poll ? local.view : poll;
  const closed = p.closed || t >= p.closesAt;
  const showResults = closed || own || p.choice != null;
  const lead = Math.max(...p.options.map((o) => o.votes));

  const vote = async (option: number) => {
    if (showResults) return;
    setLocal({ base: poll, view: withVote(poll, option) });
    try {
      const r = await postJson<{ poll: PollView }>("/api/poll", { postId, option });
      setLocal({ base: poll, view: r.poll });
    } catch {
      // keep the optimistic result; the next fetch reconciles
    }
  };

  return (
    <div className="mt-3 cursor-default" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-col gap-2">
        {p.options.map((o, i) =>
          showResults ? (
            <div key={i} className="relative flex h-8 items-center justify-between overflow-hidden rounded text-[15px] leading-5">
              <div
                className={`absolute inset-y-0 left-0 rounded ${o.votes === lead && lead > 0 ? "bg-x-blue/60" : "bg-[#3e4144]"}`}
                style={{ width: `${o.pct}%` }}
              />
              <span className={`relative flex min-w-0 items-center gap-1 pl-3 text-x-text ${o.votes === lead && lead > 0 ? "font-bold" : ""}`}>
                <span className="truncate">{o.label}</span>
                {p.choice === i ? <Icon name="check" size={16} className="shrink-0" /> : null}
              </span>
              <span className="relative pr-3 text-x-text">{o.pct}%</span>
            </div>
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => void vote(i)}
              className="h-8 w-full truncate rounded-full border border-x-blue px-3 text-center text-[15px] font-bold leading-5 text-x-blue transition-colors hover:bg-x-blue/10"
            >
              {o.label}
            </button>
          ),
        )}
      </div>
      <div className="mt-2 text-[15px] leading-5 text-x-dim">
        {formatCount(p.totalVotes)} vote{p.totalVotes === 1 ? "" : "s"} · {closed ? "Final results" : timeLeft(p.closesAt, t)}
      </div>
    </div>
  );
}
