// Shared types: the contract between the API routes, the simulation and the UI.
// FROZEN after phase 1. If you need a change here, report it instead of editing.

export type Domain = "tech" | "pop" | "politics" | "crossover";
export const DOMAINS: Domain[] = ["tech", "pop", "politics", "crossover"];

export type Tone =
  | "feud"
  | "drama"
  | "hype"
  | "wholesome"
  | "shitpost"
  | "business"
  | "gossip"
  | "meltdown";
export const TONES: Tone[] = [
  "feud",
  "drama",
  "hype",
  "wholesome",
  "shitpost",
  "business",
  "gossip",
  "meltdown",
];

/** figure: a famous person, commentators included. outlet: a news publisher.
 *  org: an official company or government account. crowd: an ordinary account. */
export type AccountKind = "figure" | "outlet" | "org" | "crowd" | "user";
export type Badge = "blue" | "gold" | null;

// ---------------------------------------------------------------- accounts

export interface AccountLite {
  handle: string; // without the leading @
  name: string;
  avatar: string | null; // URL path under /avatars, or null for initials
  badge: Badge;
  kind: AccountKind;
}

export interface Account extends AccountLite {
  bio: string;
  domain: Domain;
  followers: number;
  following: number;
  location: string | null;
  joined: string; // e.g. "June 2009"
  banner: string; // CSS colour for the profile banner
  isFollowing: boolean; // does the user follow this account
  isSelf: boolean;
}

// ------------------------------------------------------------------- posts

export interface PostCounts {
  replies: number;
  reposts: number;
  likes: number;
  views: number;
}

export interface ViewerState {
  liked: boolean;
  reposted: boolean;
  bookmarked: boolean;
}

/** What kind of web page a post links to. Outlets publish articles; official
 *  accounts publish press releases, blog posts and statements. */
export type PageKind = "article" | "press_release" | "blog" | "statement";

export interface ArticleCard {
  id: number;
  outlet: AccountLite; // the publishing account: an outlet or an official account
  kind: PageKind;
  headline: string;
  dek: string;
  /** The address shown on the link card and in the simulated browser,
   *  without a scheme, e.g. "bloomberg.com/news/articles/2026-11-14/...". */
  url: string;
  createdAt: number;
}

/** Something attached to a post. gif: a real GIF found by search. meme: a known
 *  template image with caption text laid over it by the app. chart: a price
 *  chart drawn from the app's own market data. */
export type PostMedia =
  | { kind: "gif"; url: string; width: number; height: number; alt: string }
  | { kind: "meme"; template: string; top: string; bottom: string }
  | { kind: "chart"; ticker: string };

export interface QuotedPost {
  id: number;
  author: AccountLite;
  text: string;
  createdAt: number;
}

export interface PostView {
  id: number;
  author: AccountLite;
  text: string;
  createdAt: number; // simulation time, ms since epoch
  replyTo: { id: number; handle: string } | null;
  quote: QuotedPost | null;
  media: PostMedia | null;
  /** Set when this row is on the timeline because someone reposted it: who,
   *  and when. On a profile it is that profile's own repost. Null otherwise. */
  repost: { by: AccountLite; at: number } | null;
  /** The post quoted another post that its author has since deleted. */
  quoteUnavailable: boolean;
  /** A tombstone: the author deleted this post. Only ever appears among a
   *  thread's ancestors; text is empty and nothing on it is interactive. */
  deleted: boolean;
  article: ArticleCard | null; // set on an outlet post that links to a story
  storylineId: number | null;
  domain: Domain | null;
  tone: Tone | null;
  topics: string[];
  counts: PostCounts;
  viewer: ViewerState;
}

export interface ArticleView extends ArticleCard {
  body: string; // paragraphs separated by blank lines
  storylineId: number | null;
  /** Set when the page was revised after publication (a developing story). */
  updatedAt: number | null;
}

// ---------------------------------------------------------------- settings

export type Level = 0 | 1 | 2 | 3 | 4;

/** The user's content controls. Every level runs 0 to 4 with 2 as the default.
 *  The content rules (no hate, sexual content, invented crimes...) are not here:
 *  they are fixed. */
