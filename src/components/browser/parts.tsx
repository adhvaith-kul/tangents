"use client";
// Shared pieces for the simulated sites: text splitting, invented bylines,
// date styles in the publisher's time zone, inert nav links and page links.
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { hash32, topicOf, zoneParts, type SiteConfig, type Topic, type Zone } from "@/lib/sites";
import type { ArticleCard, ArticleView, PageKind } from "@/lib/types";

export interface TemplateProps {
  site: SiteConfig;
  page: ArticleView;
  more: ArticleCard[];
  now: number; // simulation time
  open: (card: ArticleCard) => void;
}

// ------------------------------------------------------------------ text

export function paragraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

const ABBREV = /(?:\b[A-Z]|\bMr|\bMrs|\bMs|\bDr|\bSt|\bJr|\bSr|\bInc|\bCorp|\bCo|\bLtd|\bvs|\bNo|\bGov|\bSen|\bRep|\bGen|\bU\.S|\bU\.K|\bJan|\bFeb|\bAug|\bSept?|\bOct|\bNov|\bDec)\.$/;

/** Split a paragraph into sentences, leaving common abbreviations alone. */
export function sentences(p: string): string[] {
  const parts = p.replace(/([.!?]["”’)]?)\s+(?=["“‘(]?[A-Z0-9])/g, "$1\u0000").split("\u0000");
  const out: string[] = [];
  for (const s of parts) {
    if (out.length && ABBREV.test(out[out.length - 1])) out[out.length - 1] += " " + s;
    else out.push(s);
  }
  return out.map((s) => s.trim()).filter(Boolean);
}

const CITIES: Record<Topic, string> = {
  politics: "Washington", tech: "San Francisco", business: "New York", culture: "Los Angeles", sports: "New York", general: "New York",
};

/** A plausible dateline city for a story, from its subject. */
export function storyCity(headline: string): string {
  return CITIES[topicOf(headline)];
}

/** The lead-in a wire or cable story starts with, e.g. "WASHINGTON, Nov 14 (Reuters) - ". */
export function datelineLead(site: SiteConfig, page: ArticleView, upper = true): string {
  const d = site.dateline;
  if (!d || !isReported(page)) return "";
  const city = upper ? storyCity(page.headline).toUpperCase() : storyCity(page.headline);
  return d.style === "dated"
    ? `${city}, ${shortDate(page.createdAt, site.zone)} (${d.tag}) - `
    : `${city} (${d.tag}) — `;
}

// --------------------------------------------------------------- bylines

/** Invented reporters. None is meant to be a real journalist. */
const REPORTERS = [
  "Marisol Teague", "Theo Brannigan", "Ines Calloway", "Rafael Mendieta-Cole", "Nadia Ferreira-Lunde",
  "Callum Ashdown", "Wren Adebayo-Finch", "Josefina Albright", "Dmitri Halvorsen", "Leah Castellano-Pierce",
  "Oren Whitcombe", "Saoirse Delacroix", "Malik Underhill", "Beatrix Han-Morrow", "Tobias Renwick",
  "Yasmin Achterberg", "Hollis Quarles", "Anouk Varga-Bell", "Emeka Strand", "Clementine Rourke",
  "Gideon Paley", "Mireille Osei-Grant", "Silas Thornbury", "Pilar Esquivel-Moss", "Ansel Kowalczyk",
  "Daphne Ngata", "Rowan Featherstone", "Ximena Lockridge", "Jasper Mbatha-Cole", "Odalys Pruitt",
  "Felix Ambrose-Tan", "Greer Halloran", "Kenji Lindqvist", "Talia Brennecke", "August Pemberly",
  "Noor Valentin", "Esme Carrow", "Imogen Vasquez-Hart", "Lucan Okoye-Park", "Petra Szandor",
];

function pick(seed: string, avoid: string[] = []): string {
  const h = hash32(seed);
  for (let i = 0; i < REPORTERS.length; i++) {
    const name = REPORTERS[(h + i) % REPORTERS.length];
    if (!avoid.includes(name)) return name;
  }
  return REPORTERS[h % REPORTERS.length];
}

/** One or two reporter names for an article, stable per article id. */
export function reporters(id: number): string[] {
  const first = pick(`by:${id}`);
  return hash32(`co:${id}`) % 4 === 0 ? [first, pick(`by2:${id}`, [first])] : [first];
}

/** Additional names for credit lines ("Editing by ..."), never the byline's. */
export function credits(id: number, n: number): string[] {
  const out = reporters(id);
  const extra: string[] = [];
  for (let i = 0; i < n; i++) {
    const name = pick(`cr:${id}:${i}`, [...out, ...extra]);
    extra.push(name);
  }
  return extra;
}

/** "Marisol Teague" -> "MT", for author chips. */
export function initials(name: string): string {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function joinNames(names: string[]): string {
  return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Articles carry reporters; press releases, blog posts and statements the organisation. */
export function isReported(page: { kind: PageKind }): boolean {
  return page.kind === "article";
}

export function bylineText(site: SiteConfig, page: ArticleView): string {
  return isReported(page) ? joinNames(reporters(page.id)) : site.desk;
}

export const KIND_LABEL: Record<PageKind, string> = {
  article: "Article",
  press_release: "Press Release",
  blog: "Blog",
  statement: "Statement",
};

// ----------------------------------------------------------------- dates

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_AP = ["Jan.", "Feb.", "March", "April", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "9:41 AM", or "9:41 a.m." with `ap`. */
export function clock(t: number, zone: Zone, ap = false): string {
  const d = zoneParts(t, zone);
  return `${d.hour}:${d.minute} ${ap ? (d.pm ? "p.m." : "a.m.") : d.pm ? "PM" : "AM"}`;
}

/** "November 14, 2026" */
export function longDate(t: number, zone: Zone): string {
  const d = zoneParts(t, zone);
  return `${MONTHS[d.month - 1]} ${d.day}, ${d.year}`;
}

/** "Nov. 14, 2026" */
export function apDate(t: number, zone: Zone): string {
  const d = zoneParts(t, zone);
  return `${MONTHS_AP[d.month - 1]} ${d.day}, ${d.year}`;
}

/** "Nov 14" */
export function shortDate(t: number, zone: Zone): string {
  const d = zoneParts(t, zone);
  return `${MONTHS_SHORT[d.month - 1]} ${d.day}`;
}

/** "11/14/2026" */
export function numericDate(t: number, zone: Zone): string {
  const d = zoneParts(t, zone);
  return `${d.month}/${d.day}/${d.year}`;
}

/** "Saturday, November 14, 2026" */
export function fullDate(t: number, zone: Zone): string {
  return `${zoneParts(t, zone).weekday}, ${longDate(t, zone)}`;
}

export function weekdayShort(t: number, zone: Zone): string {
  return zoneParts(t, zone).weekday.slice(0, 3);
}

/** "Just now", "12 min ago", "3 hours ago", then a date. */
export function ago(t: number, now: number, zone: Zone): string {
  const m = Math.max(0, Math.floor((now - t) / 60_000));
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  return apDate(t, zone);
}

// ------------------------------------------------------------ components

/** A masthead or footer link that goes nowhere: the simulated site has one page type. */
export function Inert({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <span className={`cursor-default whitespace-nowrap ${className}`} style={style}>
      {children}
    </span>
  );
}

function plainClick(e: MouseEvent) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

/** A link to another page in the simulated browser ("More from ..."). */
export function PageLink({
  card, open, className = "", style, children,
}: {
  card: ArticleCard;
  open: (card: ArticleCard) => void;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <a
      href={`/news/${card.id}`}
      className={className}
      style={style}
      onClick={(e) => {
        if (!plainClick(e)) return;
        e.preventDefault();
        open(card);
      }}
    >
      {children}
    </a>
  );
}

/** The "Updated <time>" note, or null when the page was never revised. */
export function updatedNote(page: ArticleView, fmt: (t: number) => string): string | null {
  return page.updatedAt ? `Updated ${fmt(page.updatedAt)}` : null;
}
