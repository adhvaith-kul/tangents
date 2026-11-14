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
  | "government";

/** Rough subject of a page, guessed from its headline; picks the section. */
export type Topic = "tech" | "business" | "politics" | "culture" | "general";

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
