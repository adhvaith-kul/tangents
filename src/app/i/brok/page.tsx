"use client";
// Brok: ask about what is happening in this world. /i/brok?post=ID opens on
// a post and asks for an explanation of it. The path follows X's /i/grok and
// leaves /brok to the account's profile, like any other handle.
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { BrokScreen } from "@/components/brok/BrokScreen";

export default function BrokPage() {
  // useSearchParams needs a Suspense boundary above it.
  return (
    <Suspense fallback={null}>
      <Brok />
    </Suspense>
  );
}

function Brok() {
  const raw = useSearchParams().get("post");
  const id = raw != null && /^\d+$/.test(raw) ? Number(raw) : null;
  // Keyed so each post gets its own screen state.
  return <BrokScreen key={id ?? "general"} postId={id} />;
}
