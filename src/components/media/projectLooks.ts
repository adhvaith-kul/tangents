// The design system for the slate's drawn cards (ProjectMedia.tsx): type
// stacks, the palettes each layout is drawn in, how a project's stored look
// picks a layout and a palette, and fitting a title to its box. Pure data and
// arithmetic; browser-safe. Sizes are in cqw (percent of the card's width).
import { FONTS } from "@/lib/sites";
import type { CardFormat, ProjectCard, ProjectKind, ProjectStatus } from "@/lib/types";

/** Display faces that ship with macOS and Windows, with fallbacks down to the generic family. */
export const FACE = {
  didone: FONTS.didone,
  impact: FONTS.condensed,
  narrow: FONTS.narrow,
  sans: FONTS.sans,
  futura: '"Futura", "Futura PT", "Century Gothic", "Avenir Next", "Trebuchet MS", sans-serif',
  baskerville: '"Baskerville", "Libre Baskerville", "Baskerville Old Face", Georgia, serif',
  copperplate: '"Copperplate", "Copperplate Gothic Light", "Copperplate Gothic", "Perpetua Titling MT", Georgia, serif',
  rounded: '"Arial Rounded MT Bold", "Nunito", "Varela Round", "Avenir Next", sans-serif',
  optima: '"Optima", "Candara", "Segoe UI", "Avenir Next", sans-serif',
  slab: FONTS.slab,
} as const;

/** bg: the field; deep: the darker end of it; ink: type; accent: the one strong colour; glow: light in the scene. */
export interface Palette {
  bg: string;
  deep: string;
  ink: string;
  accent: string;
  glow: string;
}

const pal = (bg: string, deep: string, ink: string, accent: string, glow: string): Palette => ({ bg, deep, ink, accent, glow });

