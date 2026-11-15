"use client";
// X's emoji picker: a popover under the composer's emoji button with a
// "Search emojis" field, a row of category tabs and a scrolling grid by
// category, headed by the reader's recent picks. Picking inserts and leaves it
// open; Escape, a click outside or a resize closes it. Rendered in a portal
// like Menu.tsx, so the composer's overflow never clips it.
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Glyph } from "./glyphs";
import { EMOJI_CATEGORIES, searchEmoji, type Emoji } from "@/lib/emoji";

const RECENT_KEY = "tangents.emoji.recent";
const RECENT_MAX = 18; // two rows
const WIDTH = 330;
const HEIGHT = 420;

function readRecent(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function saveRecent(list: string[]): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // private mode or storage full: recents just are not kept
  }
}

/** One glyph per tab, as X shows a small symbol per category. */
const TAB_GLYPH: Record<string, string> = {
  recent: "🕘",
  smileys: "😀",
  nature: "🐻",
  food: "🍔",
  activity: "⚽",
  travel: "🚗",
  objects: "💡",
  symbols: "❤️",
  flags: "🏳️",
};

function Cell({ e, onPick }: { e: Emoji; onPick: (char: string) => void }) {
  return (
    <button
      type="button"
      title={e.words.split(" ").slice(0, 4).join(" ")}
      aria-label={e.words}
      onClick={() => onPick(e.char)}
      className="flex h-9 w-9 items-center justify-center rounded-full text-[23px] leading-none transition-colors hover:bg-x-blue/10"
    >
      {e.char}
    </button>
  );
}

export function EmojiPicker({
  anchor,
  onPick,
  onClose,
}: {
  anchor: DOMRect;
  onPick: (char: string) => void;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  // The picker only ever renders in the browser (it opens on a click), so storage can be read at once.
  const [recent, setRecent] = useState<string[]>(readRecent);
  const [active, setActive] = useState(() => (recent.length ? "recent" : "smileys"));

  useLayoutEffect(() => {
    // Caught on the way down and stopped there, so Escape closes only the
    // picker, not the compose dialog around it (which listens on window too).
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
    };
    const resize = () => onClose();
    // The page scrolling away from the button closes it; the grid's own scroll does not.
    const scroll = (e: Event) => {
      if (!panel.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", key, true);
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", scroll, true);
    return () => {
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", scroll, true);
    };
  }, [onClose]);

  const sections = useMemo(() => {
    const byChar = new Map(EMOJI_CATEGORIES.flatMap((c) => c.emoji.map((e) => [e.char, e] as const)));
    const recents = recent.map((c) => byChar.get(c) ?? { char: c, words: "recent" });
    return [
      ...(recents.length ? [{ key: "recent", label: "Recent", emoji: recents }] : []),
      ...EMOJI_CATEGORIES,
    ];
  }, [recent]);
  const results = useMemo(() => (query.trim() ? searchEmoji(query) : null), [query]);

  const pick = (char: string) => {
    onPick(char);
    const next = [char, ...readRecent().filter((c) => c !== char)].slice(0, RECENT_MAX);
    saveRecent(next);
    // The Recent row is not reshuffled under the pointer while the picker is open.
    if (!recent.length) setRecent(next);
  };

  const jump = (key: string) => {
    setQuery("");
    setActive(key);
    requestAnimationFrame(() => {
      const el = grid.current?.querySelector<HTMLElement>(`[data-section="${key}"]`);
      // The grid is positioned, so a section's offsetTop is measured from the grid's top.
      if (el && grid.current) grid.current.scrollTop = el.offsetTop;
    });
  };

  // The tab follows the section at the top of the grid.
  const onScroll = () => {
    const g = grid.current;
    if (!g || results) return;
    let current = sections[0]?.key ?? "smileys";
    for (const el of g.querySelectorAll<HTMLElement>("[data-section]")) {
      if (el.offsetTop <= g.scrollTop + 4) current = el.dataset.section ?? current;
    }
    if (current !== active) setActive(current);
  };

  // Open below the button, or above it when the page has no room below; never off the left edge.
  const below = anchor.bottom + 4 + HEIGHT <= window.innerHeight - 8;
  const top = below ? anchor.bottom + 4 : Math.max(8, anchor.top - 4 - HEIGHT);
  const left = Math.max(8, Math.min(anchor.left - 12, window.innerWidth - WIDTH - 8));

  return createPortal(
    <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} className="contents">
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-label="Emoji picker"
        style={{ top, left, width: WIDTH, height: HEIGHT }}
        className="fixed z-50 flex flex-col overflow-hidden rounded-2xl bg-x-bg shadow-[0_0_15px_rgba(255,255,255,0.2),0_0_3px_1px_rgba(255,255,255,0.15)]"
      >
        <div className="px-3 pb-2 pt-3">
          <label className="flex h-10 items-center rounded-full border border-x-border px-3 focus-within:border-x-blue focus-within:ring-1 focus-within:ring-x-blue">
            <Glyph name="searchBold" size={16} className="mr-2 shrink-0 text-x-dim" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search emojis"
              className="min-w-0 flex-1 bg-transparent text-[15px] leading-5 text-x-text outline-none placeholder:text-x-dim"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
        </div>
        <div className="flex border-b border-x-border px-1">
          {sections.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-label={s.label}
              title={s.label}
              onClick={() => jump(s.key)}
              className="relative flex h-10 flex-1 items-center justify-center transition-colors hover:bg-x-hover-soft"
            >
              <span className={`text-[18px] leading-none ${active === s.key && !results ? "" : "opacity-50 grayscale"}`}>
                {TAB_GLYPH[s.key] ?? s.emoji[0]?.char}
              </span>
              {active === s.key && !results ? (
                <span className="absolute inset-x-1.5 bottom-0 h-1 rounded-full bg-x-blue" />
              ) : null}
            </button>
          ))}
        </div>
        <div ref={grid} onScroll={onScroll} className="relative min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {results ? (
            results.length ? (
              <div className="grid grid-cols-8 pt-2">
                {results.map((e) => (
                  <Cell key={e.char} e={e} onPick={pick} />
                ))}
              </div>
            ) : (
              <div className="px-3 py-8 text-center text-[15px] leading-5 text-x-dim">
                No emojis found for “{query.trim()}”
              </div>
            )
          ) : (
            sections.map((s) => (
              <div key={s.key} data-section={s.key}>
                <div className="sticky top-0 z-10 bg-x-bg/95 px-1 py-2 text-[15px] font-bold leading-5 text-x-text">
                  {s.label}
                </div>
                <div className="grid grid-cols-8">
                  {s.emoji.map((e) => (
                    <Cell key={e.char} e={e} onPick={pick} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
