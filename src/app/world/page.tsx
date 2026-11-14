"use client";
// Behind the scenes: the simulation's state, laid out in X's visual language.
import { Shell } from "@/components/Shell";
import { Avatar } from "@/components/Avatar";
import { SignedBar } from "@/components/secondary/Bar";
import { Spinner } from "@/components/secondary/Spinner";
import { Storylines } from "@/components/secondary/Storylines";
import { useApi, useSimNow } from "@/lib/client";
import { formatCount, timeAgo } from "@/lib/format";
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

export default function WorldPage() {
  const { data } = useApi<WorldResponse>("/api/world", { refreshMs: 5000 });
  const now = useSimNow();

  return (
    <Shell title="Behind the scenes">
      {!data ? (
        <Spinner />
      ) : (
        <WorldBody data={data} now={now} />
      )}
    </Shell>
  );
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

      <section>
        <Heading>Facts</Heading>
        {data.facts.map((f) => (
          <div key={f.id} className="flex gap-3 border-b border-x-border px-4 py-2.5">
            <span className="w-10 shrink-0 text-[13px] leading-5 text-x-dim">{timeAgo(f.createdAt, now)}</span>
            <span className="text-[15px] leading-5">{f.text}</span>
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
