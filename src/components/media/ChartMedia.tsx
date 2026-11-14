"use client";
// A cashtag-style stock card: ticker, price, day change and an area chart.
import { useId } from "react";
import { useApi } from "@/lib/client";
import { formatPct, formatPrice } from "@/lib/format";
import type { MarketsResponse } from "@/lib/types";
import { MediaFrame } from "./MediaFrame";

const W = 518;
const H = 200;
const PAD = 8;

export function ChartMedia({ ticker }: { ticker: string }) {
  const { data } = useApi<MarketsResponse>("/api/markets", { refreshMs: 10_000 });
  const gid = useId();
  const stock = data?.stocks.find((s) => s.ticker.toLowerCase() === ticker.replace(/^\$/, "").toLowerCase());
  if (!stock) return null;

  const up = stock.changePct >= 0;
  const pts = stock.history.length >= 2 ? stock.history : [stock.dayOpen, stock.price];
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const xy = pts.map((p, i): [number, number] => [
    (i / (pts.length - 1)) * W,
    PAD + (1 - (p - min) / span) * (H - 2 * PAD),
  ]);
  const line = xy.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
  const area = `${line}L${W} ${H}L0 ${H}Z`;
  const color = up ? "var(--color-x-green)" : "var(--color-x-red)";

  return (
    <MediaFrame>
      <div className="px-4 pt-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-bold leading-5 text-x-text">${stock.ticker}</span>
          <span className="truncate text-[15px] leading-5 text-x-dim">{stock.name}</span>
        </div>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="text-[23px] font-bold leading-7 text-x-text">${formatPrice(stock.price)}</span>
          <span className={`text-[15px] font-bold ${up ? "text-x-green" : "text-x-red"}`}>{formatPct(stock.changePct)}</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 block w-full" role="img" aria-label={`${stock.ticker} price chart`}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </MediaFrame>
  );
}
