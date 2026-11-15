"use client";
// One project on Explore's "Coming soon": its kind and maker, the title, then
// its date and status. Opens the post that last carried its card; a project
// whose card is on no visible post is not a link.
import { useRouter } from "next/navigation";
import type { ProjectView } from "@/lib/types";
import { KIND_LABEL, STATUS_LABEL } from "@/components/media/projectLooks";

export function ProjectRow({ p }: { p: ProjectView }) {
  const router = useRouter();
  const href = p.postId != null ? `/post/${p.postId}` : null;
  const open = () => href && router.push(href);
  return (
    <div
      role={href ? "link" : undefined}
      tabIndex={href ? 0 : undefined}
      onClick={open}
      onKeyDown={(e) => e.key === "Enter" && open()}
      className={`px-4 py-3 ${href ? "cursor-pointer transition-colors hover:bg-x-hover-soft" : ""}`}
    >
      <div className="truncate text-[13px] leading-4 text-x-dim">
        {KIND_LABEL[p.kind]} · {p.maker}
      </div>
      <div className="mt-0.5 truncate text-[15px] font-bold leading-5 text-x-text">{p.title}</div>
      <div className="mt-0.5 truncate text-[13px] leading-4 text-x-dim">
        {[p.release, STATUS_LABEL[p.status]].filter(Boolean).join(" · ")}
      </div>
    </div>
  );
}
