"use client";
// X's Community Note: a bordered box under the post. Inert: clicks stay inside.
import type { ReactNode } from "react";

function withLinks(text: string): ReactNode[] {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    i % 2 ? (
      <span key={i} className="text-x-blue">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export function CommunityNote({ text }: { text: string }) {
  return (
    <div
      className="mt-3 cursor-default rounded-2xl border border-x-border"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 px-3 pt-3 text-x-text">
        <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor" aria-hidden="true">
          <path d="M7.5 6.5a2.5 2.5 0 115 0 2.5 2.5 0 01-5 0zM10 2a4.5 4.5 0 100 9 4.5 4.5 0 000-9zM2 20c0-2.76 3.58-5 8-5s8 2.24 8 5v1H2v-1zm2.3-.5h11.4c-.6-1.4-2.8-2.5-5.7-2.5s-5.1 1.1-5.7 2.5zM17.5 3.2a4.5 4.5 0 010 8.6l-.5-1.9a2.5 2.5 0 000-4.8l.5-1.9zM19 14.4c2 .7 3.5 2.1 3.5 4.1V21h-3v-2c0-1.2-.5-2.3-1.4-3.1.3-.6.7-1.1.9-1.5z" />
        </svg>
        <span className="text-[15px] font-bold leading-5">Readers added context</span>
      </div>
      <div className="whitespace-pre-wrap break-words px-3 pt-1 text-[15px] leading-5 text-x-text">
        {withLinks(text)}
      </div>
      <div className="px-3 pb-3 pt-2 text-[13px] leading-4 text-x-dim">
        Context is written by people who use X, and appears when rated helpful by others.{" "}
        <span className="text-x-blue">Find out more.</span>
      </div>
    </div>
  );
}
