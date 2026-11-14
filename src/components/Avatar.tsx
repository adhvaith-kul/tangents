"use client";
// A round profile picture. Falls back to initials on a colour derived from the
// handle when there is no image or it fails to load. FROZEN after phase 1.
import { useState } from "react";
import type { AccountLite } from "@/lib/types";

const COLOURS = ["#1d9bf0", "#7856ff", "#f91880", "#ff7a00", "#00ba7c", "#ffd400", "#f4212e", "#8b98a5"];

function colourFor(handle: string): string {
  let h = 0;
  for (const ch of handle) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLOURS[h % COLOURS.length];
}

function initials(name: string): string {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
}

export function Avatar({
  account,
  size = 40,
  className = "",
}: {
  account: Pick<AccountLite, "handle" | "name" | "avatar" | "kind">;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  // X shows organisations in a rounded square and people in a circle.
  const shape = account.kind === "outlet" ? "rounded-[18%]" : "rounded-full";
  const box = { width: size, height: size };
  if (account.avatar && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={account.avatar}
        alt={account.name}
        style={box}
        className={`shrink-0 object-cover ${shape} ${className}`}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div
      style={{ ...box, background: colourFor(account.handle), fontSize: size * 0.4 }}
      className={`flex shrink-0 select-none items-center justify-center font-bold text-white ${shape} ${className}`}
      aria-label={account.name}
    >
      {initials(account.name)}
    </div>
  );
}
