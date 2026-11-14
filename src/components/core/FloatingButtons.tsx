"use client";
// X's two floating buttons at the bottom right: the assistant (Brok here) and Chat.
import Link from "next/link";
import { GrokMark, Icon } from "@/components/icons";

const BUTTON =
  "flex h-[55px] w-[55px] items-center justify-center rounded-2xl border border-[#4b4e52] bg-black/65 text-x-text shadow-[0_0_15px_0_rgba(255,255,255,0.2),0_0_3px_1px_rgba(255,255,255,0.15)] backdrop-blur-sm transition-colors hover:bg-[#16181c]";

export function FloatingButtons() {
  return (
    <div className="fixed bottom-3 right-5 z-30 hidden flex-col gap-3 min-[500px]:flex">
      <Link href="/i/brok" aria-label="Brok" className={BUTTON}>
        <GrokMark size={32} />
      </Link>
      <Link href="/messages" aria-label="Chat" className={BUTTON}>
        <Icon name="chat" size={32} />
      </Link>
    </div>
  );
}
