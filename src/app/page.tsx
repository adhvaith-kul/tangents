"use client";
// Home. STUB: the core interface workstream replaces this screen.
import { Shell } from "@/components/Shell";
import { Logo } from "@/components/Logo";

export default function Home() {
  return (
    <Shell title="Home">
      <div className="flex items-center gap-4 p-4">
        <Logo size={48} />
        <p className="text-x-dim">Foundation is in place.</p>
      </div>
    </Shell>
  );
}
