"use client";
// The three-column X frame. STUB: the core interface workstream replaces the
// body. The props are frozen.
import type { ReactNode } from "react";

export interface ShellProps {
  children: ReactNode;
  /** Text for the default sticky header, e.g. "Post" or "Notifications". */
  title?: string;
  /** Smaller grey line under the title, e.g. "1,204 posts". */
  subtitle?: string;
  /** Show a back arrow in the default header. */
  back?: boolean;
  /** Replaces the default header entirely (the home screen passes its tabs). */
  header?: ReactNode;
}

export function Shell({ children, title }: ShellProps) {
  return (
    <div className="mx-auto min-h-screen w-[600px] border-x border-x-border">
      {title ? <h1 className="p-4 text-xl font-bold">{title}</h1> : null}
      {children}
    </div>
  );
}
