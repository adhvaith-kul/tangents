// Shared types: the contract between the API routes, the simulation and the UI.
// Change with care: every route, the simulation and the UI depend on it.
import type { Tactic } from "./tactics";
import { SUBJECTS, type Domain, type Subject } from "./subjects";
import type { FrontPage } from "./arc";

// The subjects live in subjects.ts; they are re-exported here for existing imports.
export { DOMAINS, SUBJECTS, type Domain, type Subject } from "./subjects";

export type Tone =
  | "feud"
  | "drama"
  | "hype"
  | "wholesome"
  | "shitpost"
  | "business"
  | "gossip"
  | "meltdown";

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
  banner: string; // a CSS colour, or the path of a banner image
  /** Set only on the reader's own account, through "Edit profile". */
  website: string | null;
  birth: BirthDate | null;
  isFollowing: boolean; // does the user follow this account
  isSelf: boolean;
}

/** Who a part of the birth date is shown to, as X offers it. Only "self" hides it here. */
export type BirthAudience = "public" | "followers" | "following" | "mutuals" | "self";

export interface BirthDate {
  month: number; // 1 to 12
  day: number;
  year: number;
  dayAudience: BirthAudience; // month and day
  yearAudience: BirthAudience;
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
 *  accounts publish press releases, blog posts and statements. An edition is
 *  The Arc's front page for one day (arc.ts). */
export type PageKind = "article" | "press_release" | "blog" | "statement" | "edition";

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
  | { kind: "frontpage"; page: FrontPage }
  | { kind: "meme"; template: string; top: string; bottom: string }
  | { kind: "chart"; ticker: string }
  | { kind: "tiers"; tiers: TierRow[] }
  | { kind: "project"; card: ProjectCard };

// ------------------------------------------------------------------ the slate

/** Invented films, series, albums, tours and games (slate.ts). */
export type ProjectKind = "film" | "series" | "album" | "tour" | "game";
export type ProjectStatus = "announced" | "in_production" | "dated" | "released" | "delayed" | "cancelled";
/** How a project's card is drawn: a film or series has a title card or a poster. */
export type CardFormat = "title_card" | "poster" | "cover" | "tour_poster" | "key_art";

/** What a project's drawn card shows, as it stood when the post went up. */
export interface ProjectCard {
  id: number; // its number on the slate
  kind: ProjectKind;
  format: CardFormat;
  /** Picks the layout and palette (components/media/projectLooks.ts); fixed per project. */
  look: number;
  title: string;
  maker: string; // studio, platform, label or publisher
  /** Attached people in billing order; role is free text ("star", "director", "featured artist"). */
  people: { name: string; role: string }[];
  tagline: string | null;
  release: string | null; // free text: "Summer 2027", "14 August"
  status: ProjectStatus;
  /** A tour: cities and dates. */
  stops: { city: string; date: string }[];
  /** A game: "PS5, Xbox Series X|S, PC". */
  platforms: string | null;
}

/** One row of Explore's "Coming soon". */
export interface ProjectView {
  id: number;
  kind: ProjectKind;
  title: string;
  maker: string;
  release: string | null;
  status: ProjectStatus;
  /** The post that last carried its card, once visible; null if none. */
  postId: number | null;
}

/** A project as the director sees it on the SLATE. */
export interface DigestProject {
  id: number;
  kind: ProjectKind;
  title: string;
  maker: string; // "Netflix (@netflix)" when the maker is in the cast
  people: string[]; // "Tom Cruise (star)", "@RealChalamet (star)"
  logline: string;
  status: ProjectStatus;
  release: string | null;
  figures: string[];
  /** The latest few things that happened to it, oldest first. */
  history: string[];
  storylineId: number | null;
  /** Hours since it was announced, and since anything last happened to it. */
  hoursSinceAnnounced: number;
  hoursSinceNews: number;
}

/** One row of a tier list: a label and the accounts ranked there. */
export interface TierRow {
  label: string;
  members: { handle: string; name: string; avatar: string | null }[];
}

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
  /** The post is not in English: its language (English name) and an English translation. */
  translation?: { lang: string; text: string };
  createdAt: number; // simulation time, ms since epoch
  replyTo: { id: number; handle: string } | null;
  quote: QuotedPost | null;
  media: PostMedia | null;
  /** "Readers added context": a Community Note under the post, or null. */
  note: string | null;
  poll: PollView | null;
  /** Set when this row is on the timeline because someone reposted it: who,
   *  and when. On a profile it is that profile's own repost. Null otherwise. */
  repost: { by: AccountLite; at: number } | null;
  /** The post quoted another post that its author has since deleted. */
  quoteUnavailable: boolean;
  /** The author continued this post in replies to themselves ("Show this thread"). */
  threadStart?: boolean;
  /** For you only: one line on why the timeline chose this post. */
  why?: string;
  /** A tombstone: the author deleted this post. Only ever appears among a
   *  thread's ancestors; text is empty and nothing on it is interactive. */
  deleted: boolean;
  article: ArticleCard | null; // set on an outlet post that links to a story
  storylineId: number | null;
  domain: Domain | null;
  tone: Tone | null;
  topics: string[];
  /** What the post is doing to its reader, as its writer labelled it; null on posts written before labels. */
  tactic: Tactic | null;
  counts: PostCounts;
  viewer: ViewerState;
}