export interface Settings {
  /** 0 stays close to the real news; 4 heightens events furthest. */
  satire: Level;
  /** 0 calm and civil; 4 feuds and public rows. */
  conflict: Level;
  /** 0 rare; 4 constant jokes, memes and trolling from ordinary accounts. */
  shitposting: Level;
  /** 0 lets the world drift on its own storylines; 4 follows the real news closely. */
  reality: Level;
  /** How much of each subject. 0 turns it off. */
  tech: Level;
  pop: Level;
  politics: Level;
  /** How many trolls, bots and engagement farmers turn up in replies. */
  noise: Level;
  profanity: "off" | "mild" | "full";
  /** How often famous accounts engage with the user's posts. 0 never. */
  visibility: Level;
  personalisation: "off" | "light" | "strong";
  /** GIFs and memes in replies: 0 none, 1 some, 2 lots. */
  media: 0 | 1 | 2;
}

export const DEFAULT_SETTINGS: Settings = {
  satire: 2, conflict: 2, shitposting: 2, reality: 2, tech: 2, pop: 2, politics: 2,
  noise: 1, profanity: "mild", visibility: 2, personalisation: "light", media: 1,
};

// --------------------------------------------------------- sidebar, explore

export interface Trend {
  id: number;
  label: string; // "#Hashtag" or a plain phrase
  category: string; // e.g. "Technology · Trending"
  posts: number;
  storylineId: number | null;
}

export interface StockView {
  ticker: string;
  name: string;
  kind: "stock" | "crypto";
  price: number;
  dayOpen: number;
  changePct: number; // against dayOpen
  history: number[]; // oldest first, for the sparkline
  lastReason: string | null;
}

export interface StockMove {
  ticker: string;
  t: number;
  price: number;
  pct: number;
  reason: string;
  storylineId: number | null;
}

/** How fast the world moves. live: a story beat every 40 seconds, for demos.
 *  steady: a story beat about every two minutes with everyday posts between.
 *  slow: a story beat about every six minutes. */
export type Pace = "live" | "steady" | "slow";
export const PACES: Pace[] = ["live", "steady", "slow"];

export interface SimStatus {
  pace: Pace;
  running: boolean; // false when paused
  busy: boolean; // a tick is generating right now
  now: number; // simulation time
  lastTickAt: number | null; // real time of the last finished tick
  ticks: number;
  backend: "cli" | "api";
  error: string | null; // last tick error, if any
  hasSnapshot: boolean;
}

export type SimAction =
  | "pause"
  | "resume"
  | "tick"
  | "skip_day"
  | "save"
  | "restore"
  | "reset";

// ----------------------------------------------------------- notifications

export type NotificationType =
  | "reply"
  | "quote"
  | "mention"
  | "like"
  | "repost"
  | "follow";

export interface NotificationView {
  id: number;
  type: NotificationType;
  actors: AccountLite[]; // most recent first
  count: number; // total people, may exceed actors.length
  post: PostView | null; // the reply / quote / mention itself
  target: PostView | null; // your post that was liked / reposted
  createdAt: number;
  read: boolean;
}

// ------------------------------------------------------------ interactions

export type InteractionType =
  | "like"
  | "unlike"
  | "repost"
  | "unrepost"
  | "bookmark"
  | "unbookmark"
  | "dwell" // ms on screen
  | "skip" // scrolled past in under a second
  | "open" // opened the post or article
  | "profile" // visited the author's profile
  | "not_interested"
  | "follow"
  | "unfollow";

export interface InteractionEvent {
  type: InteractionType;
  postId?: number;
  /** For `open` on a news story page (there is no post id there). */
  articleId?: number;
  handle?: string;
  ms?: number;
}

// --------------------------------------------------------- behind the scenes

export interface StorylineView {
  id: number;
  parentId: number | null;
  title: string;
  summary: string;
  domain: Domain;
  tone: Tone;
  origin: "headline" | "spinoff" | "user" | "original";
  headline: string | null; // the real headline that seeded it
  participants: AccountLite[];
  heat: number; // 1 to 10
  status: "open" | "dormant";
  beats: number;
  createdAt: number;
  updatedAt: number;
}

export interface RelationshipView {
  a: AccountLite;
  b: AccountLite;
  score: number; // -10 to +10
  note: string;
  updatedAt: number;
}

export interface FactView {
  id: number;
  text: string;
  subjects: string[];
  storylineId: number | null;
  createdAt: number;
}

export type PrefKind = "author" | "topic" | "domain" | "tone" | "storyline";

