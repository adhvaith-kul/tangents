"use client";
// The Explore header search field: prefilled with q, Enter updates the URL.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";

export function SearchField({ q }: { q: string }) {
  const router = useRouter();
  const [value, setValue] = useState(q);
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex h-[53px] items-center px-4">
      <form
        className={`flex h-11 w-full items-center gap-3 rounded-full border px-4 ${
          focused ? "border-x-blue bg-x-bg shadow-[0_0_0_1px_#1d9bf0]" : "border-[#333639] bg-x-bg"
        }`}
        onSubmit={(e) => {
          e.preventDefault();
          const t = value.trim();
          router.push(t ? `/explore?q=${encodeURIComponent(t)}` : "/explore");
        }}
      >
        <span className="text-x-dim">
          <Icon name="search" size={18} />
        </span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search"
          aria-label="Search"
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-x-dim"
        />
      </form>
    </div>
  );
}
