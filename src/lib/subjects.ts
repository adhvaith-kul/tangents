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
    description: "Founders, companies, markets and AI.",
    words: "subject topic tech startups stocks finance crypto",
    newsCategory: "Technology",
    feeds: [
      { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
      { name: "CNBC", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html" },
    ],
  },
  {
    key: "pop",
    label: "Pop culture",
    name: "pop culture",
    short: "pop culture",
    description: "Celebrities and fashion, film and TV, music, gaming and internet culture.",
    words: "subject topic celebrity entertainment movies music games fashion",
    newsCategory: "Entertainment",
    explore: { tab: "entertainment", label: "Entertainment", order: 2 },
    feeds: [
      { name: "TMZ", url: "https://www.tmz.com/rss.xml" },
      { name: "Deadline", url: "https://deadline.com/feed/" },
      { name: "Variety", url: "https://variety.com/feed/" },
      { name: "IGN", url: "https://feeds.feedburner.com/ign/all" },
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
    description: "Basketball, American football and soccer: the players, pundits and insiders.",
    words: "subject topic nba nfl football basketball soccer",
    newsCategory: "Sports",
    explore: { tab: "sports", label: "Sports", order: 1 },
    feeds: [
      { name: "ESPN", url: "https://www.espn.com/espn/rss/nba/news" },
      { name: "ESPN", url: "https://www.espn.com/espn/rss/nfl/news" },
      { name: "ESPN", url: "https://www.espn.com/espn/rss/soccer/news" },
      { name: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/football/rss.xml" },
    ],
  },
] as const satisfies readonly SubjectDef[];

export type Subject = (typeof DEFS)[number]["key"];

/** A subject, or the internal `crossover` for a story that spans several. */
export type Domain = Subject | "crossover";

export const SUBJECTS: readonly Subject[] = DEFS.map((d) => d.key);
export const DOMAINS: readonly Domain[] = [...SUBJECTS, "crossover"];

export const SUBJECT_INFO = Object.fromEntries(DEFS.map((d) => [d.key, d])) as unknown as Record<Subject, SubjectDef>;

export const isSubject = (s: unknown): s is Subject => (SUBJECTS as readonly unknown[]).includes(s);

/** Explore tabs that narrow everything to one subject. */
export type ExploreSubjectTab = Extract<(typeof DEFS)[number], { explore: unknown }>["explore"]["tab"];
export type ExploreTab = "for_you" | "trending" | "news" | ExploreSubjectTab;

export const SUBJECT_TABS: { key: ExploreSubjectTab; label: string; subject: Subject }[] = DEFS
  .flatMap((d) => ("explore" in d ? [{ ...d.explore, subject: d.key }] : []))
  .sort((a, b) => a.order - b.order)
  .map((t) => ({ key: t.tab, label: t.label, subject: t.subject }));
