"use client";
// The Settings landing page: search, the modes, and the list of categories
// with a live summary of each. Laid out like X's own settings list.
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Spinner } from "@/components/core/Spinner";
import {
  CATEGORIES, PRESETS, activePreset, isChanged, searchEntries, summarise, type Entry,
} from "./model";
import { useSettings } from "./useSettings";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-x-blue";

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" width={18.75} height={18.75} fill="currentColor" aria-hidden="true" className="shrink-0 text-x-dim">
      <path d="M14.586 12L7.543 4.96l1.414-1.42L17.414 12l-8.457 8.46-1.414-1.42L14.586 12z" />
    </svg>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="px-4 pb-3 pt-1">
      <div
        className={`flex h-11 w-full items-center gap-2 rounded-full border pl-3 pr-2 ${
          focused ? "border-x-blue bg-x-bg shadow-[0_0_0_1px_#1d9bf0]" : "border-[#333639] bg-x-bg"
        }`}
      >
        <span className={focused ? "text-x-blue" : "text-x-dim"}>
          <Icon name="search" size={18.75} />
        </span>
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search settings"
          aria-label="Search settings"
          className="min-w-0 flex-1 bg-transparent text-[15px] leading-5 text-x-text outline-none placeholder:text-x-dim [&::-webkit-search-cancel-button]:hidden"
        />
        {value ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onChange("")}
            className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-x-blue text-black"
          >
            <Icon name="close" size={12} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Results({ query, entries }: { query: string; entries: Entry[] }) {
  if (!entries.length) {
    return (
      <div className="px-8 py-10 text-center">
        <div className="text-[20px] font-extrabold leading-6 text-x-text">No settings match “{query.trim()}”</div>
        <div className="mt-2 text-[15px] leading-5 text-x-dim">Try another word, or browse the categories.</div>
      </div>
    );
  }
  return (
    <ul>
      {entries.map((e) => (
        <li key={e.id}>
          <Link
            href={`/settings/${e.category}?focus=${encodeURIComponent(e.id)}`}
            className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-x-hover-soft ${focusRing}`}
          >
            <div className="min-w-0 flex-1">
              <div className="text-[15px] leading-5 text-x-text">{e.label}</div>
              <div className="text-[13px] leading-4 text-x-dim">
                {CATEGORIES.find((c) => c.id === e.category)?.title} · {e.description}
              </div>
            </div>
            <Chevron />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SettingsHome() {
  const { settings, sim, usage, error, save, resetAll } = useSettings();
  const [query, setQuery] = useState("");

  if (!settings) {
    return (
      <div className="flex justify-center p-8 text-[15px] text-x-dim">
        {error ? "Settings could not be loaded." : <Spinner />}
      </div>
    );
  }

  const active = activePreset(settings);
  const searching = query.trim().length > 0;

  return (
    <div>
      <SearchBox value={query} onChange={setQuery} />
      {searching ? (
        <Results query={query} entries={searchEntries(query)} />
      ) : (
        <>
          <section className="border-b border-x-border pb-3">
            <h2 className="px-4 pb-1 pt-2 text-[20px] font-extrabold leading-6 text-x-text">Modes</h2>
            <div className="px-4 text-[13px] leading-4 text-x-dim">
              A starting point. Each one sets the tone, the replies and how closely the world follows real news.
            </div>
            <div className="flex gap-2 px-4 pt-3">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  aria-pressed={active === p.name}
                  title={p.hint}
                  onClick={() => save(p.values)}
                  className={`h-9 flex-1 rounded-full border text-[15px] font-bold leading-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-x-blue ${active === p.name ? "border-x-blue bg-x-blue text-white" : "border-x-border text-x-text hover:bg-x-hover"}`}
                >
                  {p.name}
                </button>
              ))}
            </div>
            <div className="px-4 pt-2 text-[13px] leading-4 text-x-dim">
              {active
                ? PRESETS.find((p) => p.name === active)?.hint
                : "Custom: your settings do not match any of the modes."}
            </div>
          </section>

          <nav aria-label="Settings categories">
            <ul>
              {CATEGORIES.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/settings/${c.id}`}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-x-hover-soft ${focusRing}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[15px] leading-5 text-x-text">
                        {c.title}
                        {isChanged(c.id, settings, sim?.pace) ? (
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-x-blue"
                            role="img"
                            aria-label="Changed from the defaults"
                            title="Changed from the defaults"
                          />
                        ) : null}
                      </div>
                      <div className="truncate text-[13px] leading-4 text-x-dim">
                        {summarise(c.id, settings, sim?.pace, usage)}
                      </div>
                    </div>
                    <Chevron />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="border-t border-x-border px-4 py-3">
            <button
              type="button"
              onClick={resetAll}
              className="-ml-4 rounded-full px-4 py-2 text-[15px] font-bold leading-5 text-x-dim transition-colors hover:bg-x-hover hover:text-x-text focus-visible:outline-2 focus-visible:outline-x-blue"
            >
              Reset all settings
            </button>
          </div>
        </>
      )}
    </div>
  );
}
