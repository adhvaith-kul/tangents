"use client";
// Behind the scenes, in X's visual language. Two tabs: the story map (what the
// world has written, in order) and the details of the simulation's state.
// /world?tab=details opens the second.
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Shell } from "@/components/Shell";
import { Avatar } from "@/components/Avatar";
import { SignedBar } from "@/components/secondary/Bar";
import { PageHeader } from "@/components/core/PageHeader";
import { Spinner } from "@/components/secondary/Spinner";
import { StoryMap } from "@/components/secondary/StoryMap";
import { Storylines } from "@/components/secondary/Storylines";
import { useApi, useSimNow } from "@/lib/client";
import { formatCount, fullTime, timeAgo } from "@/lib/format";
import type { AccountLite, PrefKind, WorldResponse } from "@/lib/types";

const KINDS: { kind: PrefKind; title: string }[] = [
  { kind: "author", title: "Accounts" },
  { kind: "topic", title: "Topics" },
  { kind: "domain", title: "Domains" },
  { kind: "tone", title: "Tones" },
  { kind: "storyline", title: "Storylines" },
];

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="border-b border-x-border px-4 py-3 text-xl font-extrabold">{children}</h2>;
}

type Tab = "map" | "details";

const TABS: { key: Tab; label: string }[] = [
  { key: "map", label: "Story map" },
  { key: "details", label: "Details" },
];