export interface PollView {
  options: { label: string; votes: number; pct: number }[]; // pct: whole numbers summing to about 100
  totalVotes: number;
  /** The option the user voted for, or null. */
  choice: number | null;
  closed: boolean;
  closesAt: number;
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
export interface Settings extends Record<Subject, Level> {
  /** 0 stays close to the real news; 4 heightens events furthest. */
  satire: Level;
  /** 0 calm and civil; 4 feuds and public rows. */
  conflict: Level;
  /** 0 rare; 4 constant jokes, memes and trolling from ordinary accounts. */
  shitposting: Level;
  /** 0 lets the world drift on its own storylines; 4 follows the real news closely. */
  reality: Level;
  // How much of each subject (0 turns it off) is a flat key per subject, from Record<Subject, Level>.
  /** How many trolls, bots and engagement farmers turn up in replies. */
  noise: Level;
  profanity: "off" | "mild" | "full";
  /** How often famous accounts engage with the user's posts. 0 never. */
  visibility: Level;
  personalisation: "off" | "light" | "strong";
  /** GIFs and memes in replies: 0 none, 1 some, 2 lots. */
  media: 0 | 1 | 2;
  /** Kinds of humour in the replies: 0 never, 1 normal, 2 favoured. The overall
   *  amount is `shitposting`. */
  humourStyles: Record<HumourStyle, 0 | 1 | 2>;
  /** How Brok talks: 0 straight, 1 witty, 2 merciless. */
  brokWit: 0 | 1 | 2;
  /** How much the world writes per beat: 0 saver, 1 balanced, 2 full. */
  usage: 0 | 1 | 2;
  /** Daily token limit in thousands; 0 for none. Past it the world stops moving on its own. */
  budget: number;
  /** Major events (sim/major.ts): whether the world may start one on its own. */
  majorSelfStart: boolean;
  /** Which kinds of major event are allowed. */
  majorKinds: Record<ArcKind, boolean>;
  /** Whether a major event may report dead and injured. */
  majorCasualties: boolean;
  /** Rage bait: the world argues the way an outrage-driven platform does (camps,
   *  pile-ons, bad-faith tactics), the timeline ranks the angriest posts first,
   *  and the reader's own posts can be attacked. Off by default. */
  rage: boolean;
  /** X-ray: every post shows what it is doing to its reader (see tactics.ts). Display only. */
  xray: boolean;
}

// ------------------------------------------------------------ major events

/** The kinds of major event, each a switch in Settings. */
export const ARC_KINDS = ["scandal", "business", "politics", "disaster", "world"] as const;
export type ArcKind = (typeof ARC_KINDS)[number];
/** How big a major event is; sets how long it builds. Also the Breaking news menu's choices. */
export const ARC_SCALES = ["scandal", "national", "global"] as const;
export type ArcScale = (typeof ARC_SCALES)[number];
export type BreakingChoice = "surprise" | ArcScale;
export type ArcPhase = "murmurs" | "break" | "fallout" | "resolution";
/** What a consequence hits. */
export const ARC_TARGETS = ["share_price", "fixture", "project", "politician", "company", "figure", "crowd"] as const;
export type ArcTarget = (typeof ARC_TARGETS)[number];

export interface ArcConsequence {
  n: number; // 1, 2, 3... in the order planned
  subject: Subject;
  target: ArcTarget;
  hits: string; // the ticker, game, project, account or group
  what: string;
  from: number; // 0: follows from the event; otherwise the consequence it follows from
}

/** A major event as the director sees it on one beat: never sent to the browser. */
export interface DigestArc {
  id: number;
  scale: ArcScale;
  kind: ArcKind;
  event: string;
  /** What on the record it grows out of, as text. */
  roots: string[];
  connection: string;
  phase: ArcPhase;
  /** This beat's number within the phase, from 1, and the phase's length. */
  beat: number;
  beats: number;
  happens: string;
  unsaid: string;
  /** The event's storyline, once it has broken. */
  storylineId: number | null;
  /** Consequences not yet played, in order. */
  pending: ArcConsequence[];
  /** The ones this beat plays (fallout only). */
  thisBeat: number[];
  casualties: boolean;
}

export const HUMOUR_STYLES = [
  "deadpan", "sarcasm", "absurd", "wordplay", "roast", "selfdeprecating", "online", "wholesome",
] as const;
export type HumourStyle = (typeof HUMOUR_STYLES)[number];


export const BUDGETS = [0, 250, 500, 1000, 2000, 5000] as const;

/** Model usage since local midnight. */
export interface UsageSummary {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  lastHourTokens: number;
}

export const DEFAULT_SETTINGS: Settings = {
  satire: 2, conflict: 2, shitposting: 2, reality: 2, ...(Object.fromEntries(SUBJECTS.map((s) => [s, 2])) as Record<Subject, Level>),
  noise: 1, profanity: "mild", visibility: 2, personalisation: "light", media: 1,
  usage: 1, budget: 0,
  humourStyles: { deadpan: 1, sarcasm: 1, absurd: 1, wordplay: 1, roast: 1, selfdeprecating: 1, online: 1, wholesome: 1 },
  brokWit: 1,
  majorSelfStart: true,
  majorKinds: { scandal: true, business: true, politics: true, disaster: false, world: false },
  majorCasualties: false,
  rage: false,
  xray: false,
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
  backend: "cli" | "api" | "gemini";
  error: string | null; // last tick error, if any
  hasSnapshot: boolean;
  /** Why nothing new is being written although the world is running: the daily
   *  token limit is spent, or plenty of unread posts are already waiting. */
  hold: "budget" | "unread" | null;
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
  | "show_less"
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

/** A famous account's living note: where it stands now, written when a beat moved it. */
export interface StandView {
  account: AccountLite;
  note: string;
  updatedAt: number;
}

export interface FactView {
  id: number;
  text: string;
  subjects: string[];
  storylineId: number | null;
  createdAt: number;
  /** When a promise, bet or deadline falls due (simulation ms), or null. */
  dueAt: number | null;
}

/** style: a reply's kind of humour or remark. format: what a post is (meme, gif, thread, poll, link, quote, long, short). */
export type PrefKind = "author" | "topic" | "domain" | "tone" | "storyline" | "style" | "format";

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
/** PATCH /api/me: what "Edit profile" saves. */
export interface EditProfileRequest {
  name: string;
  bio: string;
  location: string;
  website: string;
  birth: BirthDate | null;
  /** A picture as a data URL, null to remove it, or left out to keep the current one. */
  avatar?: string | null;
  banner?: string | null;
}
export interface OnboardRequest {
  name: string;
  handle: string;
  /** One or more subjects. The rest still exist in the world, turned down. */
  interests: Subject[];
  /** Keys of the narrower interests picked under those subjects (see interests.ts); may be empty. */
  picks?: string[];
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
  /** A new post only (not a reply or quote): 2 to 4 choices of up to 25
   *  characters, open for `minutes` (5 minutes to 7 days). */
  poll?: { choices: string[]; minutes: number };
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

/** One row of the "Today's News" card: an open storyline under its latest headline. */
export interface NewsItem {
  storylineId: number;
  headline: string;
  /** The page a click opens, when the storyline has one; otherwise the row searches for the headline. */
  article: ArticleCard | null;
  category: string; // "News", "Technology", "Entertainment", "Politics"
  posts: number;
  startedAt: number; // simulation ms when the storyline opened
  avatars: AccountLite[]; // up to three participants
}

/** One game on the scoreboard (the right column's Live card, Explore's Sports tab). */
export interface GameView {
  id: number;
  competition: string; // "NBA", "Premier League", "Formula 1"
  status: "scheduled" | "live" | "final";
  startsAt: number; // simulation ms
  /** "Q3 4:21", "67'", "Lap 34/71", "FT", "Final"; null before the start. */
  clock: string | null;
  /** A race: the Grand Prix. */
  event: string | null;
  /** The two sides in display order (the visitors first in American sports); empty for a race. */
  teams: { name: string; score: number | null }[];
  /** A race: the top three in order, once it has started. */
  podium: string[];
  /** An Explore search that lists the game's posts (its storyline's title), or null before it has any. */
  search: string | null;
}

export interface SidebarResponse {
  trends: Trend[];
  stocks: StockView[];
  whoToFollow: Account[];
  sim: SimStatus;
  unread: number; // unread notifications
  /** Today's headlines, added by the sidebar route. */
  news?: NewsItem[];
  /** Up to three games for the Live card; empty when Sports is off or nothing is on today. */
  games?: GameView[];
}

export interface ExploreResponse {
  trends: Trend[];
  articles: ArticleCard[];
  posts: PostView[]; // search results when ?q= is set, else empty
  /** The Sports tab: all of today's games. */
  games?: GameView[];
  /** The Entertainment tab: the slate's most recent projects ("Coming soon"). */
  projects?: ProjectView[];
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
  /** Where famous accounts stand now, newest first. */
  stands: StandView[];
  taste: TasteProfile;
  usage: UsageTotals;
}

// ------------------------------------------- simulation inputs (lib to lib)

/** What the personalisation module tells the director about the user. */
export interface TasteSide {
  authors: string[];
  topics: string[];
  tones: Tone[];
  domains: Domain[];
  /** Kinds of humour and remark in replies ("sarcasm", "expert"). */
  styles: string[];
  /** Kinds of post ("meme", "gif", "thread", "poll", "link", "long", "short"). */
  formats: string[];
  /** Open storylines, by id. */
  storylines: number[];
}

export interface TasteSummary {
  likes: TasteSide;
  avoids: TasteSide;
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
  hoursSinceStart: number;
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
  /** Dormant storylines about what this beat is likely to be about (sim/recall.ts). */
  earlierStories: { title: string; summary: string; beats: number; daysSinceEnd: number }[];
  /** The Arc's last few editions: the date and the lead and secondary headlines (paper.ts). */
  paper: { date: string; number: number; headlines: string[] }[];
  /** Promises, bets and deadlines from the ledger whose time has come and that no beat has settled. */
  comingDue: { id: number; text: string; subjects: string[]; hoursSinceDue: number; daysAgo: number }[];
  /** Where famous accounts stand now, each with the simulation ms since it was written (sim/stands.ts).
   *  Shown only under the briefs of the accounts briefed in a call. */
  stands: { handle: string; note: string; msAgo: number }[];
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
  /** A premise the reader proposed ("What if..."). When set, this beat opens a
   *  storyline from it. */
  seed: string | null;
  /** The reader is steering one storyline from the story map: with a seed, the
   *  seed is its next development; with wrap, this beat brings it to a close. */
  steer: { storylineId: number; title: string; summary: string; wrap: boolean } | null;
  /** Pacing decision made by the engine: true when this beat should open a new
   *  event from a headline, false when it should stay with the open storylines. */
  newEventDue: boolean;
  /** Outlets that published the last few articles, newest first. */
  recentOutlets: string[];
  /** Outlets that have gone longest without publishing, a few of them in random order. */
  quietOutlets: string[];
  /** Figures and official accounts running well ahead of how often they really post. */
  busyCast: string[];
  /** Figures and official accounts running behind their own habit, a few of them
   *  drawn in proportion to how often they really post. */
  quietCast: string[];
  /** Every so often a beat ignores the reader's taste, so the profile can find something new. */
  wildcard: boolean;
  /** A few ordinary accounts, with their voices, for the beat's stand-out reply. */
  standouts: { handle: string; name: string; voice: string }[];
  /** The storyline the last story beat was on, and how many beats in a row it has had. */
  lastBeat: { storylineId: number; streak: number } | null;
  /** Subjects the reader has on that have no open storyline. */
  emptySubjects: Domain[];
  /** Pairs of open storylines that already share people or companies. */
  links: { a: number; b: number; shared: string[] }[];
  /** Today's games: canon for scores, results and records. Empty when Sports is off. */
  scoreboard: { live: DigestGame[]; finals: DigestGame[]; upcoming: DigestGame[] };
  /** The projects announced or updated most recently: canon like the facts ledger. */
  slate: DigestProject[];
  /** A new project may be announced on this beat (optional for the director). */
  projectDue: boolean;
  /** A Community Note is due on this beat (see correctionDue in sim/digest.ts). */
  correctionDue: boolean;
  /** The major event under way, on an ordinary beat while one is active (sim/major.ts). */
  arc: DigestArc | null;
}

/** A game as the writers see it. */
export interface DigestGame {
  id: number;
  competition: string;
  /** "Nuggets at Pelicans", "Manchester City v Fulham", "Las Vegas Grand Prix". */
  title: string;
  /** "Nuggets 78, Pelicans 74" or "1. Norris, 2. Verstappen, 3. Leclerc"; empty before the start. */
  score: string;
  clock: string | null;
  /** Local start time, "19:00". */
  startsAt: string;
  /** "Nuggets 6-4, Pelicans 4-9"; empty for a race. */
  records: string;
  /** The last few scoring plays or changes of place, oldest first. */
  recent: string[];
  storylineId: number | null;
  /** Live games: minutes since the last beat on the game's storyline, or null if it has had none. */
  minutesSinceBeat: number | null;
  /** Famous players or drivers taking part. */
  inGame: string[];
}

// ------------------------------------------------------------ story map

export type BeatKind = "new_event" | "advance" | "spinoff" | "crossover" | "user_reaction" | "wrap";

/** Where a storyline came from, for the line under its first beat. */
export interface StoryOrigin {
  kind: "headline" | "adapted" | "whatif" | "post" | "you" | "spinoff" | "invented";
  /** The real headline, or the parent storyline's title for a spin-off. */
  text: string | null;
  /** The real headline's publisher. */
  source: string | null;
}

/** Where a story or a single beat came from: a real headline used as it was, a
 *  real headline the news desk rewrote to fit this world, nothing real, or the reader. */
export type Provenance = "real" | "adapted" | "invented" | "yours";

/** A real headline behind a story. */
export interface RealHeadline {
  id: number;
  title: string;
  source: string;
  /** The real article's address. The only kind of link that leaves the app. */
  link: string | null;
  publishedAt: number | null;
  /** The headline as rewritten for this world, when the desk had to change it. */
  adapted: string | null;
}

/** "How this story came about". */
export interface StoryBackground {
  /** What opened it. `headline` is null when the real headline is no longer on file. */
  started:
    | { kind: "headline"; headline: RealHeadline | null }
    | { kind: "whatif"; text: string | null }
    | { kind: "post"; postId: number }
    | { kind: "invented" };
  parent: { id: number; title: string } | null;
  spinoffs: { id: number; title: string }[];
  /** Later real headlines its beats drew on. */
  drewOn: RealHeadline[];
  /** What it established, from the facts ledger. */
  facts: string[];
}

export interface StoryMapStoryline {
  id: number;
  parentId: number | null;
  title: string;
  domain: Domain;
  dormant: boolean;
  origin: StoryOrigin;
  provenance: Provenance;
  background: StoryBackground;
  /** The storyline of a major event that has broken. */
  major?: boolean;
}

/** One node of the story map. */
export interface StoryMapBeat {
  /** Unique across the map: "b12" for a recorded beat, "s3-0" for one rebuilt from older data. */
  id: string;
  storylineId: number;
  kind: BeatKind;
  /** The storyline's opening beat. */
  first: boolean;
  /** Written from a premise the reader proposed ("What if"). */
  seeded: boolean;
  provenance: Provenance;
  summary: string;
  heat: number;
  createdAt: number; // simulation ms
  /** The beat's first post, opened when the row is clicked. */
  postId: number | null;
  /** The page published on this beat, if any. */
  page: ArticleCard | null;
  participants: AccountLite[];
  moves: { ticker: string; pct: number }[];
}

/** GET /api/storymap. Beats are newest first. */
export interface StoryMap {
  now: number;
  storylines: StoryMapStoryline[];
  beats: StoryMapBeat[];
  /** Breaking news: whether a major event is building (nothing more about it before
   *  it breaks), and the scales the reader's settings allow. */
  arc: { building: boolean; scales: ArcScale[] };
}

// ---------------------------------------------------------------- ripple

export type RippleKind =
  | "origin" | "beat" | "page" | "post" | "move" | "trend" | "note" | "poll" | "replies" | "meme" | "tiers" | "spinoff";

/** One item on a storyline's ripple (/world/ripple). */
export interface RippleNode {
  /** Unique within the ripple: "o", "b:b12", "a3", "p45", "m7", "t2", "n45", "q45", "r:b12", "s9". */
  id: string;
  kind: RippleKind;
  /** The node that caused this one; null only for the origin. */
  cause: string | null;
  /** Causal distance: 0 for the origin, 1 for the story's beats, one more than its cause for the rest. */
  ring: number;
  /** Simulation ms; never earlier than the cause's. */
  at: number;
  /** A post's first words, a headline, a beat's event sentence, a trend label, a move's reason. */
  text: string;
  /** Secondary words: the real headline's source, the parent storyline's title, a spin-off's title. */
  label: string | null;
  /** The post's author, the page's publisher. */
  account: AccountLite | null;
  /** What the chip opens: an in-app path, or the real headline's address when `external`. */
  href: string | null;
  external?: boolean;
  /** The origin: how the storyline began. */
  origin?: StoryOrigin["kind"];
  beatKind?: BeatKind;
  page?: ArticleCard;
  ticker?: string;
  pct?: number;
  /** A meme's template picture. */
  thumb?: string;
  /** A few faces: the repliers behind a replies node, the accounts ranked in a tier list. */
  faces?: AccountLite[];
  /** A replies node: when each reply it stands for arrived, in order. */
  arrivals?: number[];
  /** A spin-off: the storyline it opened. */
  storylineId?: number;
}

/** GET /api/ripple?storyline=ID. `storyline` is null when there is no such storyline. */
export interface RippleResponse {
  now: number;
  storyline: { id: number; title: string; dormant: boolean } | null;
  /** In the order they happened, the origin first. Empty before the story's first beat. */
  nodes: RippleNode[];
  /** What the cap on the screen left out. */
  left: { kind: "replies" | "posts" | "memes" | "beats" | "other"; count: number }[];
}
