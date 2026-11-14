// What the Settings screen is made of: the categories, every individual
// setting with the words people might search for it by, the presets, and the
// one-line summaries shown on the landing page. No setting's key, meaning or
// stored value is defined here; this only arranges them.
import {
  DEFAULT_SETTINGS, HUMOUR_STYLES,
  type HumourStyle, type Pace, type Settings, type UsageSummary,
} from "@/lib/types";

export type CategoryId = "timeline" | "tone" | "replies" | "personalisation" | "brok" | "usage";

export const DEFAULT_PACE: Pace = "steady";

export const CATEGORIES: { id: CategoryId; title: string; blurb: string }[] = [
  { id: "timeline", title: "Your timeline", blurb: "What the world is about, how closely it follows real news, and how fast it moves." },
  { id: "tone", title: "Tone and humour", blurb: "How heightened, how combative and how funny the writing is." },
  { id: "replies", title: "Replies and media", blurb: "Who turns up under a post, and how many GIFs and memes they bring." },
  { id: "personalisation", title: "Personalisation", blurb: "How much the timeline follows what you engage with." },
  { id: "brok", title: "Brok", blurb: "The built-in assistant." },
  { id: "usage", title: "Usage", blurb: "How much the world writes, and what it has cost today." },
];

export const isCategory = (s: string): s is CategoryId => CATEGORIES.some((c) => c.id === s);

export const HUMOUR: Record<HumourStyle, { label: string; example: string }> = {
  deadpan: { label: "Dry and deadpan", example: "Said flatly, as if nothing were odd." },
  sarcasm: { label: "Sarcasm", example: "Praise that means the opposite." },
  absurd: { label: "Absurd", example: "Taking the premise somewhere it was never meant to go." },
  wordplay: { label: "Wordplay and puns", example: "The joke is in the phrasing." },
  roast: { label: "Roasts and dunks", example: "Aimed at someone, and it lands." },
  selfdeprecating: { label: "Self-deprecating", example: "The joke is on the person telling it." },
  online: { label: "Extremely online", example: "Meme-speak, in-jokes and reply-guy shorthand." },
  wholesome: { label: "Wholesome", example: "Funny without a victim." },
};

export const PACE_HINT: Record<Pace, string> = {
  live: "A story beat every 40 seconds. For demos.",
  steady: "A story beat about every two minutes, everyday posts in between.",
  slow: "A story beat about every six minutes.",
};

export const USAGE_HINT: Record<Settings["usage"], string> = {
  0: "Fewer replies under each story and shorter articles. The world waits sooner when you stop reading.",
  1: "The standard amount of writing per story.",
  2: "More replies under each story, and the world keeps writing further ahead of you.",
};

/** Other words for each kind of humour, so a search finds the one meant and not all eight. */
const STYLE_WORDS: Record<HumourStyle, string> = {
  deadpan: "deadpan dry understatement",
  sarcasm: "sarcasm sarcastic irony ironic",
  absurd: "absurd surreal silly",
  wordplay: "wordplay pun puns",
  roast: "roast roasts dunk dunks insults burns",
  selfdeprecating: "self deprecating selfdeprecating",
  online: "online meme-speak in-jokes terminally reply guy",
  wholesome: "wholesome kind warm",
};

/** Every control on the screen. `id` is its anchor on the category page. */
export interface Entry {
  id: string;
  category: CategoryId;
  label: string;
  description: string;
  /** Other words someone might type to find it. */
  words: string;
}

