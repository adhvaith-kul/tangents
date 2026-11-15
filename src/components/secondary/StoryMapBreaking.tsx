"use client";
// Breaking news: the reader asks the world for a major event without saying
// what it is. A small menu picks only how big ("Surprise me" or a scale the
// settings allow); the world plans it in secret, and the only answer is a quiet
// toast. Also the mark a major event's storyline carries once it has broken.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, type MenuItem } from "@/components/core/Menu";
import { toast } from "@/components/core/toast";
import { errorText } from "@/components/extras/errorText";
import { bus, postJson } from "@/lib/client";
import type { ArcScale, BreakingChoice, SimStatus } from "@/lib/types";

const LABEL: Record<BreakingChoice, string> = {
  surprise: "Surprise me",
  scandal: "A scandal",
  national: "A national story",
  global: "A global event",
};

export function BreakingNews({ scales }: { scales: ArcScale[] }) {
  const router = useRouter();
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [busy, setBusy] = useState(false);

  const start = async (choice: BreakingChoice) => {
    setBusy(true);
    try {
      await postJson<SimStatus>("/api/sim", { breaking: choice });
      bus.emit("sim");
      toast("Something is coming.");
    } catch (e) {
      toast(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const items: MenuItem[] = scales.length
    ? (["surprise", ...scales] as BreakingChoice[]).map((c) => ({ label: LABEL[c], onSelect: () => void start(c) }))
    : [{ label: "Turn on a kind of major event in Settings", onSelect: () => router.push("/settings/events") }];

  return (
    <>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={anchor != null}
        disabled={busy}
        onClick={(e) => setAnchor(e.currentTarget.getBoundingClientRect())}
        className="h-9 shrink-0 rounded-full border border-x-border px-4 text-[14px] font-bold leading-4 text-x-text transition-colors hover:bg-x-hover disabled:opacity-50"
      >
        Breaking news
      </button>
      {anchor ? <Menu anchor={anchor} items={items} onClose={() => setAnchor(null)} /> : null}
    </>
  );
}

/** Beside the provenance badge on the rows of a major event's storyline. */
export function MajorBadge() {
  return (
    <span title="A major event" className="rounded border border-x-red/40 px-1 text-[11px] font-bold leading-[14px] text-x-red">
      Major event
    </span>
  );
}
