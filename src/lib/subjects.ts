// The subjects a reader can turn up or down: the one place they are listed.
// Browser-safe and dependency-free, so client components import it too.
// Adding a subject: see "Adding a subject" in docs/CONTRACTS.md.

interface SubjectDef {
  /** Stored as the domain string and as the Settings key. Never rename. */
  key: string;
  /** Shown in Settings and at sign-up. */
  label: string;
  /** Used inside sentences, including the prompts. */
  name: string;
  /** The shorter name used in Settings summaries and the story map filter. */
  short: string;
  /** Settings description and the other words that find it in Settings search. */
  description: string;
  words: string;
  /** Category printed above a storyline in "Today's News". */
  newsCategory: string;
  /** A narrowing tab on Explore, placed by `order` among the subject tabs. */
  explore?: { tab: string; label: string; order: number };
  /** Real headline feeds, in addition to the Google News search built from the cast. */
  feeds: readonly { name: string; url: string }[];
}

const DEFS = [
  {
    key: "tech",
    label: "Technology and business",
    name: "technology and business",
    short: "technology",
    description: "Founders, companies, startups and AI.",
    words: "subject topic tech startups ai business",
    newsCategory: "Technology",
    feeds: [
      { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
      { name: "CNBC", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html" },
    ],
  },
  {
    key: "markets",
    label: "Markets and crypto",
    name: "markets and crypto",
    short: "markets",
    description: "Stocks, crypto and the Fed: investors, traders and the people calling the top.",
    words: "subject topic stocks finance crypto bitcoin investing trading",
    newsCategory: "Business",
    feeds: [
      { name: "CNBC", url: "https://www.cnbc.com/id/10000664/device/rss/rss.html" },
      { name: "MarketWatch", url: "https://feeds.content.dowjones.io/public/rss/mw_topstories" },
      { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
      { name: "Cointelegraph", url: "https://cointelegraph.com/rss" },
    ],
  },
  {
    key: "pop",
    label: "Pop culture",
    name: "pop culture",
    short: "pop culture",
    description: "Celebrities and fashion, film and TV, music and internet culture.",
    words: "subject topic celebrity entertainment movies music fashion",
    newsCategory: "Entertainment",
    explore: { tab: "entertainment", label: "Entertainment", order: 2 },
    feeds: [
      { name: "TMZ", url: "https://www.tmz.com/rss.xml" },
      { name: "Deadline", url: "https://deadline.com/feed/" },
      { name: "Variety", url: "https://variety.com/feed/" },
    ],
  },
  {
    key: "gaming",
    label: "Gaming, streamers and creators",
    name: "gaming, streamers and creators",
    short: "gaming",
    description: "Streamers, creators and the games business: launches, feuds and the people who clip them.",
    words: "subject topic games gaming streamers creators twitch youtube esports",
    newsCategory: "Gaming",
    feeds: [
      { name: "IGN", url: "https://feeds.feedburner.com/ign/all" },
      { name: "Kotaku", url: "https://kotaku.com/rss" },
      { name: "GamesIndustry.biz", url: "https://www.gamesindustry.biz/feed" },
      { name: "Tubefilter", url: "https://www.tubefilter.com/feed/" },
    ],
  },
  {
    key: "politics",
    label: "Politics",
    name: "politics",
    short: "politics",
    description: "The White House, Congress, campaigns and the people who argue about them.",
    words: "subject topic government election president",
    newsCategory: "Politics",
    feeds: [{ name: "Politico", url: "https://rss.politico.com/politics-news.xml" }],
  },
  {
    key: "sports",
    label: "Sports",
    name: "sports",
    short: "sports",
    description: "Basketball, American football, soccer and Formula 1: the players, drivers, pundits and insiders.",
    words: "subject topic nba nfl football basketball soccer f1 formula racing",
    newsCategory: "Sports",
    explore: { tab: "sports", label: "Sports", order: 1 },
    feeds: [
      { name: "ESPN", url: "https://www.espn.com/espn/rss/nba/news" },
      { name: "ESPN", url: "https://www.espn.com/espn/rss/nfl/news" },
      { name: "ESPN", url: "https://www.espn.com/espn/rss/soccer/news" },
      { name: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/football/rss.xml" },
      { name: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/formula1/rss.xml" },
      { name: "Motorsport.com", url: "https://www.motorsport.com/rss/f1/news/" },
    ],
  },
] as const satisfies readonly SubjectDef[];

export type Subject = (typeof DEFS)[number]["key"];

/** A subject, or the internal `crossover` for a story that spans several. */
export type Domain = Subject | "crossover";

export const SUBJECTS: readonly Subject[] = DEFS.map((d) => d.key);
export const DOMAINS: readonly Domain[] = [...SUBJECTS, "crossover"];

export const SUBJECT_INFO = Object.fromEntries(DEFS.map((d) => [d.key, d])) as unknown as Record<Subject, SubjectDef>;


/** Explore tabs that narrow everything to one subject. */
export type ExploreSubjectTab = Extract<(typeof DEFS)[number], { explore: unknown }>["explore"]["tab"];
export type ExploreTab = "for_you" | "trending" | "news" | ExploreSubjectTab;

export const SUBJECT_TABS: { key: ExploreSubjectTab; label: string; subject: Subject }[] = DEFS
  .flatMap((d) => ("explore" in d ? [{ ...d.explore, subject: d.key }] : []))
  .sort((a, b) => a.order - b.order)
  .map((t) => ({ key: t.tab, label: t.label, subject: t.subject }));