/** Each layout's palettes. Dark layouts keep the type light; field layouts set dark type on colour. */
export const PALETTES = {
  // title cards
  eclipse: [
    pal("#0d0a12", "#000000", "#f2ece4", "#c9a45c", "#6b4a1f"),
    pal("#07111a", "#000000", "#e8f1f5", "#7fb7d6", "#1d4a66"),
    pal("#140707", "#000000", "#f5e9e4", "#d0533b", "#5c1a10"),
    pal("#0b0f0a", "#000000", "#eef0e6", "#a7b98a", "#2e3d22"),
  ],
  marquee: [
    pal("#0a1d33", "#03070f", "#fff7ea", "#ff9a3c", "#ffcf7a"),
    pal("#2a0b23", "#0a0209", "#fff1f6", "#ff4f7b", "#ffc0a8"),
    pal("#062421", "#010a09", "#effff9", "#3fe0b5", "#e6ff9a"),
    pal("#1b1033", "#06030e", "#f6f0ff", "#9b7bff", "#ffd36e"),
  ],
  field: [
    pal("#e8c33a", "#d2a91e", "#1b1408", "#1b1408", "#f4db7a"),
    pal("#f0b6c4", "#e595a9", "#2b0d16", "#2b0d16", "#f9d7df"),
    pal("#b9d3c2", "#9cbfa8", "#0f2418", "#0f2418", "#d8e8dd"),
    pal("#d5dde8", "#b9c5d6", "#111826", "#e4572e", "#eef2f7"),
    pal("#2c46d6", "#1f34a8", "#f3f0e8", "#f3f0e8", "#5b72ff"),
  ],
  blinds: [
    pal("#16110d", "#050403", "#efe6d8", "#b3261e", "#c9a77c"),
    pal("#0e1416", "#030506", "#e6eef0", "#2f9bb8", "#9db7bf"),
    pal("#121212", "#000000", "#f0f0f0", "#e0b100", "#b0b0b0"),
  ],
  split: [
    pal("#0c0c0c", "#000000", "#ffffff", "#e50914", "#ff6b6b"),
    pal("#0d1020", "#000000", "#ffffff", "#3b5bff", "#a8b6ff"),
    pal("#101410", "#000000", "#101410", "#c6f432", "#efffb0"),
    pal("#120a06", "#000000", "#ffffff", "#ff7a1a", "#ffc69a"),
  ],
  // posters
  monolith: [
    pal("#0e0b08", "#000000", "#f4ede2", "#e7b56a", "#ffdca3"),
    pal("#070c14", "#000000", "#e9f0f8", "#8ec5ff", "#d6ecff"),
    pal("#120608", "#000000", "#f8eaea", "#ff5a4f", "#ffc2b8"),
  ],
  orbit: [
    pal("#0a0f24", "#02030a", "#f5f2ea", "#ff8a3d", "#ffd27a"),
    pal("#1c0a1f", "#050108", "#fbeffa", "#ff4fa3", "#ffc2e3"),
    pal("#04201f", "#000807", "#ecfffb", "#28d1b0", "#c8fff2"),
    pal("#1e1a12", "#070604", "#fbf6ea", "#e8c547", "#fff2b8"),
  ],
  stack: [
    pal("#e2412b", "#c33520", "#14100e", "#14100e", "#ff8a6e"),
    pal("#f1e35c", "#dccc3d", "#141414", "#141414", "#fff7a8"),
    pal("#d9dde3", "#c3c9d1", "#101418", "#2f5bea", "#f2f4f7"),
    pal("#1a3b2e", "#102a20", "#eaf2dd", "#e9b949", "#2f5e4a"),
  ],
  horizon: [
    pal("#1a0f2e", "#07040f", "#fff3e6", "#ff7849", "#ffcf6b"),
    pal("#0b1d2c", "#030a10", "#eaf6ff", "#4fc3f7", "#ffe08a"),
    pal("#2a0f0f", "#0b0303", "#fff0e8", "#ff3d2e", "#ffb347"),
  ],
  shards: [
    pal("#111111", "#000000", "#ffffff", "#d7263d", "#f46036"),
    pal("#0f1a2b", "#060b14", "#f1f6ff", "#2e86ab", "#a3d5ff"),
    pal("#1b1b10", "#090904", "#fffbe6", "#e3b505", "#95190c"),
  ],
  // album covers
  record: [
    pal("#e9e4da", "#d8d1c3", "#111111", "#d64933", "#111111"),
    pal("#101010", "#000000", "#f2f2f2", "#f2c14e", "#2a2a2a"),
    pal("#2d5d7b", "#1f4459", "#f4f1ea", "#f4a259", "#163345"),
    pal("#7a1f3d", "#5a142c", "#fbeef2", "#ffd166", "#3e0a1d"),
  ],
  swiss: [
    pal("#ff5a1f", "#e24a12", "#111111", "#111111", "#ffffff"),
    pal("#0047ff", "#0037c4", "#ffffff", "#ffffff", "#ffd400"),
    pal("#111111", "#000000", "#f5f5f5", "#ff2d55", "#f5f5f5"),
    pal("#cfe8d4", "#b5d8bc", "#0f1f14", "#0f1f14", "#e04a2f"),
  ],
  bands: [
    pal("#f4d35e", "#ee964b", "#0d3b66", "#f95738", "#faf0ca"),
    pal("#2b2d42", "#8d99ae", "#edf2f4", "#ef233c", "#d90429"),
    pal("#264653", "#2a9d8f", "#f1faee", "#e9c46a", "#e76f51"),
    pal("#3d0c45", "#7b2d8b", "#fdf0ff", "#ff9f1c", "#ffbf69"),
  ],
  echo: [
    pal("#0b0b0b", "#000000", "#f2f2f2", "#9fe870", "#f2f2f2"),
    pal("#e4e9ef", "#cfd6df", "#12161c", "#ff4f00", "#12161c"),
    pal("#1d1145", "#0b0620", "#f4efff", "#ff6ec7", "#f4efff"),
  ],
  // tour posters
  bill: [
    pal("#e8d44d", "#d1bc33", "#121212", "#c1272d", "#121212"),
    pal("#c1272d", "#9e1d22", "#fff4dc", "#121212", "#fff4dc"),
    pal("#2f6f8f", "#245873", "#fdf6e3", "#f2c14e", "#fdf6e3"),
    pal("#f2f0ea", "#dedad0", "#121212", "#1f5fbf", "#121212"),
  ],
  night: [
    pal("#0b1030", "#020410", "#f7f1e3", "#ffcf56", "#6a7bff"),
    pal("#200b2b", "#07020b", "#fff0fb", "#ff7bd5", "#9b5cff"),
    pal("#0b241c", "#020a07", "#effff6", "#7dffc0", "#2fbf8f"),
  ],
  sunburst: [
    pal("#ff6b35", "#f7c59f", "#1a1423", "#1a1423", "#ffd23f"),
    pal("#3a86ff", "#8ecae6", "#0b132b", "#0b132b", "#ffbe0b"),
    pal("#e63946", "#f1c0b9", "#1d1d1d", "#1d1d1d", "#ffd166"),
  ],
  // game key art
  synth: [
    pal("#1a0638", "#05010f", "#ffffff", "#ff2bd6", "#20e3ff"),
    pal("#04122b", "#000510", "#ffffff", "#00e5ff", "#ffb800"),
    pal("#2b0716", "#0a0105", "#ffffff", "#ff3860", "#ffd166"),
  ],
  peaks: [
    pal("#1e2a3a", "#0b111a", "#f3ead7", "#d9a441", "#6d8bb0"),
    pal("#2a1d36", "#0e0914", "#f6eefc", "#c58cff", "#7a5c99"),
    pal("#13261f", "#06100c", "#eef5e8", "#c9e265", "#4d7a5e"),
    pal("#3a1a12", "#120704", "#fbeee6", "#ff8c42", "#a0522d"),
  ],
  hud: [
    pal("#121820", "#05080c", "#e8edf2", "#ff6a00", "#38424f"),
    pal("#151a12", "#060805", "#e9eedf", "#9acd32", "#3b4632"),
    pal("#0f1424", "#04060c", "#e6ecff", "#00d1ff", "#2c3550"),
  ],
  toybox: [
    pal("#ffd84d", "#ffb703", "#1d1d3a", "#ff4d6d", "#4cc9f0"),
    pal("#8fe3cf", "#5bc8af", "#16213e", "#ff6f61", "#ffe066"),
    pal("#c5b3ff", "#9d84ff", "#1e1640", "#ff9f1c", "#5ce1e6"),
  ],
} as const satisfies Record<string, readonly Palette[]>;

