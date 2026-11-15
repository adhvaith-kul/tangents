"use client";
// X's media container: full column width, 16px radius, 1px border, 12px above.
// Clicks inside never open the post.
import type { CSSProperties, ReactNode } from "react";

export function MediaFrame({
  children, className = "", style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`relative mt-3 w-full overflow-hidden rounded-2xl border border-x-border ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}