export interface PrefWeight {
  kind: PrefKind;
  key: string;
  label: string; // display label, e.g. account name or storyline title
  weight: number;
}

export interface TasteProfile {
  weights: PrefWeight[]; // strongest first, positive and negative
  signals: number; // interactions recorded so far
}

export interface UsageTotals {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  byRole: { role: string; calls: number; inputTokens: number; outputTokens: number }[];
}

// ------------------------------------------------------------ API payloads

export interface MeResponse {
  user: Account | null; // null until onboarding is done
}
export interface OnboardRequest {
  name: string;
  handle: string;
  interest: "tech" | "pop" | "both";
}

export interface FeedResponse {
  posts: PostView[];
  nextCursor: number | null; // pass back as ?cursor= for the next page
  now: number;
}

export interface CreatePostRequest {
  text: string;
  replyTo?: number;
  quoteOf?: number;
}
export interface CreatePostResponse {
  post: PostView;
}

export interface ThreadResponse {
  ancestors: PostView[]; // oldest first
  post: PostView;
  replies: PostView[];
}

export interface ProfileResponse {
  account: Account;
  posts: PostView[];
  /** Everything the account has posted, replies included, whatever the tab. */
  postCount: number;
}

export interface SidebarResponse {
  trends: Trend[];
  stocks: StockView[];
  whoToFollow: Account[];
  sim: SimStatus;
  unread: number; // unread notifications
}

export interface ExploreResponse {
  trends: Trend[];
  articles: ArticleCard[];
  posts: PostView[]; // search results when ?q= is set, else empty
}

export interface ArticleResponse {
  article: ArticleView;
  posts: PostView[];
  /** Other pages from the same publisher, newest first. */
  more: ArticleCard[];
}

export interface MarketsResponse {
  stocks: StockView[];
  moves: StockMove[]; // newest first
}

export interface NotificationsResponse {
  notifications: NotificationView[];
}

export interface WorldResponse {
  storylines: StorylineView[];
  relationships: RelationshipView[];
  facts: FactView[];
  taste: TasteProfile;
  usage: UsageTotals;
}

// ------------------------------------------- simulation inputs (lib to lib)

/** What the personalisation module tells the director about the user. */
export interface TasteSummary {
  likes: { authors: string[]; topics: string[]; tones: Tone[]; domains: Domain[] };
  avoids: { authors: string[]; topics: string[]; tones: Tone[]; domains: Domain[] };
  signals: number;
}

export interface DigestPost {
  ref: string; // "p123": how the model refers to an existing post
  author: string; // handle
  text: string;
  replyToRef: string | null;
  minutesAgo: number;
}

export interface DigestStoryline {
  id: number;
  parentId: number | null;
  title: string;
  summary: string;
  domain: Domain;
  participants: string[];
  heat: number;
  beats: number;
  hoursSinceLastBeat: number;
  recentPosts: DigestPost[];
}

/** Everything the director sees on one tick. Built by the simulation engine,
 *  rendered into a prompt by src/lib/prompts.ts. */
export interface WorldDigest {
  simTime: string; // e.g. "Saturday 14 November 2026, 09:40"
  mode: "normal" | "user_post" | "next_morning" | "bootstrap";
  user: {
    handle: string;
    name: string;
    followers: number;
    recentPosts: DigestPost[];
  } | null;
  /** Set in user_post mode: the post to react to, with its thread for context. */
  focus: { post: DigestPost; thread: DigestPost[] } | null;
  storylines: DigestStoryline[];
  relationships: { a: string; b: string; score: number; note: string }[];
  facts: { text: string; daysAgo: number }[];
  timeline: DigestPost[]; // recent top-level posts, newest first
  /** Real headlines, as the news desk has fitted them to this world. `title` is
   *  what to work from (rewritten when the real one conflicted with this world). */
  headlines: {
    id: number;
    source: string;
    title: string;
    domain: Domain;
    relation?: "new" | "continues" | "conflicts";
    storylineId?: number | null;
  }[];
  stocks: { ticker: string; price: number; changePct: number }[];
  taste: TasteSummary;
  /** How many ticks since a beat started from a fresh headline. */
  ticksSinceNewEvent: number;
  /** Pacing decision made by the engine: true when this beat should open a new
   *  event from a headline, false when it should stay with the open storylines. */
  newEventDue: boolean;
}
