"use client";
// Calls: there is nobody to call in a single-player world, so this is X's empty screen.
import { Shell } from "@/components/Shell";
import { EmptyState } from "@/components/core/EmptyState";

export default function CallsPage() {
  return (
    <Shell title="Calls">
      <EmptyState
        title="No calls yet"
        body="When you make or receive audio and video calls on X, they’ll show up here."
      />
    </Shell>
  );
}