/** The same tab bar as Home: equal halves, a blue bar under the active label. */
function Tabs({ active, onSelect }: { active: Tab; onSelect: (key: Tab) => void }) {
  return (
    <div role="tablist" className="flex border-b border-x-border">
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onSelect(t.key)}
            className="flex h-[53px] flex-1 justify-center px-4 transition-colors hover:bg-x-hover"
          >
            <span
              className={`relative flex h-full items-center text-[15px] leading-5 ${on ? "font-bold text-x-text" : "font-medium text-x-dim"}`}
            >
              {t.label}
              {on ? (
                <span className="absolute bottom-0 left-1/2 h-1 w-full min-w-14 -translate-x-1/2 rounded-full bg-x-blue" />
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function WorldPage() {
  // useSearchParams needs a Suspense boundary above it.
  return (
    <Suspense fallback={null}>
      <World />
    </Suspense>
  );
}

function World() {
  const router = useRouter();
  const tab: Tab = useSearchParams().get("tab") === "details" ? "details" : "map";
  const select = (key: Tab) => router.replace(key === "details" ? "/world?tab=details" : "/world", { scroll: false });

  return (
    <Shell
      header={
        <>
          <PageHeader title="Behind the scenes" />
          <Tabs active={tab} onSelect={select} />
        </>
      }
    >
      {tab === "map" ? <StoryMap /> : <Details />}
    </Shell>
  );
}

function Details() {
  const { data } = useApi<WorldResponse>("/api/world", { refreshMs: 5000 });
  const now = useSimNow();
  return data ? <WorldBody data={data} now={now} /> : <Spinner />;
}

function WorldBody({ data, now }: { data: WorldResponse; now: number }) {
  const people = new Map<string, AccountLite>();
  for (const r of data.relationships) {
    people.set(r.a.handle, r.a);
    people.set(r.b.handle, r.b);
  }
  const maxW = Math.max(1, ...data.taste.weights.map((w) => Math.abs(w.weight)));

  return (
    <>
      <section>
        <Heading>Storylines</Heading>
        <Storylines storylines={data.storylines} people={people} />
      </section>

      <section>
        <Heading>Relationships</Heading>
        {data.relationships.map((r) => (
          <div key={`${r.a.handle}-${r.b.handle}`} className="border-b border-x-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Avatar account={r.a} size={24} />
              <span className="min-w-0 truncate text-[15px] font-bold">{r.a.name}</span>
              <span className="text-x-dim">and</span>
              <Avatar account={r.b} size={24} />
              <span className="min-w-0 truncate text-[15px] font-bold">{r.b.name}</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <SignedBar value={r.score} max={10} width={160} />
              <span className={`w-8 text-[13px] font-bold tabular-nums ${r.score >= 0 ? "text-x-green" : "text-x-red"}`}>
                {r.score > 0 ? "+" : ""}
                {r.score}
              </span>
            </div>
            {r.note && <p className="mt-1.5 text-[15px] leading-5 text-x-dim">{r.note}</p>}
          </div>
        ))}
      </section>

      {data.stands.length > 0 && (
        <section>
          <Heading>Where they stand</Heading>
          {data.stands.map((s) => (
            <div key={s.account.handle} className="border-b border-x-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Avatar account={s.account} size={24} />
                <span className="min-w-0 truncate text-[15px] font-bold">{s.account.name}</span>
                <span className="shrink-0 text-[13px] text-x-dim">{timeAgo(s.updatedAt, now)}</span>
              </div>
              <p className="mt-1.5 text-[15px] leading-5 text-x-dim">{s.note}</p>
            </div>
          ))}
        </section>
      )}

      <section>
        <Heading>Facts</Heading>
        {data.facts.map((f) => (
          <div key={f.id} className="flex gap-3 border-b border-x-border px-4 py-2.5">
            <span className="w-10 shrink-0 text-[13px] leading-5 text-x-dim">{timeAgo(f.createdAt, now)}</span>
            <span className="text-[15px] leading-5">
              {f.text}
              {f.dueAt != null && <span className="mt-0.5 block text-[13px] text-x-dim">Due {fullTime(f.dueAt)}</span>}
            </span>
          </div>
        ))}
      </section>

      <section>
        <Heading>Your algorithm</Heading>
        <div className="border-b border-x-border px-4 py-3 text-[13px] text-x-dim">
          {formatCount(data.taste.signals)} signals recorded
        </div>
        {KINDS.map(({ kind, title }) => {
          const rows = data.taste.weights.filter((w) => w.kind === kind);
          if (rows.length === 0) return null;
          return (
            <div key={kind} className="border-b border-x-border px-4 py-3">
              <div className="mb-2 text-[13px] font-bold text-x-dim">{title}</div>
              <div className="space-y-2">
                {rows.map((w) => (
                  <div key={w.key} className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate text-[15px]">{w.label}</span>
                    <SignedBar value={w.weight} max={maxW} width={160} />
                    <span className="w-12 text-right text-[13px] tabular-nums text-x-dim">
                      {w.weight > 0 ? "+" : ""}
                      {w.weight.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <section>
        <Heading>Model usage</Heading>
        <table className="w-full text-[15px] tabular-nums">
          <thead>
            <tr className="border-b border-x-border text-left text-[13px] text-x-dim">
              <th className="px-4 py-2 font-normal">Role</th>
              <th className="px-2 py-2 text-right font-normal">Calls</th>
              <th className="px-2 py-2 text-right font-normal">Input tokens</th>
              <th className="px-4 py-2 text-right font-normal">Output tokens</th>
            </tr>
          </thead>
          <tbody>
            {data.usage.byRole.map((r) => (
              <tr key={r.role} className="border-b border-x-border">
                <td className="px-4 py-2">{r.role}</td>
                <td className="px-2 py-2 text-right">{formatCount(r.calls)}</td>
                <td className="px-2 py-2 text-right">{formatCount(r.inputTokens)}</td>
                <td className="px-4 py-2 text-right">{formatCount(r.outputTokens)}</td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className="px-4 py-2">Total</td>
              <td className="px-2 py-2 text-right">{formatCount(data.usage.calls)}</td>
              <td className="px-2 py-2 text-right">{formatCount(data.usage.inputTokens)}</td>
              <td className="px-4 py-2 text-right">{formatCount(data.usage.outputTokens)}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </>
  );
}
