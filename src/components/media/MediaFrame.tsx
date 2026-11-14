"use client";
// X's media container: full column width, 16px radius, 1px border, 12px above.
// Clicks inside never open the post.
import type { ReactNode } from "react";

export function MediaFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative mt-3 w-full overflow-hidden rounded-2xl border border-x-border ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}
