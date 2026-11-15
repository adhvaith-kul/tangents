// The simulated web: which site each publishing account has and what its
// addresses look like. One entry per publisher in SITES; unknown handles fall
// back to a default per account kind. Pure data and string helpers, safe to
// import from client components. `pageUrl`'s signature is frozen.
import type { AccountKind, PageKind } from "./types";

export type TemplateKey =
  | "wire"
  | "broadsheet"
  | "business"
  | "cable"
  | "tabloid"
  | "trade"
  | "tech"
  | "glossy"
  | "newsroom"
  | "government"
  | "arc";

/** Rough subject of a page, guessed from its headline; picks the section. */
export type Topic = "tech" | "business" | "politics" | "culture" | "sports" | "general";

export type Zone = "ET" | "CT" | "PT" | "UTC";

export interface Palette {
  bg: string;
  text: string;
  muted: string;
  accent: string;
  rule: string;
  /** Header or top-bar colour, where the template has one. */
  bar: string;
  /** Text on `bar` and on `accent`. */
  onBar: string;
}

export interface Section {
  label: string;
  path: string;
}

export interface SiteConfig {
  handle: string; // lowercase, "" for a default
  domain: string;
  name: string; // as set in the masthead
  /** The name in running text ("More from ..."); defaults to `name`. */
  title: string;
  template: TemplateKey;
  palette: Palette;
  headlineFont: string;
  bodyFont: string;
  /** Masthead type, when it differs from the headline face. */
  mastheadFont: string;
  /** Address patterns, one per page kind with a fallback. Tokens: {domain}
   *  {yyyy} {mm} {dd} {date} {slug} {section} {id} {hex8} {hex32} {n6} {n8} {n10}. */
  paths: { default: string } & Partial<Record<PageKind, string>>;
  sections: Record<Topic, Section>;
  nav: string[]; // inert section links in the masthead
  /** Byline for pages without a reporter: press releases, blog posts, statements. */
  desk: string;
  zone: Zone;
  slugMax: number;
  /** Wire datelines: "dated" is "CITY, Nov 14 (Reuters) -", "plain" is "CITY (AP) —". */
  dateline?: { style: "dated" | "plain"; tag: string };
  /** Home city for press-release datelines, e.g. "WASHINGTON". */
  city?: string;
  /** Short mark for templates that set one beside the name (e.g. "TC"). */
  mark?: string;
  /** A sub-brand after the wordmark, e.g. "Newsroom". */
  sub?: string;
  /** Government banner line above the header. */
  govBanner?: string;
}

// ------------------------------------------------------------- type stacks

export const FONTS = {
  serif: 'Georgia, "Times New Roman", Times, serif',
  times: '"Times New Roman", Times, Georgia, serif',
  didone: '"Didot", "Bodoni 72", "Bodoni MT", "Bodoni 72 Oldstyle", Georgia, serif',
  blackletter: '"Old English Text MT", "Engravers Old English BT", "UnifrakturMaguntia", Georgia, serif',
  sans: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  grotesk: '"Franklin Gothic Medium", "Franklin Gothic", "ITC Franklin Gothic", "Arial Narrow", Arial, sans-serif',
  condensed: 'Impact, Haettenschweiler, "Arial Narrow Bold", "Franklin Gothic Bold", sans-serif',
  narrow: '"Avenir Next Condensed", "Arial Narrow", "Helvetica Neue", Arial, sans-serif',
  slab: 'Rockwell, "Rockwell Nova", "Roboto Slab", "Museo Slab", Georgia, serif',
  mono: '"SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
} as const;

const LIGHT: Palette = {
  bg: "#ffffff", text: "#121212", muted: "#5f6368", accent: "#121212", rule: "#e2e2e2", bar: "#ffffff", onBar: "#121212",
};

function sections(over: Partial<Record<Topic, [string, string]>>): Record<Topic, Section> {
  const base: Record<Topic, [string, string]> = {
    tech: ["Technology", "technology"],
    business: ["Business", "business"],
    politics: ["Politics", "politics"],
    culture: ["Entertainment", "entertainment"],
    sports: ["Sports", "sports"],
    general: ["News", "news"],
    ...over,
  };
  const out = {} as Record<Topic, Section>;
  for (const k of Object.keys(base) as Topic[]) out[k] = { label: base[k][0], path: base[k][1] };
  return out;
}

type Entry = Omit<SiteConfig, "handle" | "title" | "palette" | "sections" | "mastheadFont" | "zone" | "slugMax"> & {
  title?: string;
  palette?: Partial<Palette>;
  sections?: Partial<Record<Topic, [string, string]>>;
  mastheadFont?: string;
  zone?: Zone;
  slugMax?: number;
};

const FED = "An official website of the United States government";

/** One entry per publisher, keyed by lowercase handle. Add a fictional outlet
 *  with one more entry. */
