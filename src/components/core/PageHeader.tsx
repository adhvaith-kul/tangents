"use client";
// The default contents of the centre column's sticky header: an optional back
// arrow, a 20px bold title and an optional dim subtitle.
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Icon } from "@/components/icons";

export function PageHeader({
  title,
  subtitle,
  back = false,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  back?: boolean;
}) {
  const router = useRouter();
  return (
    <div className="flex h-[53px] items-center px-4">
      {back ? (
        <div className="min-w-[56px]">
          <button
            type="button"
            aria-label="Back"
            onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
            className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-x-text transition-colors hover:bg-x-hover"
          >
            <Icon name="back" size={20} />
          </button>
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        {title ? (
          <h2 className="truncate text-xl font-bold leading-6 text-x-text">{title}</h2>
        ) : null}
        {subtitle ? <div className="truncate text-[13px] leading-4 text-x-dim">{subtitle}</div> : null}
      </div>
    </div>
  );
}
