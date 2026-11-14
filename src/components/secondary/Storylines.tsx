"use client";
// The storyline tree for Behind the scenes: children indented under parents.
import { Avatar } from "@/components/Avatar";
import { useSimNow } from "@/lib/client";
import { timeAgo } from "@/lib/format";
import type { AccountLite, StorylineView } from "@/lib/types";

function Chip({ children, tone = "" }: { children: React.ReactNode; tone?: string }) {
  return (
    <span className={`rounded-full border border-x-border px-2 py-px text-[12px] leading-4 ${tone || "text-x-dim"}`}>
      {children}
    </span>
  );
}

function Node({
  s,
  depth,
  kids,
  people,
  now,
}: {
  s: StorylineView;
  depth: number;
  kids: Map<number, StorylineView[]>;
  people: Map<string, AccountLite>;
  now: number;
}) {
  const open = s.status === "open";
  const origin =
    s.origin === "headline" ? (s.headline ? `Headline: ${s.headline}` : "Headline") : s.origin === "spinoff" ? "Spinoff" : s.origin === "user" ? "You" : "Original";
  return (
    <>
      <div className="border-b border-x-border py-3 pr-4" style={{ paddingLeft: 16 + depth * 24 }}>
        <div className="flex items-start gap-2">
          {depth > 0 && <span className="select-none text-x-dim">└</span>}
          <div className={`min-w-0 flex-1 ${open ? "" : "opacity-60"}`}>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[15px] font-bold">{s.title}</span>
              <Chip tone={open ? "text-x-green" : "text-x-dim"}>{open ? "Open" : "Dormant"}</Chip>
              <Chip>{origin}</Chip>
            </div>
            <div className="mt-1 text-[13px] text-x-dim">
              {s.domain} · {s.tone} · heat {s.heat}/10 · {s.beats} beat{s.beats === 1 ? "" : "s"} · updated {timeAgo(s.updatedAt, now)}
            </div>
            <div className="mt-1.5 h-1 w-24 rounded-full bg-x-search">
              <div className="h-1 rounded-full bg-x-blue" style={{ width: `${Math.min(100, Math.max(0, s.heat * 10))}%` }} />
            </div>
            {s.participants.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {s.participants.map((p) => (
                  <span key={p.handle} title={`@${p.handle}`}>
                    <Avatar account={p} size={24} />
                  </span>
                ))}
              </div>
            )}
            {s.summary && <p className="mt-2 text-[15px] leading-5">{s.summary}</p>}
          </div>
        </div>
      </div>
      {(kids.get(s.id) ?? []).map((c) => (
        <Node key={c.id} s={c} depth={depth + 1} kids={kids} people={people} now={now} />
      ))}
    </>
  );
}

export function Storylines({ storylines, people }: { storylines: StorylineView[]; people: Map<string, AccountLite> }) {
  const now = useSimNow();
  const ids = new Set(storylines.map((s) => s.id));
  const kids = new Map<number, StorylineView[]>();
  const roots: StorylineView[] = [];
  for (const s of storylines) {
    if (s.parentId != null && ids.has(s.parentId)) {
      kids.set(s.parentId, [...(kids.get(s.parentId) ?? []), s]);
    } else roots.push(s);
  }
  return (
    <>
      {roots.map((s) => (
        <Node key={s.id} s={s} depth={0} kids={kids} people={people} now={now} />
      ))}
    </>
  );
}