export type Layout = keyof typeof PALETTES;

/** The layouts each kind of card is drawn in. */
export const LAYOUTS: Record<CardFormat, readonly Layout[]> = {
  title_card: ["eclipse", "marquee", "field", "blinds", "split"],
  poster: ["monolith", "orbit", "stack", "horizon", "shards"],
  cover: ["record", "swiss", "bands", "echo"],
  tour_poster: ["bill", "night", "sunburst"],
  key_art: ["synth", "peaks", "hud", "toybox"],
};

/** Width over height. */
export const ASPECT: Record<CardFormat, number> = {
  title_card: 16 / 9,
  poster: 2 / 3,
  cover: 1,
  tour_poster: 2 / 3,
  key_art: 16 / 9,
};

/** The project's layout and palette, both fixed by its stored look. */
export function lookOf(card: Pick<ProjectCard, "format" | "look">): { layout: Layout; palette: Palette } {
  const layouts = LAYOUTS[card.format] ?? LAYOUTS.title_card;
  const n = Math.abs(Math.trunc(card.look)) || 0;
  const layout = layouts[n % layouts.length];
  const palettes = PALETTES[layout];
  return { layout, palette: palettes[Math.floor(n / 7) % palettes.length] };
}

// --------------------------------------------------------------- the words

export const KIND_LABEL: Record<ProjectKind, string> = {
  film: "Film", series: "Series", album: "Album", tour: "Tour", game: "Game",
};

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  announced: "Announced", in_production: "In production", dated: "Dated",
  released: "Released", delayed: "Delayed", cancelled: "Cancelled",
};