export const ENTRIES: Entry[] = [
  { id: "tech", category: "timeline", label: "Technology and business", description: "Founders, companies, markets and AI.", words: "subject topic tech startups stocks finance crypto" },
  { id: "pop", category: "timeline", label: "Pop culture", description: "Celebrities and fashion, film and TV, music, gaming and internet culture.", words: "subject topic celebrity entertainment movies music games fashion" },
  { id: "politics", category: "timeline", label: "Politics", description: "The White House, Congress, campaigns and the people who argue about them.", words: "subject topic government election president" },
  { id: "sports", category: "timeline", label: "Sports", description: "Basketball, American football and soccer: the players, pundits and insiders.", words: "subject topic nba nfl football basketball soccer" },
  { id: "reality", category: "timeline", label: "Follow the real news", description: "How much new real-world headlines steer the timeline once it has its own history.", words: "news headlines reality real world events drift" },
  { id: "pace", category: "timeline", label: "Pace", description: "How often a new story beat arrives.", words: "speed fast slow live steady tempo frequency" },

  { id: "satire", category: "tone", label: "Satire", description: "How far events are heightened beyond what really happened.", words: "exaggeration heightened realistic absurdity tone" },
  { id: "conflict", category: "tone", label: "Conflict", description: "How readily accounts feud and argue in public.", words: "feuds fights arguments drama calm combative tone" },
  { id: "shitposting", category: "tone", label: "How much humour", description: "Jokes, memes and trolling in the replies.", words: "funny jokes humor humour shitposting comedy wit witty" },
  { id: "humour-kinds", category: "tone", label: "Kinds of humour", description: "Which kinds of joke you want more of, and which never.", words: "funny jokes humor humour styles types comedy wit witty" },
  ...HUMOUR_STYLES.map((s) => ({
    id: `humour-${s}`, category: "tone" as const, label: HUMOUR[s].label, description: HUMOUR[s].example,
    words: STYLE_WORDS[s],
  })),
  { id: "profanity", category: "tone", label: "Profanity", description: "How much swearing appears, from none to the way each account really talks.", words: "swearing cursing language explicit clean" },

  { id: "noise", category: "replies", label: "Trolls and bots", description: "Contrarians, engagement bait and spam accounts in the replies.", words: "spam bots trolls noise engagement bait reply guys" },
  { id: "media", category: "replies", label: "GIFs and memes", description: "The ceiling on GIFs, memes and tier lists in replies. Under it they follow the moment and what you like.", words: "gif gifs meme memes images pictures tier list media reaction" },

  { id: "personalisation", category: "personalisation", label: "Personalisation", description: "How strongly the timeline and the stories follow what you engage with.", words: "algorithm for you taste recommendations personalization learning" },
  { id: "visibility", category: "personalisation", label: "How often famous accounts engage with you", description: "Whether well-known accounts ever reply to or quote your posts.", words: "visibility famous celebrities reply me attention notice" },
  { id: "learned", category: "personalisation", label: "What the timeline has learned", description: "The accounts, topics and styles it thinks you like, on Behind the scenes.", words: "taste profile weights why behind the scenes learned" },
  { id: "reset-taste", category: "personalisation", label: "Reset what the timeline has learned", description: "Clears the learned taste profile and starts again.", words: "clear forget reset taste history algorithm" },

  { id: "brokWit", category: "brok", label: "Brok’s tone", description: "How the built-in assistant talks when you ask it something.", words: "brok assistant ai grok tone straight witty merciless roast" },

  { id: "usage", category: "usage", label: "How much the world writes", description: "Saver, Balanced or Full: the amount of writing per story.", words: "cost tokens saver balanced full spend cheaper budget amount" },
  { id: "budget", category: "usage", label: "Daily limit", description: "In tokens. Once today’s total passes it, the world stops moving on its own until tomorrow. Replies to your own posts still arrive.", words: "cost tokens limit cap budget spend daily maximum" },
  { id: "today", category: "usage", label: "Today’s usage", description: "Tokens and model calls so far today.", words: "cost tokens usage today spent calls meter" },
];

/** Entries matching a search, best first: label hits before description and synonym hits. */
export function searchEntries(query: string): Entry[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const scored: { e: Entry; score: number }[] = [];
  for (const e of ENTRIES) {
    const label = e.label.toLowerCase();
    const rest = `${e.description} ${e.words} ${CATEGORIES.find((c) => c.id === e.category)?.title ?? ""}`.toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (label.includes(t)) score += 3;
      else if (rest.includes(t)) score += 1;
      else {
        score = 0;
        break;
      }
    }
    if (score > 0) scored.push({ e, score });
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.e);
}

// ------------------------------------------------------------------ presets

export const PRESET_KEYS = ["satire", "conflict", "shitposting", "reality", "noise", "profanity", "media"] as const;
type PresetValues = Pick<Settings, (typeof PRESET_KEYS)[number]>;

export const PRESETS: { name: string; hint: string; values: PresetValues }[] = [
  {
    name: "Newsroom", hint: "Close to the real news, calm and sincere.",
    values: { satire: 0, conflict: 1, shitposting: 0, reality: 4, noise: 0, profanity: "off", media: 0 },
  },
  {
    name: "Balanced", hint: "The default mix.",
    values: Object.fromEntries(PRESET_KEYS.map((k) => [k, DEFAULT_SETTINGS[k]])) as PresetValues,
  },
  {
    name: "Chaos", hint: "Heightened, combative and full of jokes.",
    values: { satire: 4, conflict: 4, shitposting: 4, reality: 1, noise: 4, profanity: "full", media: 2 },
  },
];

export function activePreset(s: Settings): string | undefined {
  return PRESETS.find((p) => PRESET_KEYS.every((k) => s[k] === p.values[k]))?.name;
}

// ------------------------------------------------------------------ defaults

