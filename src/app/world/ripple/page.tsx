"use client";
// /world/ripple?storyline=ID: what one storyline set off, replayed.
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { RippleScreen } from "@/components/secondary/Ripple";

export default function RipplePage() {
  // useSearchParams needs a Suspense boundary above it.
  return (
    <Suspense fallback={null}>
      <Ripple />
    </Suspense>
  );
}

function Ripple() {
  const raw = useSearchParams().get("storyline") ?? "";
  return <RippleScreen storylineId={/^\d+$/.test(raw) ? Number(raw) : null} />;
}
