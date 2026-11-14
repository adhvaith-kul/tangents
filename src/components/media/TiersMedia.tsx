"use client";
// A tier list: coloured labels down the left, the ranked accounts' pictures in
// rows beside them, drawn the way the tier-list images that circulate on X look.
import Link from "next/link";
import { MediaFrame } from "./MediaFrame";
import type { TierRow } from "@/lib/types";

// Top tier to bottom, the customary colours.
const COLOURS = ["#ff7f7f", "#ffbf7f", "#ffdf7f", "#bfff7f", "#7fbfff", "#bf7fff", "#ff7fbf"];

export function TiersMedia({ tiers }: { tiers: TierRow[] }) {
  return (
    <MediaFrame className="bg-[#1a1a17]">
      {tiers.map((tier, i) => (
        <div key={i} className="flex min-h-[72px] border-b border-black last:border-b-0">
          <div
            className="flex w-[72px] shrink-0 items-center justify-center px-1 text-center text-[11px] font-extrabold uppercase leading-[13px] text-black"
            style={{ background: COLOURS[i % COLOURS.length] }}
          >
            {tier.label}
          </div>
          <div className="flex flex-wrap">
            {tier.members.map((m) => (
              <Link key={m.handle} href={`/${m.handle}`} title={m.name} className="block h-[72px] w-[72px] bg-x-border">
                {m.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.avatar} alt={m.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[12px] font-bold text-x-text">
                    {m.name}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </MediaFrame>
  );
}