/** The settings each category owns (pace is not a stored setting and is handled beside these). */
export const CATEGORY_KEYS: Record<CategoryId, (keyof Settings)[]> = {
  timeline: ["tech", "pop", "politics", "sports", "reality"],
  tone: ["satire", "conflict", "shitposting", "humourStyles", "profanity"],
  replies: ["noise", "media"],
  personalisation: ["personalisation", "visibility"],
  brok: ["brokWit"],
  usage: ["usage", "budget"],
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Whether anything in the category differs from the defaults. */
export function isChanged(id: CategoryId, s: Settings, pace: Pace | undefined): boolean {
  if (id === "timeline" && pace != null && pace !== DEFAULT_PACE) return true;
  return CATEGORY_KEYS[id].some((k) => !same(s[k], DEFAULT_SETTINGS[k]));
}

/** The patch that puts one category back to its defaults. */
export function defaultsFor(id: CategoryId): Partial<Settings> {
  const patch: Record<string, unknown> = {};
  for (const k of CATEGORY_KEYS[id]) {
    const v = DEFAULT_SETTINGS[k];
    patch[k] = typeof v === "object" ? { ...v } : v;
  }
  return patch as Partial<Settings>;
}

// ------------------------------------------------------------------ summaries

/** 1,234,567 -> "1.2M"; 45,300 -> "45K". */
export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

/** "a", "a and b", "a, b and c". */
function list(xs: string[]): string {
  if (xs.length <= 1) return xs.join("");
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const SUBJECTS: { key: "tech" | "pop" | "politics" | "sports"; name: string }[] = [
  { key: "tech", name: "technology" },
  { key: "pop", name: "pop culture" },
  { key: "politics", name: "politics" },
  { key: "sports", name: "sports" },
];

/** The landing page's one line for a category, written the way a person would say it. */
export function summarise(
  id: CategoryId,
  s: Settings,
  pace: Pace | undefined,
  usage: UsageSummary | undefined,
): string {
  const parts: string[] = [];
  switch (id) {
    case "timeline": {
      const on = SUBJECTS.filter((x) => s[x.key] > 0);
      const off = SUBJECTS.filter((x) => s[x.key] === 0);
      parts.push(on.length ? list(on.map((x) => (s[x.key] >= 3 ? `more ${x.name}` : x.name))) : "no subjects on");
      if (off.length && on.length) parts.push(`${list(off.map((x) => x.name))} off`);
      if (s.reality !== DEFAULT_SETTINGS.reality) parts.push(s.reality > DEFAULT_SETTINGS.reality ? "close to the real news" : "drifting from the real news");
      if (pace) parts.push(`${pace} pace`);
      break;
    }
    case "tone": {
      parts.push(["straight news", "light satire", "balanced satire", "heightened satire", "wild satire"][s.satire]);
      if (s.conflict !== DEFAULT_SETTINGS.conflict) parts.push(["calm", "mostly calm", "", "argumentative", "combative"][s.conflict]);
      const fav = HUMOUR_STYLES.filter((k) => s.humourStyles[k] === 2).map((k) => HUMOUR[k].label.toLowerCase());
      const never = HUMOUR_STYLES.filter((k) => s.humourStyles[k] === 0).map((k) => HUMOUR[k].label.toLowerCase());
      let humour = ["hardly any humour", "a little humour", "some humour", "lots of humour", "constant humour"][s.shitposting];
      if (fav.length) humour += `, more ${list(fav.slice(0, 2))}${fav.length > 2 ? " and others" : ""}`;
      if (never.length) humour += `, no ${list(never.slice(0, 2))}${never.length > 2 ? " or others" : ""}`;
      parts.push(humour);
      parts.push({ off: "no profanity", mild: "mild profanity", full: "profanity in character" }[s.profanity]);
      break;
    }
    case "replies":
      parts.push(["no trolls or bots", "few trolls and bots", "some trolls and bots", "plenty of trolls and bots", "trolls and bots everywhere"][s.noise]);
      parts.push(["no GIFs or memes", "some GIFs and memes", "lots of GIFs and memes"][s.media]);
      break;
    case "personalisation":
      parts.push({ off: "personalisation off", light: "light personalisation", strong: "strong personalisation" }[s.personalisation]);
      parts.push(`famous accounts ${["never", "rarely", "sometimes", "often", "very often"][s.visibility]} engage with you`);
      break;
    case "brok":
      parts.push(["straight answers", "witty", "merciless"][s.brokWit]);
      break;
    case "usage":
      parts.push(["saver", "balanced", "full"][s.usage]);
      parts.push(s.budget === 0 ? "no daily limit" : `${compact(s.budget * 1000)} daily limit`);
      if (usage) parts.push(`${compact(usage.inputTokens + usage.outputTokens)} tokens today`);
      break;
  }
  return cap(parts.filter(Boolean).join(" · "));
}