const SITES: Record<string, Entry> = {
  // ---------------------------------------------------------------- outlets
  reuters: {
    domain: "reuters.com", name: "Reuters", template: "wire",
    palette: { text: "#191919", muted: "#666666", accent: "#fa6400", rule: "#d6d6d6" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans,
    paths: { default: "{domain}/{section}/{slug}-{date}/" },
    sections: { tech: ["Technology", "technology"], politics: ["World", "world/us"], culture: ["Lifestyle", "lifestyle"], general: ["World", "world"] },
    nav: ["World", "Business", "Markets", "Sustainability", "Legal", "Breakingviews", "Technology"],
    desk: "Reuters", dateline: { style: "dated", tag: "Reuters" },
  },
  ap: {
    domain: "apnews.com", name: "AP News", template: "wire",
    palette: { text: "#121212", muted: "#5c5c5c", accent: "#d6001c", rule: "#dadada" },
    headlineFont: FONTS.grotesk, bodyFont: FONTS.sans, mark: "AP",
    paths: { default: "{domain}/article/{slug}-{hex32}" }, slugMax: 64,
    sections: { politics: ["Politics", "politics"], culture: ["Entertainment", "entertainment"], general: ["U.S. News", "us-news"] },
    nav: ["World", "U.S.", "Politics", "Sports", "Entertainment", "Business", "Science"],
    desk: "Associated Press", dateline: { style: "plain", tag: "AP" },
  },
  nytimes: {
    domain: "nytimes.com", name: "The New York Times", template: "broadsheet",
    palette: { text: "#121212", muted: "#5a5a5a", accent: "#326891", rule: "#dfdfdf" },
    headlineFont: FONTS.serif, bodyFont: FONTS.serif, mastheadFont: FONTS.blackletter,
    paths: { default: "{domain}/{yyyy}/{mm}/{dd}/{section}/{slug}.html" }, slugMax: 56,
    sections: { politics: ["Politics", "us/politics"], culture: ["Arts", "arts"], general: ["U.S.", "us"] },
    nav: ["U.S.", "World", "Business", "Arts", "Lifestyle", "Opinion", "Audio", "Games"],
    desk: "The New York Times",
  },
  wsj: {
    domain: "wsj.com", name: "THE WALL STREET JOURNAL.", title: "The Wall Street Journal", template: "broadsheet",
    palette: { text: "#111111", muted: "#555555", accent: "#0274b6", rule: "#cccccc" },
    headlineFont: FONTS.times, bodyFont: FONTS.serif, mastheadFont: FONTS.times,
    paths: { default: "{domain}/{section}/{slug}-{hex8}" }, slugMax: 64,
    sections: { tech: ["Tech", "tech"], culture: ["Arts & Culture", "arts-culture"], general: ["U.S.", "us-news"] },
    nav: ["World", "Business", "U.S.", "Politics", "Economy", "Tech", "Markets & Finance", "Opinion"],
    desk: "The Wall Street Journal",
  },
  politico: {
    domain: "politico.com", name: "POLITICO", template: "broadsheet",
    palette: { text: "#1a1a1a", muted: "#5b5b5b", accent: "#d7182a", rule: "#d9d9d9" },
    headlineFont: FONTS.serif, bodyFont: FONTS.serif, mastheadFont: FONTS.narrow,
    paths: { default: "{domain}/news/{yyyy}/{mm}/{dd}/{slug}-{n8}" },
    sections: { tech: ["Technology", "technology"], business: ["Economy", "economy"], culture: ["Culture", "culture"], general: ["Politics", "politics"] },
    nav: ["Congress", "White House", "Elections", "Playbook", "Policy", "Newsletters"],
    desk: "POLITICO",
  },
  axios: {
    domain: "axios.com", name: "Axios", template: "business",
    palette: { text: "#161616", muted: "#5e5e5e", accent: "#2160ea", rule: "#d8d8d8", bar: "#ffffff", onBar: "#161616" },
    headlineFont: FONTS.system, bodyFont: FONTS.system,
    paths: { default: "{domain}/{yyyy}/{mm}/{dd}/{slug}" }, slugMax: 60,
    sections: {},
    nav: ["Politics", "Business", "Tech", "Economy", "Media", "Local"],
    desk: "Axios",
  },
  business: {
    domain: "bloomberg.com", name: "Bloomberg", template: "business",
    palette: { text: "#000000", muted: "#595959", accent: "#000000", rule: "#000000", bar: "#000000", onBar: "#ffffff" },
    headlineFont: FONTS.sans, bodyFont: FONTS.serif,
    paths: { default: "{domain}/news/articles/{date}/{slug}" },
    sections: { politics: ["Politics", "politics"], culture: ["Pursuits", "pursuits"], general: ["Economics", "economics"] },
    nav: ["Markets", "Economics", "Industries", "Technology", "Politics", "Wealth", "Pursuits", "Opinion"],
    desk: "Bloomberg News",
  },
  cnbc: {
    domain: "cnbc.com", name: "CNBC", template: "cable",
    palette: { text: "#000000", muted: "#5a5a5a", accent: "#005594", rule: "#dddddd", bar: "#005594", onBar: "#ffffff" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans,
    paths: { default: "{domain}/{yyyy}/{mm}/{dd}/{slug}.html" }, slugMax: 64,
    sections: { tech: ["Tech", "technology"], business: ["Markets", "markets"], culture: ["Media", "media"], general: ["Business", "business"] },
    nav: ["Markets", "Business", "Investing", "Tech", "Politics", "Video", "Watchlist"],
    desk: "CNBC",
  },
  cnn: {
    domain: "cnn.com", name: "CNN", template: "cable",
    palette: { text: "#0c0c0c", muted: "#6e6e6e", accent: "#cc0000", rule: "#e6e6e6", bar: "#0c0c0c", onBar: "#ffffff" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans,
    paths: { default: "{domain}/{yyyy}/{mm}/{dd}/{section}/{slug}" }, slugMax: 60,
    sections: { tech: ["Business", "tech"], general: ["US", "us"] },
    nav: ["US", "World", "Politics", "Business", "Health", "Entertainment", "Style", "Travel", "Sports"],
    desk: "CNN", dateline: { style: "plain", tag: "CNN" },
  },
  foxnews: {
    domain: "foxnews.com", name: "FOX NEWS", title: "Fox News", template: "cable",
    palette: { text: "#111111", muted: "#666666", accent: "#c20017", rule: "#e3e3e3", bar: "#003366", onBar: "#ffffff" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans,
    paths: { default: "{domain}/{section}/{slug}" },
    sections: { tech: ["Tech", "tech"], business: ["U.S.", "us"], general: ["U.S.", "us"] },
    nav: ["U.S.", "Politics", "World", "Opinion", "Media", "Entertainment", "Sports", "Lifestyle"],
    desk: "Fox News",
  },
  tmz: {
    domain: "tmz.com", name: "TMZ", template: "tabloid", zone: "PT",
    palette: { text: "#111111", muted: "#6b6b6b", accent: "#e10000", rule: "#e5e5e5", bar: "#e10000", onBar: "#ffffff" },
    headlineFont: FONTS.condensed, bodyFont: FONTS.sans, mastheadFont: FONTS.condensed,
    paths: { default: "{domain}/{yyyy}/{mm}/{dd}/{slug}/" }, slugMax: 60,
    sections: {},
    nav: ["Celebrity", "Sports", "TV", "Music", "Hip Hop", "Videos", "Photos"],
    desk: "TMZ Staff",
  },
  popcrave: {
    domain: "popcrave.com", name: "POP CRAVE", title: "Pop Crave", template: "tabloid",
    palette: { text: "#141414", muted: "#6b6b6b", accent: "#e5197e", rule: "#ececec", bar: "#141414", onBar: "#ffffff" },
    headlineFont: FONTS.condensed, bodyFont: FONTS.sans, mastheadFont: FONTS.condensed,
    paths: { default: "{domain}/{slug}/" }, slugMax: 60,
    sections: { culture: ["Celebrity", "celebrity"], general: ["News", "news"] },
    nav: ["Music", "Charts", "Film & TV", "Celebrity", "Fashion"],
    desk: "Pop Crave",
  },
  voguemagazine: {
    domain: "vogue.com", name: "VOGUE", title: "Vogue", template: "glossy",
    palette: { text: "#000000", muted: "#6b6b6b", accent: "#000000", rule: "#e6e6e6" },
    headlineFont: FONTS.didone, bodyFont: FONTS.serif, mastheadFont: FONTS.didone,
    paths: { default: "{domain}/article/{slug}" }, slugMax: 60,
    sections: { culture: ["Fashion", "fashion"], general: ["Culture", "culture"], tech: ["Culture", "culture"], business: ["Fashion", "fashion"], politics: ["Culture", "culture"] },
    nav: ["Fashion", "Beauty", "Culture", "Living", "Runway", "Shopping", "Video"],
    desk: "Vogue",
  },
  variety: {
    domain: "variety.com", name: "VARIETY", title: "Variety", template: "trade", zone: "PT",
    palette: { text: "#141414", muted: "#666666", accent: "#c5002f", rule: "#dcdcdc", bar: "#000000", onBar: "#ffffff" },
    headlineFont: FONTS.serif, bodyFont: FONTS.serif, mastheadFont: FONTS.times,
    paths: { default: "{domain}/{yyyy}/{section}/news/{slug}-{n10}/" },
    sections: { tech: ["Digital", "digital"], business: ["Biz", "biz"], politics: ["Politics", "politics"], culture: ["Film", "film"], general: ["TV", "tv"] },
    nav: ["Film", "TV", "What To Watch", "Music", "Docs", "Tech", "Global", "Awards Circuit", "Video"],
    desk: "Variety",
  },
  techcrunch: {
    domain: "techcrunch.com", name: "TechCrunch", template: "tech", zone: "PT", mark: "TC",
    palette: { text: "#222222", muted: "#6a6a6a", accent: "#0a8f08", rule: "#e6e6e6" },
    headlineFont: FONTS.system, bodyFont: FONTS.serif,
    paths: { default: "{domain}/{yyyy}/{mm}/{dd}/{slug}/" }, slugMax: 64,
    sections: { tech: ["AI", "ai"], business: ["Venture", "venture"], politics: ["Government & Policy", "government-policy"], culture: ["Media & Entertainment", "media-entertainment"], general: ["Startups", "startups"] },
    nav: ["Latest", "Startups", "Venture", "Apple", "Security", "AI", "Apps", "Events"],
    desk: "TechCrunch",
  },
  verge: {
    domain: "theverge.com", name: "The Verge", template: "tech", zone: "UTC",
    palette: { bg: "#131313", text: "#f2f2f2", muted: "#9a9a9a", accent: "#3cffd0", rule: "#313131", bar: "#131313", onBar: "#f2f2f2" },
    headlineFont: FONTS.sans, bodyFont: FONTS.serif,
    paths: { default: "{domain}/{section}/{n6}/{slug}" }, slugMax: 60,
    sections: { tech: ["Tech", "tech"], business: ["Business", "business"], politics: ["Policy", "policy"], culture: ["Entertainment", "entertainment"], general: ["News", "news"] },
    nav: ["Tech", "Reviews", "Science", "Entertainment", "AI", "Policy"],
    desk: "The Verge",
  },


  // --------------------------------------- sports and culture publishers
  espn: {
    domain: "espn.com", name: "ESPN", template: "cable",
    palette: { text: "#121212", muted: "#6c6c6c", accent: "#d00000", rule: "#dddddd", bar: "#121212", onBar: "#ffffff" },
    headlineFont: FONTS.grotesk, bodyFont: FONTS.sans, mastheadFont: FONTS.condensed,
    paths: { default: "{domain}/{section}/story/_/id/{n8}/{slug}" }, slugMax: 64,
    sections: { tech: ["Esports", "esports"], business: ["MLB", "mlb"], politics: ["Outside the Lines", "espn/otl"], culture: ["NBA", "nba"], general: ["NFL", "nfl"] },
    nav: ["Scores", "NFL", "NBA", "NCAAF", "NHL", "NCAAM", "NCAAW", "Soccer", "More Sports", "Fantasy", "Watch"],
    desk: "ESPN", zone: "ET",
  },
  bleacherreport: {
    domain: "bleacherreport.com", name: "Bleacher Report", template: "tabloid",
    palette: { text: "#111111", muted: "#6b6b6b", accent: "#000000", rule: "#e2e2e2", bar: "#000000", onBar: "#ffffff" },
    headlineFont: FONTS.narrow, bodyFont: FONTS.sans, mastheadFont: FONTS.condensed,
    paths: { default: "{domain}/articles/{n8}-{slug}" }, slugMax: 100, mark: "B/R",
    sections: { tech: ["Soccer", "soccer"], business: ["MLB", "mlb"], politics: ["CFB", "cfb"], culture: ["NBA", "nba"], general: ["NFL", "nfl"] },
    nav: ["NFL", "CFB", "NBA", "MLB", "NHL", "Fantasy Football", "Soccer"],
    desk: "Bleacher Report", zone: "ET",
  },
  theathletic: {
    domain: "nytimes.com", name: "The Athletic", template: "broadsheet",
    palette: { text: "#121212", muted: "#5f5f5f", accent: "#e5483a", rule: "#dfdfdf" },
    headlineFont: FONTS.serif, bodyFont: FONTS.serif, mastheadFont: FONTS.sans,
    paths: { default: "{domain}/athletic/7{n6}/{yyyy}/{mm}/{dd}/{slug}/" }, slugMax: 64,
    sections: { tech: ["Soccer", "soccer"], business: ["MLB", "mlb"], politics: ["College Football", "college-football"], culture: ["NBA", "nba"], general: ["NFL", "nfl"] },
    nav: ["NFL", "NBA", "MLB", "NHL", "Soccer", "College Football", "College Basketball", "Fantasy"],
    desk: "The Athletic Staff", zone: "ET",
  },
  deadline: {
    domain: "deadline.com", name: "DEADLINE", title: "Deadline", template: "trade", zone: "PT",
    palette: { text: "#111111", muted: "#666666", accent: "#d4141c", rule: "#dddddd", bar: "#000000", onBar: "#ffffff" },
    headlineFont: FONTS.sans, bodyFont: FONTS.serif, mastheadFont: FONTS.sans,
    paths: { default: "{domain}/{yyyy}/{mm}/{slug}-{n10}/" }, slugMax: 70,
    sections: { tech: ["Digital", "digital"], business: ["Business", "business"], politics: ["Politics", "politics"], culture: ["Film", "film"], general: ["TV", "tv"] },
    nav: ["Film", "TV", "Awards", "Box Office", "Business", "International", "Obituaries", "Video"],
    desk: "Deadline Staff",
  },
  ign: {
    domain: "ign.com", name: "IGN", template: "tech", zone: "PT", mark: "IGN",
    palette: { text: "#161616", muted: "#666666", accent: "#bf1313", rule: "#e3e3e3", bar: "#161616", onBar: "#ffffff" },
    headlineFont: FONTS.system, bodyFont: FONTS.sans, mastheadFont: FONTS.condensed,
    paths: { default: "{domain}/articles/{slug}" }, slugMax: 64,
    sections: { tech: ["Tech", "tech"], business: ["News", "news"], politics: ["News", "news"], culture: ["Movies", "movies"], general: ["Games", "games"] },
    nav: ["Games", "Movies", "TV", "Comics", "Tech", "Guides", "Reviews", "Video"],
    desk: "IGN Staff",
  },
  rollingstone: {
    domain: "rollingstone.com", name: "Rolling Stone", template: "glossy", zone: "ET",
    palette: { text: "#111111", muted: "#666666", accent: "#d32531", rule: "#e2e2e2", bar: "#ffffff", onBar: "#111111" },
    headlineFont: FONTS.serif, bodyFont: FONTS.serif, mastheadFont: FONTS.slab,
    paths: { default: "{domain}/{section}/{slug}-{n10}/" }, slugMax: 70,
    sections: { tech: ["Culture", "culture/culture-news"], business: ["Music", "music/music-news"], politics: ["Politics", "politics/politics-news"], culture: ["Music", "music/music-news"], general: ["Culture", "culture/culture-news"] },
    nav: ["Music", "TV & Movies", "Politics", "Culture", "Lists", "Country", "Video"],
    desk: "Rolling Stone",
  },
  discussingfilm: {
    domain: "discussingfilm.net", name: "DiscussingFilm", title: "DiscussingFilm", template: "tabloid", zone: "PT",
    palette: { text: "#141414", muted: "#6b6b6b", accent: "#d62828", rule: "#e5e5e5", bar: "#111111", onBar: "#ffffff" },
    headlineFont: FONTS.condensed, bodyFont: FONTS.sans, mastheadFont: FONTS.condensed,
    paths: { default: "{domain}/{yyyy}/{mm}/{dd}/{slug}/" }, slugMax: 60,
    sections: { tech: ["TV", "tv"], business: ["Film", "film"], politics: ["Lists & Editorials", "lists-editorials"], culture: ["Film", "film"], general: ["Exclusives", "exclusives"] },
    nav: ["Home", "Exclusives", "Film", "TV", "Lists & Editorials", "Events"],
    desk: "DiscussingFilm Staff",
  },

  // ----------------------------------------------------- invented outlets
  theinference: {
    domain: "theinference.com", name: "The Inference", template: "tech", zone: "PT", mark: "In",
    palette: { text: "#16202b", muted: "#5d6b7a", accent: "#0a66c2", rule: "#e3e8ee" },
    headlineFont: FONTS.serif, bodyFont: FONTS.serif,
    paths: { default: "{domain}/articles/{slug}" }, slugMax: 64,
    sections: { tech: ["AI", "ai"], business: ["Deals", "deals"], politics: ["Policy", "policy"], culture: ["Media", "media"], general: ["Startups", "startups"] },
    nav: ["AI", "Chips", "Startups", "Deals", "Policy", "Org Charts"],
    desk: "The Inference",
  },
  margincalldaily: {
    domain: "margincalldaily.com", name: "Margin Call Daily", template: "business",
    palette: { text: "#111111", muted: "#666666", accent: "#b8860b", rule: "#dddddd", bar: "#111111", onBar: "#f5c518" },
    headlineFont: FONTS.sans, bodyFont: FONTS.serif, mastheadFont: FONTS.sans,
    paths: { default: "{domain}/markets/{yyyy}/{mm}/{slug}" }, slugMax: 60,
    sections: { tech: ["Tech Stocks", "tech"], business: ["Markets", "markets"], politics: ["Policy Risk", "policy"], culture: ["Media", "media"], general: ["Markets", "markets"] },
    nav: ["Markets", "Short Interest", "Earnings", "Crypto", "Rates", "Blowups"],
    desk: "Margin Call Daily",
  },
  patriotonenews: {
    domain: "patriotonenews.com", name: "PATRIOT ONE", title: "Patriot One News", template: "cable",
    palette: { text: "#141414", muted: "#666666", accent: "#b00020", rule: "#e0e0e0", bar: "#9b111e", onBar: "#ffffff" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans, mastheadFont: FONTS.condensed,
    paths: { default: "{domain}/{section}/{slug}" }, slugMax: 64,
    sections: { tech: ["Tech", "tech"], business: ["Economy", "economy"], politics: ["Politics", "politics"], culture: ["Culture", "culture"], general: ["US", "us"] },
    nav: ["Politics", "Economy", "Border", "Media", "Culture", "Opinion", "Watch Live"],
    desk: "Patriot One Staff",
  },
  progressnownet: {
    domain: "progressnow.tv", name: "PNN", title: "Progress Now Network", template: "cable",
    palette: { text: "#141414", muted: "#666666", accent: "#1f6feb", rule: "#e0e0e0", bar: "#12355b", onBar: "#ffffff" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans, mastheadFont: FONTS.sans,
    paths: { default: "{domain}/news/{section}/{slug}-{n6}" }, slugMax: 60,
    sections: { tech: ["Tech & Power", "tech"], business: ["Economy", "economy"], politics: ["Politics", "politics"], culture: ["Culture", "culture"], general: ["Nation", "nation"] },
    nav: ["Politics", "Democracy", "Economy", "Climate", "Justice", "Opinion", "Live"],
    desk: "PNN Staff",
  },
  thedailyscroll: {
    domain: "thedailyscroll.co.uk", name: "The Daily Scroll", template: "tabloid", zone: "UTC",
    palette: { text: "#111111", muted: "#666666", accent: "#0a2a6b", rule: "#e5e5e5", bar: "#0a2a6b", onBar: "#ffffff" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans, mastheadFont: FONTS.times,
    paths: { default: "{domain}/{section}/article-{n8}/{slug}.html" }, slugMax: 90,
    sections: { tech: ["Sci-Tech", "sciencetech"], business: ["Money", "money"], politics: ["News", "news"], culture: ["Showbiz", "tvshowbiz"], general: ["News", "news"] },
    nav: ["News", "Showbiz", "Femail", "Royals", "Money", "Sci-Tech", "Sport"],
    desk: "Daily Scroll Reporter",
  },
  shadereport: {
    domain: "shadereport.com", name: "SHADE REPORT", title: "Shade Report", template: "tabloid", zone: "PT",
    palette: { text: "#141414", muted: "#6b6b6b", accent: "#d6336c", rule: "#f0e4e8", bar: "#f4c2c2", onBar: "#111111" },
    headlineFont: FONTS.condensed, bodyFont: FONTS.sans, mastheadFont: FONTS.condensed,
    paths: { default: "{domain}/{yyyy}/{mm}/{slug}/" }, slugMax: 60,
    sections: {},
    nav: ["Tea", "Music", "Relationships", "Style", "Receipts", "Comments"],
    desk: "Shade Report Staff",
  },
  thebacklot: {
    domain: "thebacklot.com", name: "THE BACKLOT", title: "The Backlot", template: "trade", zone: "PT",
    palette: { text: "#141414", muted: "#666666", accent: "#a67c00", rule: "#dcdcdc", bar: "#141414", onBar: "#e0b04a" },
    headlineFont: FONTS.serif, bodyFont: FONTS.serif, mastheadFont: FONTS.times,
    paths: { default: "{domain}/{yyyy}/{mm}/{slug}-{n10}/" }, slugMax: 60,
    sections: { tech: ["Streaming", "streaming"], business: ["Deals", "deals"], politics: ["Politics", "politics"], culture: ["Film", "film"], general: ["TV", "tv"] },
    nav: ["Film", "TV", "Deals", "Box Office", "Awards", "Music", "Exits"],
    desk: "The Backlot",
  },
  beltwaybrief: {
    domain: "beltwaybrief.com", name: "Beltway Brief", template: "business",
    palette: { text: "#16202b", muted: "#5d6b7a", accent: "#e8532f", rule: "#e3e8ee", bar: "#1d2b3a", onBar: "#ffffff" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans, mastheadFont: FONTS.sans,
    paths: { default: "{domain}/{yyyy}/{mm}/{dd}/{slug}" }, slugMax: 56,
    sections: { tech: ["Tech Policy", "tech"], business: ["Influence", "influence"], politics: ["Politics", "politics"], culture: ["Media", "media"], general: ["Congress", "congress"] },
    nav: ["White House", "Congress", "Campaigns", "Influence", "Tech Policy", "Newsletters"],
    desk: "Beltway Brief",
  },
  blockdesk: {
    domain: "blockdesk.io", name: "BlockDesk", template: "tech", zone: "UTC", mark: "BD",
    palette: { bg: "#0d1117", text: "#e6edf3", muted: "#8b949e", accent: "#19e68c", rule: "#21262d", bar: "#0d1117", onBar: "#e6edf3" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans,
    paths: { default: "{domain}/markets/{yyyy}/{mm}/{dd}/{slug}" }, slugMax: 60,
    sections: { tech: ["Tech", "tech"], business: ["Markets", "markets"], politics: ["Policy", "policy"], culture: ["Culture", "culture"], general: ["Markets", "markets"] },
    nav: ["Markets", "Bitcoin", "Policy", "DeFi", "Prices", "Research"],
    desk: "BlockDesk",
  },

  sidelinedaily: {
    domain: "sidelinedaily.com", name: "SIDELINE DAILY", title: "Sideline Daily", template: "tabloid",
    palette: { text: "#111111", muted: "#666666", accent: "#ff5a1f", rule: "#e6e6e6", bar: "#111111", onBar: "#ffe14d" },
    headlineFont: FONTS.condensed, bodyFont: FONTS.sans, mastheadFont: FONTS.condensed,
    paths: { default: "{domain}/articles/{n8}-{slug}" }, slugMax: 64,
    sections: { sports: ["Hot Takes", "takes"], business: ["Money", "money"], culture: ["Culture", "culture"], general: ["Trending", "trending"] },
    nav: ["NFL", "NBA", "Soccer", "Rankings", "Trade Machine", "Takes", "Receipts"],
    desk: "Sideline Daily Staff",
  },
  thearc: {
    domain: "thearc.com", name: "The Arc", template: "arc",
    palette: { text: "#121212", muted: "#5c5c5c", accent: "#1d4e89", rule: "#dcdcdc" },
    headlineFont: FONTS.times, bodyFont: FONTS.serif,
    mastheadFont: '"Big Caslon", "Bodoni 72", Didot, "Times New Roman", Georgia, serif',
    paths: { default: "{domain}/{yyyy}/{mm}/{dd}/{section}/{slug}", edition: "{domain}/print/{yyyy}/{mm}/{dd}" }, slugMax: 60,
    sections: { culture: ["Culture", "culture"], general: ["National", "national"] },
    nav: ["National", "Politics", "Business", "Technology", "Markets", "Culture", "Sports", "Comment"],
    desk: "The Arc",
  },

  // ------------------------------------------------- companies and parties
  openai: {
    domain: "openai.com", name: "OpenAI", template: "newsroom", zone: "PT",
    palette: { text: "#0d0d0d", muted: "#6e6e80", accent: "#0d0d0d", rule: "#e5e5e5" },
    headlineFont: FONTS.system, bodyFont: FONTS.system,
    paths: { default: "{domain}/index/{slug}/" },
    sections: {}, nav: ["Research", "Safety", "ChatGPT", "Sora", "API Platform", "For Business", "Company", "News"],
    desk: "OpenAI",
  },
  tesla: {
    domain: "tesla.com", name: "TESLA", title: "Tesla", template: "newsroom", zone: "CT",
    palette: { text: "#171a20", muted: "#5c5e62", accent: "#3e6ae1", rule: "#e4e4e4" },
    headlineFont: FONTS.system, bodyFont: FONTS.system, mastheadFont: FONTS.sans,
    paths: { default: "{domain}/blog/{slug}" },
    sections: {}, nav: ["Vehicles", "Energy", "Charging", "Discover", "Shop"],
    desk: "The Tesla Team", sub: "Blog",
  },
  spacex: {
    domain: "spacex.com", name: "SPACEX", title: "SpaceX", template: "newsroom", zone: "CT",
    palette: { bg: "#000000", text: "#f0f0f0", muted: "#9b9b9b", accent: "#ffffff", rule: "#2b2b2b", bar: "#000000", onBar: "#ffffff" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans, mastheadFont: FONTS.sans,
    paths: { default: "{domain}/updates/{slug}/" },
    sections: {}, nav: ["Falcon 9", "Falcon Heavy", "Dragon", "Starship", "Human Spaceflight", "Rideshare", "Starlink"],
    desk: "SpaceX", sub: "Updates",
  },
  nvidia: {
    domain: "nvidianews.nvidia.com", name: "NVIDIA", template: "newsroom", zone: "PT",
    palette: { text: "#1a1a1a", muted: "#666666", accent: "#76b900", rule: "#e0e0e0", bar: "#000000", onBar: "#ffffff" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans,
    paths: { default: "nvidianews.nvidia.com/news/{slug}", blog: "blogs.nvidia.com/blog/{slug}/" },
    sections: {}, nav: ["Products", "Solutions", "Industries", "For You", "Shop", "Drivers", "Support"],
    desk: "NVIDIA Newsroom", sub: "Newsroom",
  },
  meta: {
    domain: "about.fb.com", name: "Meta", template: "newsroom", zone: "PT",
    palette: { text: "#1c2b33", muted: "#65676b", accent: "#0866ff", rule: "#dee3e9" },
    headlineFont: FONTS.system, bodyFont: FONTS.system,
    paths: { default: "{domain}/news/{yyyy}/{mm}/{slug}/" },
    sections: {}, nav: ["Company Info", "Technologies", "Actions", "Media Gallery", "Investor Relations"],
    desk: "Meta", sub: "Newsroom",
  },
  spotify: {
    domain: "newsroom.spotify.com", name: "Spotify", template: "newsroom",
    palette: { text: "#121212", muted: "#6a6a6a", accent: "#1db954", rule: "#e5e5e5", bar: "#121212", onBar: "#ffffff" },
    headlineFont: FONTS.system, bodyFont: FONTS.system,
    paths: { default: "{domain}/{date}/{slug}/" },
    sections: {}, nav: ["News", "Culture", "Product", "Company", "Podcasts"],
    desk: "Spotify", sub: "For the Record",
  },
  apple: {
    domain: "apple.com", name: "Apple", template: "newsroom", zone: "PT",
    palette: { bg: "#ffffff", text: "#1d1d1f", muted: "#6e6e73", accent: "#0071e3", rule: "#d2d2d7", bar: "#f5f5f7", onBar: "#1d1d1f" },
    headlineFont: FONTS.system, bodyFont: FONTS.system,
    paths: { default: "{domain}/newsroom/{yyyy}/{mm}/{slug}/" },
    sections: {}, nav: ["Store", "Mac", "iPad", "iPhone", "Watch", "Vision", "AirPods", "TV & Home"],
    desk: "Apple Newsroom", sub: "Newsroom",
  },
  microsoft: {
    domain: "news.microsoft.com", name: "Microsoft", template: "newsroom", zone: "PT",
    palette: { text: "#1b1b1b", muted: "#616161", accent: "#0067b8", rule: "#e1e1e1" },
    headlineFont: '"Segoe UI", ' + FONTS.system, bodyFont: '"Segoe UI", ' + FONTS.system,
    paths: {
      default: "news.microsoft.com/{yyyy}/{mm}/{dd}/{slug}/",
      blog: "blogs.microsoft.com/blog/{yyyy}/{mm}/{dd}/{slug}/",
      statement: "blogs.microsoft.com/on-the-issues/{yyyy}/{mm}/{dd}/{slug}/",
    },
    sections: {}, nav: ["Microsoft 365", "Teams", "Copilot", "Windows", "Surface", "Xbox"],
    desk: "Microsoft News Center", sub: "Source",
  },
  google: {
    domain: "blog.google", name: "Google", template: "newsroom", zone: "PT",
    palette: { text: "#202124", muted: "#5f6368", accent: "#1a73e8", rule: "#dadce0" },
    headlineFont: FONTS.system, bodyFont: FONTS.system,
    paths: {
      default: "blog.google/inside-google/company-announcements/{slug}/",
      blog: "blog.google/technology/ai/{slug}/",
    },
    sections: {}, nav: ["Product updates", "Company news", "Technology", "Outreach & initiatives"],
    desk: "Google", sub: "The Keyword",
  },
  amazon: {
    domain: "aboutamazon.com", name: "amazon", title: "Amazon", template: "newsroom",
    palette: { text: "#0f1111", muted: "#565959", accent: "#ff9900", rule: "#e3e6e6", bar: "#232f3e", onBar: "#ffffff" },
    headlineFont: FONTS.system, bodyFont: FONTS.system,
    paths: { default: "{domain}/news/company-news/{slug}" },
    sections: {}, nav: ["Our Company", "News", "Workplace", "Sustainability", "Innovation", "Community"],
    desk: "Amazon Staff", sub: "News",
  },
  xai: {
    domain: "x.ai", name: "xAI", template: "newsroom", zone: "PT",
    palette: { bg: "#0a0a0a", text: "#f4f4f4", muted: "#8f8f8f", accent: "#ffffff", rule: "#262626", bar: "#0a0a0a", onBar: "#ffffff" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans,
    paths: { default: "{domain}/news/{slug}" },
    sections: {}, nav: ["Grok", "API", "Company", "Careers", "News"],
    desk: "xAI",
  },
  blueorigin: {
    domain: "blueorigin.com", name: "BLUE ORIGIN", title: "Blue Origin", template: "newsroom", zone: "PT",
    palette: { text: "#0a1d3a", muted: "#5d6a7e", accent: "#1f4fb5", rule: "#dde2ea", bar: "#0a1d3a", onBar: "#ffffff" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans, mastheadFont: FONTS.sans,
    paths: { default: "{domain}/news/{slug}" },
    sections: {}, nav: ["New Glenn", "New Shepard", "Blue Moon", "Engines", "In-Space Systems"],
    desk: "Blue Origin", sub: "News",
  },
  nike: {
    domain: "about.nike.com", name: "NIKE, Inc.", title: "Nike", template: "newsroom", zone: "PT",
    palette: { text: "#111111", muted: "#707072", accent: "#111111", rule: "#e5e5e5" },
    headlineFont: FONTS.narrow, bodyFont: FONTS.sans, mastheadFont: FONTS.condensed,
    paths: { default: "{domain}/en/newsroom/releases/{slug}" },
    sections: {}, nav: ["Impact", "Newsroom", "Investors", "Careers"],
    desk: "Nike News", sub: "Newsroom",
  },
  skims: {
    domain: "skims.com", name: "SKIMS", template: "newsroom", zone: "PT",
    palette: { bg: "#f6f1eb", text: "#3a2e28", muted: "#7d6d63", accent: "#6f5847", rule: "#e2d8cd", bar: "#f6f1eb", onBar: "#3a2e28" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans, mastheadFont: FONTS.sans,
    paths: { default: "{domain}/blogs/press/{slug}" },
    sections: {}, nav: ["New", "Bestsellers", "Bras", "Underwear", "Loungewear", "Shapewear", "Men"],
    desk: "SKIMS", sub: "Press",
  },
  fentybeauty: {
    domain: "fentybeauty.com", name: "FENTY BEAUTY", title: "Fenty Beauty", template: "newsroom", zone: "PT",
    palette: { text: "#1a1a1a", muted: "#6f6f6f", accent: "#a8744f", rule: "#e8e1da", bar: "#000000", onBar: "#ffffff" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans, mastheadFont: FONTS.sans,
    paths: { default: "{domain}/blogs/news/{slug}" },
    sections: {}, nav: ["Face", "Lips", "Eyes", "Skin", "Fragrance", "Sets"],
    desk: "Fenty Beauty", sub: "News",
  },
  gop: {
    domain: "gop.com", name: "GOP", template: "newsroom",
    palette: { text: "#0d1d3a", muted: "#5b6578", accent: "#c8102e", rule: "#dde1e8", bar: "#0d1d3a", onBar: "#ffffff" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans, mastheadFont: FONTS.condensed,
    paths: { default: "{domain}/press-release/{slug}/" },
    sections: {}, nav: ["About", "News", "Research", "Get Involved"],
    desk: "RNC Communications", sub: "News",
  },
  thedemocrats: {
    domain: "democrats.org", name: "Democrats", template: "newsroom",
    palette: { text: "#0b1f4d", muted: "#5a6683", accent: "#0f4ac2", rule: "#dbe1ee", bar: "#0b1f4d", onBar: "#ffffff" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans,
    paths: { default: "{domain}/news/{slug}/" },
    sections: {}, nav: ["Who We Are", "Where We Stand", "News", "Take Action"],
    desk: "Democratic National Committee", sub: "News",
  },

  // ------------------------------------------------- leagues and clubs
  nba: {
    domain: "nba.com", name: "NBA", template: "newsroom",
    palette: { text: "#111111", muted: "#5f6368", accent: "#1d428a", rule: "#e4e4e4", bar: "#1d428a", onBar: "#ffffff" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans, mastheadFont: FONTS.condensed,
    paths: { default: "{domain}/news/{slug}" },
    sections: {}, nav: ["Games", "Schedule", "Watch", "News", "Stats", "Standings", "Teams", "Players"],
    desk: "NBA.com Staff", sub: "News", city: "NEW YORK",
  },
  nfl: {
    domain: "nfl.com", name: "NFL", template: "newsroom",
    palette: { text: "#151515", muted: "#5f6368", accent: "#013369", rule: "#e4e4e4", bar: "#013369", onBar: "#ffffff" },
    headlineFont: FONTS.narrow, bodyFont: FONTS.sans, mastheadFont: FONTS.condensed,
    paths: { default: "{domain}/news/{slug}" },
    sections: {}, nav: ["News", "Scores", "Schedule", "Video", "Teams", "Stats", "Standings"],
    desk: "NFL.com", sub: "News", city: "NEW YORK",
  },
  premierleague: {
    domain: "premierleague.com", name: "Premier League", template: "newsroom", zone: "UTC",
    palette: { text: "#37003c", muted: "#6c6c6c", accent: "#37003c", rule: "#ebe5eb", bar: "#37003c", onBar: "#ffffff" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans, mastheadFont: FONTS.sans,
    paths: { default: "{domain}/en/news/{n8}/{slug}" },
    sections: {}, nav: ["Matches", "Table", "Statistics", "Fantasy", "Clubs", "Players", "News", "Video"],
    desk: "Premier League", sub: "News", city: "LONDON",
  },
  lakers: {
    domain: "nba.com", name: "LAKERS", title: "Los Angeles Lakers", template: "newsroom", zone: "PT",
    palette: { text: "#141414", muted: "#5f6368", accent: "#552583", rule: "#e4e4e4", bar: "#552583", onBar: "#fdb927" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans, mastheadFont: FONTS.condensed,
    paths: { default: "{domain}/lakers/news/{slug}" },
    sections: {}, nav: ["Schedule", "Tickets", "Team", "News", "Stats", "Community", "Shop"],
    desk: "Lakers.com", sub: "News", city: "EL SEGUNDO, Calif.",
  },
  chiefs: {
    domain: "chiefs.com", name: "CHIEFS", title: "Kansas City Chiefs", template: "newsroom", zone: "CT",
    palette: { text: "#141414", muted: "#5f6368", accent: "#e31837", rule: "#e4e4e4", bar: "#e31837", onBar: "#ffffff" },
    headlineFont: FONTS.narrow, bodyFont: FONTS.sans, mastheadFont: FONTS.condensed,
    paths: { default: "{domain}/news/{slug}" },
    sections: {}, nav: ["News", "Video", "Photos", "Team", "Schedule", "Tickets", "Pro Shop"],
    desk: "Chiefs.com", sub: "News", city: "KANSAS CITY, Mo.",
  },
  dallascowboys: {
    domain: "dallascowboys.com", name: "DALLAS COWBOYS", title: "Dallas Cowboys", template: "newsroom", zone: "CT",
    palette: { text: "#141414", muted: "#5f6368", accent: "#041e42", rule: "#dfe3e8", bar: "#041e42", onBar: "#ffffff" },
    headlineFont: FONTS.narrow, bodyFont: FONTS.sans, mastheadFont: FONTS.condensed,
    paths: { default: "{domain}/news/{slug}" },
    sections: {}, nav: ["News", "Video", "Team", "Schedule", "Tickets", "Cheerleaders", "Shop"],
    desk: "DallasCowboys.com Staff", sub: "News", city: "FRISCO, Texas",
  },
  realmadrid: {
    domain: "realmadrid.com", name: "Real Madrid", title: "Real Madrid", template: "newsroom", zone: "UTC",
    palette: { text: "#0b1f4d", muted: "#5d6a7e", accent: "#3e31fa", rule: "#e2e6ee", bar: "#ffffff", onBar: "#0b1f4d" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans, mastheadFont: FONTS.sans,
    paths: { default: "{domain}/en-US/news/club/announcements/{slug}-{dd}-{mm}-{yyyy}" },
    sections: {}, nav: ["Football", "Basketball", "Club", "Tickets", "Bernabéu Tour", "RM Play", "Store"],
    desk: "Real Madrid C.F.", sub: "Official Announcement", city: "MADRID",
  },
  manutd: {
    domain: "manutd.com", name: "MANCHESTER UNITED", title: "Manchester United", template: "newsroom", zone: "UTC",
    palette: { text: "#141414", muted: "#5f6368", accent: "#da291c", rule: "#e4e4e4", bar: "#da291c", onBar: "#ffffff" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans, mastheadFont: FONTS.condensed,
    paths: { default: "{domain}/en/news/detail/{slug}" },
    sections: {}, nav: ["News", "Fixtures", "Players", "Tickets", "MUTV", "Store", "Fans"],
    desk: "Manchester United", sub: "News", city: "MANCHESTER",
  },

  // ------------------------------------------- studios, platforms and games
  netflix: {
    domain: "about.netflix.com", name: "NETFLIX", title: "Netflix", template: "newsroom", zone: "PT",
    palette: { text: "#141414", muted: "#6d6d6e", accent: "#e50914", rule: "#e6e6e6" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans, mastheadFont: FONTS.condensed,
    paths: { default: "{domain}/en/news/{slug}" },
    sections: {}, nav: ["Company", "News", "Tudum", "Jobs", "Investors"],
    desk: "Netflix", sub: "Newsroom", city: "LOS ANGELES",
  },
  marvelstudios: {
    domain: "marvel.com", name: "MARVEL", title: "Marvel", template: "newsroom", zone: "PT",
    palette: { text: "#151515", muted: "#5f6368", accent: "#ec1d24", rule: "#e4e4e4", bar: "#202020", onBar: "#ffffff" },
    headlineFont: FONTS.narrow, bodyFont: FONTS.sans, mastheadFont: FONTS.condensed,
    paths: { default: "{domain}/articles/movies/{slug}" },
    sections: {}, nav: ["News", "Comics", "Characters", "Movies", "TV Shows", "Games", "Videos"],
    desk: "Marvel", city: "BURBANK, Calif.",
  },
  playstation: {
    domain: "blog.playstation.com", name: "PlayStation.Blog", title: "PlayStation Blog", template: "newsroom", zone: "PT",
    palette: { text: "#1f1f1f", muted: "#6b6b6b", accent: "#0070d1", rule: "#e3e3e3", bar: "#00439c", onBar: "#ffffff" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans, mastheadFont: FONTS.sans,
    paths: { default: "{domain}/{yyyy}/{mm}/{dd}/{slug}/" },
    sections: {}, nav: ["PS5", "PS VR2", "PlayStation Plus", "PlayStation Store", "State of Play"],
    desk: "PlayStation Blog", city: "SAN MATEO, Calif.",
  },
  xbox: {
    domain: "news.xbox.com", name: "Xbox Wire", template: "newsroom", zone: "PT",
    palette: { text: "#1a1a1a", muted: "#616161", accent: "#107c10", rule: "#e3e3e3", bar: "#107c10", onBar: "#ffffff" },
    headlineFont: FONTS.system, bodyFont: FONTS.system, mastheadFont: FONTS.system,
    paths: { default: "{domain}/en-us/{yyyy}/{mm}/{dd}/{slug}/" },
    sections: {}, nav: ["Games", "Game Pass", "Consoles", "Events", "Podcast"],
    desk: "Xbox Wire", city: "REDMOND, Wash.",
  },
  rockstargames: {
    domain: "rockstargames.com", name: "ROCKSTAR GAMES", title: "Rockstar Games", template: "newsroom",
    palette: { bg: "#000000", text: "#f2f2f2", muted: "#9a9a9a", accent: "#fcaf17", rule: "#2a2a2a", bar: "#000000", onBar: "#fcaf17" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans, mastheadFont: FONTS.condensed,
    paths: { default: "{domain}/newswire/article/{hex8}/{slug}" },
    sections: {}, nav: ["Games", "Newswire", "Videos", "Downloads", "Store", "Support"],
    desk: "Rockstar Games", sub: "Newswire", city: "NEW YORK",
  },
  theacademy: {
    domain: "oscars.org", name: "ACADEMY OF MOTION PICTURE ARTS AND SCIENCES", title: "The Academy", template: "newsroom", zone: "PT",
    palette: { text: "#161616", muted: "#666666", accent: "#b48c2a", rule: "#e4e0d6", bar: "#161616", onBar: "#d4af37" },
    headlineFont: FONTS.serif, bodyFont: FONTS.serif, mastheadFont: FONTS.sans,
    paths: { default: "{domain}/news/{slug}" },
    sections: {}, nav: ["Oscars", "Academy Museum", "Collections", "Learn", "Events", "News"],
    desk: "The Academy", sub: "News", city: "LOS ANGELES",
  },

  // ------------------------------------------------------------ government
  whitehouse: {
    domain: "whitehouse.gov", name: "THE WHITE HOUSE", title: "The White House", city: "WASHINGTON", template: "government",
    palette: { text: "#0b1d3a", muted: "#5a6475", accent: "#a8862e", rule: "#d9dde4", bar: "#0b1d3a", onBar: "#ffffff" },
    headlineFont: FONTS.serif, bodyFont: FONTS.serif, mastheadFont: FONTS.times,
    paths: { default: "{domain}/briefings-statements/{yyyy}/{mm}/{slug}/" },
    sections: {}, nav: ["News", "Administration", "Issues", "Briefings & Statements", "Presidential Actions"],
    desk: "Office of the Press Secretary", govBanner: FED,
  },
  secgov: {
    domain: "sec.gov", name: "U.S. Securities and Exchange Commission", title: "the SEC", city: "Washington D.C.", template: "government",
    palette: { text: "#1b1b1b", muted: "#565c65", accent: "#1a4480", rule: "#dfe1e2", bar: "#162e51", onBar: "#ffffff" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans, mastheadFont: FONTS.serif,
    paths: { default: "{domain}/news/press-release/{yyyy}-{id}" },
    sections: {}, nav: ["About", "Divisions & Offices", "Enforcement", "Regulation", "Newsroom", "Filings"],
    desk: "Office of Public Affairs", govBanner: FED,
  },
  govpressoffice: {
    domain: "gov.ca.gov", name: "Governor Gavin Newsom", title: "the Governor's Office", city: "SACRAMENTO", template: "government", zone: "PT",
    palette: { text: "#1f2933", muted: "#5d6b78", accent: "#046b99", rule: "#dde3e8", bar: "#0a3d62", onBar: "#ffffff" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans, mastheadFont: FONTS.serif,
    paths: { default: "{domain}/{yyyy}/{mm}/{dd}/{slug}/" },
    sections: {}, nav: ["About", "Newsroom", "Priorities", "Appointments", "Contact"],
    desk: "Governor's Press Office", govBanner: "Official website of the State of California",
  },

  // ==== markets and crypto: new entries go directly under this line
  unusual_whales: {
    domain: "unusualwhales.com", name: "unusual_whales", title: "Unusual Whales", template: "tech", mark: "UW",
    palette: { bg: "#0b0f19", text: "#e8ecf4", muted: "#8a93a6", accent: "#2ec27e", rule: "#1f2636", bar: "#0b0f19", onBar: "#e8ecf4" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans,
    paths: { default: "{domain}/news/{slug}" }, slugMax: 64,
    sections: { tech: ["Tech", "tech"], business: ["Markets", "markets"], politics: ["Congress Trading", "politics"], culture: ["News", "news"], general: ["Markets", "markets"] },
    nav: ["Flow", "News", "Politics", "Earnings", "Market Tide", "Screener"],
    desk: "Unusual Whales",
  },
  watcherguru: {
    domain: "watcher.guru", name: "Watcher.Guru", template: "tech", mark: "WG",
    palette: { bg: "#0d0d0d", text: "#f2f2f2", muted: "#9a9a9a", accent: "#f5b300", rule: "#262626", bar: "#0d0d0d", onBar: "#f5b300" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans,
    paths: { default: "{domain}/news/{slug}" }, slugMax: 64,
    sections: { tech: ["Technology", "technology"], business: ["Finance", "finance"], politics: ["Politics", "politics"], culture: ["News", "news"], general: ["Crypto", "crypto"] },
    nav: ["Crypto", "Finance", "Markets", "Politics", "Technology", "Prices"],
    desk: "Watcher.Guru",
  },
  coinbase: {
    domain: "coinbase.com", name: "coinbase", title: "Coinbase", template: "newsroom", zone: "PT",
    palette: { text: "#0a0b0d", muted: "#5b616e", accent: "#0052ff", rule: "#e2e4e8" },
    headlineFont: FONTS.system, bodyFont: FONTS.system,
    paths: { default: "{domain}/blog/{slug}" },
    sections: {}, nav: ["Individuals", "Businesses", "Institutions", "Developers", "Company"],
    desk: "Coinbase", sub: "Blog",
  },
  binance: {
    domain: "binance.com", name: "BINANCE", title: "Binance", template: "newsroom", zone: "UTC",
    palette: { bg: "#0b0e11", text: "#eaecef", muted: "#848e9c", accent: "#f0b90b", rule: "#2b3139", bar: "#0b0e11", onBar: "#f0b90b" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans, mastheadFont: FONTS.sans,
    paths: { default: "{domain}/en/blog/ecosystem/{n8}{n10}", statement: "{domain}/en/support/announcement/detail/{hex32}" },
    sections: {}, nav: ["Buy Crypto", "Markets", "Trade", "Futures", "Earn", "Square"],
    desk: "Binance", sub: "Blog",
  },
  robinhoodapp: {
    domain: "robinhood.com", name: "Robinhood", template: "newsroom", zone: "PT",
    palette: { text: "#000000", muted: "#6b6b6b", accent: "#00c805", rule: "#e3e3e3", bar: "#000000", onBar: "#ccff00" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans, mastheadFont: FONTS.sans,
    paths: { default: "{domain}/us/en/newsroom/{slug}/" },
    sections: {}, nav: ["Invest", "Crypto", "Retirement", "Gold", "Learn", "Newsroom"],
    desk: "Robinhood", sub: "Newsroom", city: "MENLO PARK, Calif.",
  },
  nasdaq: {
    domain: "nasdaq.com", name: "Nasdaq", template: "newsroom", zone: "ET",
    palette: { text: "#0f1a2b", muted: "#5d6876", accent: "#0090ba", rule: "#dfe4ea", bar: "#0f1a2b", onBar: "#ffffff" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans, mastheadFont: FONTS.sans,
    paths: { default: "{domain}/press-release/{slug}-{yyyy}-{mm}-{dd}" },
    sections: {}, nav: ["Market Activity", "Investing", "News", "Solutions", "About"],
    desk: "Nasdaq", sub: "Press Releases", city: "NEW YORK",
  },
  federalreserve: {
    domain: "federalreserve.gov", name: "Board of Governors of the Federal Reserve System", title: "the Federal Reserve", city: "WASHINGTON", template: "government",
    palette: { text: "#1b1b1b", muted: "#5a5a5a", accent: "#0b4a8b", rule: "#d9dee5", bar: "#002855", onBar: "#ffffff" },
    headlineFont: FONTS.serif, bodyFont: FONTS.serif, mastheadFont: FONTS.serif,
    paths: { default: "{domain}/newsevents/pressreleases/other{yyyy}{mm}{dd}a.htm", statement: "{domain}/newsevents/pressreleases/monetary{yyyy}{mm}{dd}a.htm" },
    sections: {}, nav: ["About the Fed", "News & Events", "Monetary Policy", "Supervision & Regulation", "Financial Stability", "Payment Systems", "Economic Research", "Data"],
    desk: "Board of Governors of the Federal Reserve System", govBanner: FED,
  },

  // ==== gaming, streamers and creators: new entries go directly under this line
  kotaku: {
    domain: "kotaku.com", name: "Kotaku", template: "tech", zone: "ET", mark: "K",
    palette: { text: "#1a1a1a", muted: "#6b6b6b", accent: "#a1c933", rule: "#e6e6e6", bar: "#1a1a1a", onBar: "#ffffff" },
    headlineFont: FONTS.sans, bodyFont: FONTS.serif, mastheadFont: FONTS.sans,
    paths: { default: "{domain}/{slug}-{n10}" }, slugMax: 66,
    sections: { tech: ["Tech", "tech"], business: ["Industry", "industry"], politics: ["News", "news"], culture: ["Culture", "culture"], general: ["Games", "games"] },
    nav: ["Games", "News", "Culture", "Reviews", "Guides", "Deals"],
    desk: "Kotaku Staff",
  },
  dexerto: {
    domain: "dexerto.com", name: "Dexerto", template: "tech", zone: "UTC", mark: "DX",
    palette: { text: "#111111", muted: "#6a6a6a", accent: "#ff3b3b", rule: "#e5e5e5", bar: "#0d0d0d", onBar: "#ffffff" },
    headlineFont: FONTS.system, bodyFont: FONTS.system, mastheadFont: FONTS.condensed,
    paths: { default: "{domain}/{section}/{slug}-{n8}/" }, slugMax: 66,
    sections: { tech: ["Tech", "tech"], business: ["Entertainment", "entertainment"], politics: ["Entertainment", "entertainment"], culture: ["Entertainment", "entertainment"], general: ["Gaming", "gaming"] },
    nav: ["Gaming", "Entertainment", "Esports", "Twitch", "Kick", "YouTube", "Tech"],
    desk: "Dexerto Staff",
  },
  thesponsorread: {
    domain: "thesponsorread.com", name: "The Sponsor Read", template: "tech", zone: "PT", mark: "SR",
    palette: { text: "#1b1530", muted: "#6b6580", accent: "#7c3aed", rule: "#e7e3f0", bar: "#1b1530", onBar: "#ffffff" },
    headlineFont: FONTS.serif, bodyFont: FONTS.serif, mastheadFont: FONTS.serif,
    paths: { default: "{domain}/p/{slug}" }, slugMax: 60,
    sections: { tech: ["Platforms", "platforms"], business: ["Deals", "deals"], politics: ["Platforms", "platforms"], culture: ["Drama", "drama"], general: ["Creators", "creators"] },
    nav: ["Drama", "Deals", "Platforms", "Contracts", "Archive"],
    desk: "The Sponsor Read",
  },
  nintendoamerica: {
    domain: "nintendo.com", name: "NINTENDO", title: "Nintendo of America", template: "newsroom", zone: "PT",
    palette: { text: "#222222", muted: "#6b6b6b", accent: "#e60012", rule: "#e6e6e6", bar: "#e60012", onBar: "#ffffff" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans, mastheadFont: FONTS.condensed,
    paths: { default: "{domain}/us/whatsnew/{slug}/" },
    sections: {}, nav: ["Games", "Nintendo Switch 2", "Nintendo Switch Online", "What's New", "Store", "Support"],
    desk: "Nintendo of America", city: "REDMOND, Wash.",
  },
  twitch: {
    domain: "blog.twitch.tv", name: "twitch", title: "Twitch", template: "newsroom", zone: "PT",
    palette: { bg: "#ffffff", text: "#0e0e10", muted: "#53535f", accent: "#9146ff", rule: "#e5e5ea", bar: "#9146ff", onBar: "#ffffff" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans, mastheadFont: FONTS.sans,
    paths: { default: "{domain}/en/{yyyy}/{mm}/{dd}/{slug}/" },
    sections: {}, nav: ["Streamers", "Viewers", "Safety", "Events", "TwitchCon", "Creator Camp"],
    desk: "Twitch", sub: "Blog", city: "SAN FRANCISCO",
  },
  kick: {
    domain: "kick.com", name: "KICK", title: "Kick", template: "newsroom", zone: "UTC",
    palette: { bg: "#0b0e0f", text: "#f2f2f2", muted: "#9aa0a3", accent: "#53fc18", rule: "#232a2d", bar: "#0b0e0f", onBar: "#53fc18" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans, mastheadFont: FONTS.condensed,
    paths: { default: "{domain}/blog/{slug}" },
    sections: {}, nav: ["Browse", "Creators", "Partners", "Ads", "Blog", "Help"],
    desk: "Kick", sub: "News", city: "MELBOURNE",
  },
  fortnite: {
    domain: "fortnite.com", name: "FORTNITE", title: "Fortnite", template: "newsroom", zone: "ET",
    palette: { text: "#121212", muted: "#5f6368", accent: "#2d6bff", rule: "#e3e3e3", bar: "#121212", onBar: "#ffffff" },
    headlineFont: FONTS.condensed, bodyFont: FONTS.sans, mastheadFont: FONTS.condensed,
    paths: { default: "{domain}/news/{slug}" },
    sections: {}, nav: ["News", "Battle Pass", "Creative", "Competitive", "Shop", "Support"],
    desk: "Fortnite", sub: "News", city: "CARY, N.C.",
  },
  thegameawards: {
    domain: "thegameawards.com", name: "THE GAME AWARDS", title: "The Game Awards", template: "newsroom", zone: "PT",
    palette: { bg: "#0a0a0a", text: "#f1ede4", muted: "#a49c8a", accent: "#d4af37", rule: "#2b2a26", bar: "#0a0a0a", onBar: "#d4af37" },
    headlineFont: FONTS.serif, bodyFont: FONTS.sans, mastheadFont: FONTS.serif,
    paths: { default: "{domain}/news/{slug}" },
    sections: {}, nav: ["Nominees", "Vote", "Watch", "Tickets", "Future Class", "News"],
    desk: "The Game Awards", sub: "News", city: "LOS ANGELES",
  },

  // ==== formula 1: new entries go directly under this line
  f1: {
    domain: "formula1.com", name: "FORMULA 1", title: "Formula 1", template: "newsroom", zone: "UTC",
    palette: { text: "#15151e", muted: "#5f6368", accent: "#e10600", rule: "#e4e4e4", bar: "#15151e", onBar: "#ffffff" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans, mastheadFont: FONTS.condensed,
    paths: { default: "{domain}/en/latest/article/{slug}.{hex8}" }, slugMax: 80,
    sections: {}, nav: ["Latest", "Video", "Schedule", "Results", "Drivers", "Teams", "Fantasy", "Store"],
    desk: "Formula 1", sub: "Latest", city: "LONDON",
  },
  scuderiaferrari: {
    domain: "ferrari.com", name: "FERRARI", title: "Scuderia Ferrari", template: "newsroom", zone: "UTC",
    palette: { text: "#181818", muted: "#666666", accent: "#da291c", rule: "#e6e6e6", bar: "#da291c", onBar: "#ffffff" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans, mastheadFont: FONTS.sans,
    paths: { default: "{domain}/en-EN/formula1/articles/{slug}" },
    sections: {}, nav: ["Formula 1", "Drivers", "Calendar", "Results", "Tickets", "Shop"],
    desk: "Scuderia Ferrari HP", sub: "Formula 1", city: "MARANELLO",
  },
  redbullracing: {
    domain: "redbullracing.com", name: "RED BULL RACING", title: "Red Bull Racing", template: "newsroom", zone: "UTC",
    palette: { text: "#0e1b3d", muted: "#5f6b85", accent: "#e30613", rule: "#e0e3ea", bar: "#0e1b3d", onBar: "#ffffff" },
    headlineFont: FONTS.narrow, bodyFont: FONTS.sans, mastheadFont: FONTS.condensed,
    paths: { default: "{domain}/int-en/{slug}" },
    sections: {}, nav: ["News", "Drivers", "Car", "Team", "Partners", "Shop"],
    desk: "Oracle Red Bull Racing", sub: "News", city: "MILTON KEYNES",
  },
  wearetherace: {
    domain: "the-race.com", name: "THE RACE", title: "The Race", template: "broadsheet", zone: "UTC",
    palette: { text: "#111111", muted: "#5f5f5f", accent: "#e8112d", rule: "#e2e2e2" },
    headlineFont: FONTS.sans, bodyFont: FONTS.sans, mastheadFont: FONTS.condensed,
    paths: { default: "{domain}/{section}/{slug}/" }, slugMax: 80,
    sections: { sports: ["Formula 1", "formula-1"], tech: ["Technical", "formula-1/technical"], business: ["Business", "formula-1/business"], general: ["Formula 1", "formula-1"] },
    nav: ["Formula 1", "Formula E", "IndyCar", "Endurance", "Podcasts", "Video"],
    desk: "The Race Staff",
  },
};

/** Fallbacks for handles not in SITES, by account kind. */
function fallback(kind: AccountKind, handle: string, name: string): Entry {
  const domain = `${handle.toLowerCase().replace(/[^a-z0-9-]/g, "")}.com`;
  if (kind === "outlet") {
    return {
      domain, name, template: "broadsheet",
      palette: { muted: "#5a5a5a", accent: "#1a5fb4", rule: "#dedede" },
      headlineFont: FONTS.serif, bodyFont: FONTS.serif,
      paths: { default: "{domain}/{yyyy}/{mm}/{dd}/{section}/{slug}" },
      sections: {}, nav: ["News", "Politics", "Business", "Technology", "Culture", "Opinion"],
      desk: name,
    };
  }
  return {
    domain, name, template: "newsroom",
    palette: { muted: "#5f6368", accent: "#1a5fb4", rule: "#e2e2e2" },
    headlineFont: FONTS.system, bodyFont: FONTS.system,
    paths: { default: kind === "org" ? "{domain}/newsroom/{slug}" : "{domain}/blog/{slug}" },
    sections: {}, nav: kind === "org" ? ["About", "Newsroom", "Careers", "Contact"] : ["Home", "About", "Archive"],
    desk: name, sub: kind === "org" ? "Newsroom" : undefined,
  };
}

function build(handle: string, e: Entry): SiteConfig {
  return {
    ...e,
    handle,
    title: e.title ?? e.name,
    palette: { ...LIGHT, ...e.palette },
    sections: sections(e.sections ?? {}),
    mastheadFont: e.mastheadFont ?? e.headlineFont,
    zone: e.zone ?? "ET",
    slugMax: e.slugMax ?? 80,
  };
}

const cache = new Map<string, SiteConfig>();

/** The site for a publishing account. Unknown handles get the default for
 *  their account kind (outlets a newspaper, everyone else a newsroom). */
export function siteFor(account: { handle: string; name?: string; kind?: AccountKind }): SiteConfig {
  const key = account.handle.toLowerCase();
  const known = SITES[key];
  if (known) {
    let s = cache.get(key);
    if (!s) cache.set(key, (s = build(key, known)));
    return s;
  }
  const kind = account.kind ?? "org";
  return build("", fallback(kind, account.handle, account.name ?? account.handle));
}

// -------------------------------------------------------------- addresses

const ZONES: Record<Zone, string> = {
  ET: "America/New_York", CT: "America/Chicago", PT: "America/Los_Angeles", UTC: "UTC",
};

const partFormatters = new Map<Zone, Intl.DateTimeFormat>();

/** Calendar and clock parts of a time in the given zone. */
export function zoneParts(t: number, zone: Zone) {
  let f = partFormatters.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: ZONES[zone], year: "numeric", month: "numeric", day: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true, weekday: "long",
    });
    partFormatters.set(zone, f);
  }
  const p: Record<string, string> = {};
  for (const x of f.formatToParts(new Date(t))) p[x.type] = x.value;
  return {
    year: Number(p.year), month: Number(p.month), day: Number(p.day),
    hour: Number(p.hour), minute: p.minute, pm: (p.dayPeriod ?? "").toUpperCase() === "PM", weekday: p.weekday,
  };
}

const TOPICS: [Topic, RegExp][] = [
  ["sports", /\b(nba|nfl|mlb|nhl|premier league|champions league|la liga|world cup|super bowl|playoffs?|quarterback|touchdown|head coach|free agen\w*|trade deadline|transfer window|striker|midfielder|goalkeeper|lakers|golden state|kansas city chiefs|dallas cowboys|real madrid|manchester (united|city)|man utd|liverpool fc|lebron|steph(en)? curry|mahomes|kelce|ronaldo|mbapp[eé]|haaland|espn|kick-?off|locker room|injury report|pre-?season|all-star)\b/i],
  ["politics", /\b(trump|vance|aoc|ocasio|newsom|white house|congress|senat\w*|house gop|democrat\w*|republican\w*|gop|dnc|rnc|election|campaign|governor|president|tariff\w*|lawmakers?|hearing|subpoena|supreme court|pentagon|executive order|ballot|poll(s|ing)?|sec chair|regulator\w*)\b/i],
  ["business", /\b(stocks?|shares?|earnings|revenue|profit|ipo|investors?|valuation|market cap|wall street|nasdaq|s&p|dow|bonds?|fed|merger|acquisition|deal|layoffs?|ceo|board|lawsuit|sec|bitcoin|crypto|dogecoin|billion|\$\d)\b/i],
  ["tech", /\b(ai|a\.i\.|openai|chatgpt|gpt|grok|xai|nvidia|chips?|gpus?|tesla|spacex|starship|rocket|robot\w*|app|iphone|apple|google|gemini|meta|microsoft|amazon|software|startup|data cent(er|re)s?|model|llm|launch|cyber\w*|blue origin)\b/i],
  ["culture", /\b(album|tour|concert|song|single|grammy|oscar|emmy|film|movie|box office|premiere|red carpet|met gala|fashion|runway|vogue|beauty|makeup|skims|fenty|celebrit\w*|swift|kardashian|jenner|drake|cardi|rihanna|chalamet|feud|diss|wedding|dating|breakup|podcast|tv|series|netflix|spotify)\b/i],
];

/** Guess the subject of a page from its headline. */
export function topicOf(headline: string): Topic {
  for (const [topic, re] of TOPICS) if (re.test(headline)) return topic;
  return "general";
}

export function sectionFor(site: SiteConfig, headline: string): Section {
  return site.sections[topicOf(headline)];
}

function slugify(s: string, max: number): string {
  const base = s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’‘]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!base) return "update";
  if (base.length <= max) return base;
  const cut = base.slice(0, max);
  const i = cut.lastIndexOf("-");
  return i > 16 ? cut.slice(0, i) : cut;
}

/** FNV-1a: a stable 32-bit hash for invented ids in addresses. */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const hex = (n: number) => n.toString(16).padStart(8, "0");
const pad2 = (n: number) => String(n).padStart(2, "0");

/** The address shown on a link card and in the simulated browser, without a
 *  scheme, e.g. "bloomberg.com/news/articles/2026-11-14/nvidia-board-review".
 *  The app routes by article id; the address is display only (some patterns
 *  carry the id, most do not). */
export function pageUrl(handle: string, kind: PageKind, id: number, headline: string, createdAt: number): string {
  // pageUrl does not know the account kind: articles come from outlets, the rest from official accounts.
  const site = siteFor({ handle, kind: kind === "article" ? "outlet" : "org" });
  const pattern = site.paths[kind] ?? site.paths.default;
  const d = zoneParts(createdAt, site.zone);
  const seed = `${id}:${headline}`;
  const h = hash32(seed);
  const tokens: Record<string, string> = {
    domain: site.domain,
    yyyy: String(d.year),
    mm: pad2(d.month),
    dd: pad2(d.day),
    date: `${d.year}-${pad2(d.month)}-${pad2(d.day)}`,
    slug: slugify(headline, site.slugMax),
    section: sectionFor(site, headline).path,
    id: String(id),
    hex8: hex(h),
    hex32: hex(h) + hex(hash32(seed + "b")) + hex(hash32(seed + "c")) + hex(hash32(seed + "d")),
    n6: String(400000 + (h % 600000)),
    n8: String(10000000 + (h % 90000000)),
    n10: String(1236000000 + (h % 999999)),
  };
  return pattern.replace(/\{(\w+)\}/g, (m, k: string) => tokens[k] ?? m);
}

/** "nytimes.com" and "/2026/11/14/..." from a page address. */
export function splitUrl(url: string): { host: string; path: string } {
  const i = url.indexOf("/");
  return i < 0 ? { host: url, path: "" } : { host: url.slice(0, i), path: url.slice(i) };
}
