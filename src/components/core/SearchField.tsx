"use client";
// X's search field: a grey pill that turns black with a blue border on focus.
// Enter searches on /explore?q=.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";

export function SearchField() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim();
        if (query) router.push(`/explore?q=${encodeURIComponent(query)}`);
      }}
      className="w-full"
    >
      <label
        className={`flex h-11 w-full items-center rounded-full border transition-colors ${
          focused ? "border-x-blue bg-x-bg shadow-[0_0_0_1px_#1d9bf0]" : "border-[#333639] bg-x-bg"
        }`}
      >
        <span className="flex shrink-0 pl-3 text-x-dim">
          <Icon name="search" size={18.75} />
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search"
          aria-label="Search query"
          className="h-full min-w-0 flex-1 bg-transparent pl-1 pr-4 text-[14px] leading-4 text-x-text outline-none placeholder:text-x-dim"
        />
        {q && focused ? (
          <button
            type="button"
            aria-label="Clear"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setQ("")}
            className="mr-3 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-x-blue text-black"
          >
            <Icon name="close" size={15} />
          </button>
        ) : null}
      </label>
    </form>
  );
}
