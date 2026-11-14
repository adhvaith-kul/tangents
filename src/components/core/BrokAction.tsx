"use client";
// The assistant button X puts beside each post's "…" menu. Here it asks Brok
// to explain that post.
import { useRouter } from "next/navigation";
import { GrokMark } from "@/components/icons";

export function BrokAction({ postId }: { postId: number }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Brok actions"
      title="Explain this post"
      onClick={(e) => {
        // The surrounding row opens the post; this goes to Brok instead.
        e.stopPropagation();
        router.push(`/i/brok?post=${postId}`);
      }}
      className="group relative flex shrink-0 items-center justify-center text-x-dim transition-colors hover:text-x-blue"
    >
      <span className="absolute -inset-2 rounded-full transition-colors group-hover:bg-x-blue/10" />
      <GrokMark size={18.75} className="relative" />
    </button>
  );
}
