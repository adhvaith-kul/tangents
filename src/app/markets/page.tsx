"use client";
// Markets: one row per ticker, then what moved the market.
import { Shell } from "@/components/Shell";
import { Sparkline } from "@/components/Sparkline";
import { Pill } from "@/components/secondary/Pill";
import { Spinner } from "@/components/secondary/Spinner";
import { useApi, useSimNow } from "@/lib/client";
import { formatPct, formatPrice, timeAgo } from "@/lib/format";
import type { MarketsResponse } from "@/lib/types";

export default function MarketsPage() {
  const { data } = useApi<MarketsResponse>("/api/markets", { refreshMs: 5000 });
  const now = useSimNow();

  return (
    <Shell title="Markets">
      {!data ? (
        <Spinner />
      ) : (
        <>
          {data.stocks.map((s) => (
            <div key={s.ticker} className="flex items-center gap-4 border-b border-x-border px-4 py-3">
              <div className="w-[120px] min-w-0">
                <div className="font-bold">{s.ticker}</div>
                <div className="truncate text-[13px] text-x-dim">{s.name}</div>
              </div>
              <div className="flex flex-1 justify-center">
                <Sparkline points={s.history} up={s.changePct >= 0} width={160} height={36} />
              </div>
              <div className="w-[96px] text-right font-bold tabular-nums">{formatPrice(s.price)}</div>
              <Pill pct={s.changePct} />
            </div>
          ))}
          <h2 className="border-b border-x-border px-4 py-3 text-xl font-extrabold">What moved the market</h2>
          {data.moves.map((m, i) => (
            <div key={`${m.ticker}-${m.t}-${i}`} className="border-b border-x-border px-4 py-3">
              <div className="flex items-center gap-2 text-[13px] text-x-dim">
                <span>{timeAgo(m.t, now)}</span>
                <span className="font-bold text-x-text">{m.ticker}</span>
                <span className={`font-bold tabular-nums ${m.pct >= 0 ? "text-x-green" : "text-x-red"}`}>
                  {formatPct(m.pct)}
                </span>
              </div>
              <div className="mt-0.5 text-[15px]">{m.reason}</div>
            </div>
          ))}
        </>
      )}
    </Shell>
  );
}
