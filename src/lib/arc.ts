// The Arc, this world's daily paper: the shape of an edition, of its front
// page as a post's picture, and of the edition page. Types and small helpers
// only, safe to import from client components. Writing an edition is
// sim/edition.ts; storing and reading them is paper.ts.
import type { ArticleCard } from "./types";

export const ARC_HANDLE = "TheArc";

/** The nameplate's face, shared by the front page, the edition page and the logo. */
export const NAMEPLATE_FONT = '"Big Caslon", "Bodoni 72", Didot, "Times New Roman", Georgia, serif';
/** The paper's headline and body faces. */
export const PAPER_SERIF = '"Times New Roman", Times, Georgia, serif';
export const PAPER_SANS = '"Franklin Gothic Medium", "Franklin Gothic", "Helvetica Neue", Helvetica, Arial, sans-serif';

export interface EditionStory {
  headline: string;
  /** Two or three sentences. */
  text: string;
  storylineId: number | null;
}

/** One day's paper, as stored in `editions.edition`. The scores, markets and
 *  coming-soon boxes are copied from the ledgers when it is written, so a back
 *  issue shows that day's numbers. */
export interface Edition {
  number: number;
  /** The day it is dated, "2026-11-15" (simulation calendar). */
  date: string;
  /** The day it reports on, normally the day before. */
  covers: string;
  lead: { headline: string; standfirst: string; paragraphs: string[]; storylineId: number | null };
  stories: EditionStory[];
  briefs: string[];
  corrections: string[];
  comment: { columnist: string; headline: string; paragraphs: string[] };
  scores: { competition: string; title: string; score: string }[];
  markets: { ticker: string; name: string; close: number; changePct: number }[];
  /** The biggest mover of the day, drawn as the front page's chart. */
  chart: { ticker: string; name: string; changePct: number; points: number[] } | null;
  /** Announced films, albums and games, when the slate exists. */
  coming: { kind: string; title: string; maker: string; release: string | null }[];
}

/** What a front-page post's picture shows, as it stood when the post went up. */
export interface FrontPage {
  /** The edition page in the in-app browser. */
  page: ArticleCard;
  number: number;
  date: string;
  lead: { headline: string; standfirst: string; text: string };
  stories: { headline: string; text: string }[];
  comment: { columnist: string; headline: string; text: string };
  chart: Edition["chart"];
  /** The band along the foot: the day's results, or the markets when there were none. */
  strip: { label: string; items: string[] } | null;
  /** Small teasers in the ears beside the nameplate. */
  ears: [string, string];
}

/** GET /api/edition/[articleId]. */
export interface EditionResponse {
  edition: Edition;
  /** The current title of each storyline a story is tagged with: its link searches for it. */
  storylines: Record<number, string>;
  /** The paper's other editions, newest first. */
  backIssues: { card: ArticleCard; number: number; date: string; lead: string }[];
}

// ------------------------------------------------------------------ dates

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December",
];

function parts(key: string): { y: number; m: number; d: number; wd: number } {
  const [y, m, d] = key.split("-").map(Number);
  return { y, m, d, wd: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

/** "Sunday, November 15, 2026" from "2026-11-15". */
export function editionDate(key: string): string {
  const p = parts(key);
  return `${WEEKDAYS[p.wd]}, ${MONTHS[p.m - 1]} ${p.d}, ${p.y}`;
}

/** "Sunday" from "2026-11-15". */
export function editionWeekday(key: string): string {
  return WEEKDAYS[parts(key).wd];
}

const MONTHS_AP = ["Jan.", "Feb.", "March", "April", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];

/** "Nov. 15" from "2026-11-15". */
export function editionShortDate(key: string): string {
  const p = parts(key);
  return `${MONTHS_AP[p.m - 1]} ${p.d}`;
}
