"use client";
// The three-column X frame: left navigation, the 600px centre column with its
// sticky header, and the right column. Polls /api/sidebar for both side
// columns and hosts the compose dialog and onboarding. The pieces live in src/components/core/.
import type { ReactNode } from "react";
import { ComposerDialog } from "./core/ComposerDialog";
import { LeftNav } from "./core/LeftNav";
import { PageHeader } from "./core/PageHeader";
import { RightColumn } from "./core/RightColumn";
import { useSidebar } from "./core/useSidebar";
import { Onboarding } from "./Onboarding";

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

export function Shell({ children, title, subtitle, back, header }: ShellProps) {
  const { data: sidebar, setSim } = useSidebar();
  const hasHeader = header != null || title != null || back;

  return (
    <div className="flex min-h-screen w-full justify-center">
      <LeftNav sidebar={sidebar} onSim={setSim} />
      <div className="flex shrink-0 items-stretch">
        <main className="flex min-h-screen w-[600px] shrink-0 flex-col border-x border-x-border">
          {hasHeader ? (
            <div className="sticky top-0 z-10 bg-black/65 backdrop-blur-md">
              {header ?? <PageHeader title={title} subtitle={subtitle} back={back} />}
            </div>
          ) : null}
          {children}
        </main>
        <RightColumn sidebar={sidebar} />
      </div>
      <ComposerDialog />
      <Onboarding />
    </div>
  );
}
