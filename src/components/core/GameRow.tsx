"use client";
// One game on the scoreboard: the competition and its status, then the two
// teams with their scores (a dash before the start), or a race's top three.
// Used by the right column's Live card and Explore's Sports tab. A game with
// posts opens them; one without is not a link.
import { useRouter } from "next/navigation";
import type { GameView } from "@/lib/types";

/** "8:20 PM" in the reader's own time. */
function startTime(t: number): string {
  return new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function GameRow({ g }: { g: GameView }) {
  const router = useRouter();
  const href = g.search ? `/explore?q=${encodeURIComponent(g.search)}` : null;
  const status = g.status === "scheduled" ? startTime(g.startsAt) : g.clock;
  const head = [g.competition, g.event, status].filter(Boolean).join(" · ");
  const open = () => href && router.push(href);
  return (
    <div
      role={href ? "link" : undefined}
      tabIndex={href ? 0 : undefined}
      onClick={open}
      onKeyDown={(e) => e.key === "Enter" && open()}
      className={`px-4 py-3 ${href ? "cursor-pointer transition-colors hover:bg-x-hover-soft" : ""}`}
    >
      <div className="truncate text-[13px] leading-4 text-x-dim">{head}</div>
      {g.teams.map((t) => (
        <div key={t.name} className="mt-1 flex items-center text-[15px] font-bold leading-5 text-x-text">
          <span className="min-w-0 flex-1 truncate">{t.name}</span>
          <span className="ml-3 shrink-0 tabular-nums">{t.score ?? "–"}</span>
        </div>
      ))}
      {g.podium.map((driver, i) => (
        <div key={driver} className="mt-1 flex items-center text-[15px] font-bold leading-5 text-x-text">
          <span className="w-5 shrink-0 font-normal text-x-dim tabular-nums">{i + 1}</span>
          <span className="min-w-0 flex-1 truncate">{driver}</span>
        </div>
      ))}
    </div>
  );
}