const NOT_STARS = /direct|writ|produc|composer|music|showrunner|creat|score|novel|based/i;

/** The names billed above the title: the cast, or whoever has no crew role. */
export function topBilled(card: ProjectCard, max = 4): string[] {
  return card.people.filter((p) => !NOT_STARS.test(p.role)).slice(0, max).map((p) => p.name);
}

/** The artist on an album or a tour: the first person billed as one, else the first person, else the maker. */
export function artistOf(card: ProjectCard): string {
  const p = card.people.find((x) => /artist|singer|rapper|band|perform/i.test(x.role)) ?? card.people[0];
  return p?.name ?? card.maker;
}

/** A film's billing block: who presents, who stars, the title, then the crew by
 *  role. `lead` is set small before `name`, as the block sets "directed by". */
export function billingBlock(card: ProjectCard): { lead: string; name: string }[] {
  const crew = new Map<string, string[]>();
  for (const p of card.people) {
    if (!NOT_STARS.test(p.role)) continue;
    const role = /direct/i.test(p.role) ? "directed by" : /writ/i.test(p.role) ? "written by" : /music|composer|score/i.test(p.role)
      ? "music by" : /showrunner|creat/i.test(p.role) ? "created by" : /produc/i.test(p.role) ? "produced by" : p.role;
    crew.set(role, [...(crew.get(role) ?? []), p.name]);
  }
  const order = ["music by", "written by", "produced by", "created by", "directed by"];
  const lines = [...crew.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  return [
    { lead: "", name: card.maker },
    { lead: "presents", name: "" },
    ...topBilled(card, 6).map((name) => ({ lead: "", name })),
    { lead: "", name: `“${card.title}”` },
    ...lines.map(([role, names]) => ({ lead: role, name: names.join(" and ") })),
  ];
}

/** The date line: the release as given, "Coming …" until it is out, or the status when it is in doubt. */
export function dateLine(card: ProjectCard, soon = "Coming soon"): string {
  if (card.status === "cancelled") return "Cancelled";
  if (!card.release) return card.status === "delayed" ? "Delayed" : soon;
  if (card.status === "released") return card.release;
  return /^(coming|in |on |out |available|only|this |next |summer|spring|autumn|fall|winter|\d)/i.test(card.release)
    ? card.release
    : `Coming ${card.release}`;
}

// ---------------------------------------------------------------- fitting

export interface Fit {
  size: number; // cqw
  lines: string[];
}

/** The largest size (cqw) at which `text` sets in at most `maxLines` lines of
 *  `width` cqw, given the face's average glyph width in em (letter-spacing
 *  included). Words are never broken; a title that cannot fit even at `min` is
 *  cut with an ellipsis rather than overflowing. */
export function fitText(text: string, o: { width: number; max: number; min: number; em: number; maxLines: number }): Fit {
  const words = text.split(/\s+/).filter(Boolean);
  const wrap = (perLine: number): string[] | null => {
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      if (Array.from(w).length > perLine) return null;
      const next = cur ? `${cur} ${w}` : w;
      if (Array.from(next).length <= perLine) cur = next;
      else {
        lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  };
  for (let size = o.max; size >= o.min; size = Math.round((size - Math.max(0.2, size * 0.04)) * 100) / 100) {
    const lines = wrap(Math.floor(o.width / (size * o.em)));
    if (lines && lines.length <= o.maxLines) return { size, lines };
  }
  const perLine = Math.max(1, Math.floor(o.width / (o.min * o.em)));
  const lines: string[] = [];
  let rest = words.join(" ");
  while (rest && lines.length < o.maxLines) {
    let cut = rest.length <= perLine ? rest.length : rest.lastIndexOf(" ", perLine);
    if (cut <= 0) cut = perLine;
    lines.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest && lines.length) lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, Math.max(1, perLine - 1)).trimEnd()}…`;
  return { size: o.min, lines };
}
