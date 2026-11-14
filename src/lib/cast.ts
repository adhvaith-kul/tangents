// The roster: who exists in the world. Pure data, no imports from the database.
// FROZEN after phase 1. Voices live in src/lib/personas.ts.
import type { AccountKind, Badge, Domain } from "./types";

export interface CastMember {
  handle: string;
  name: string;
  bio: string;
  kind: AccountKind;
  domain: Domain;
  badge: Badge;
  followers: number;
  following: number;
  location: string | null;
  joined: string;
  banner: string;
  /** Real X handle to copy the profile picture from, when it differs or is missing. */
  avatarSource?: string | null;
}

const M = 1_000_000;
const K = 1_000;

export const FIGURES: CastMember[] = [
  // ---- tech and business
  { handle: "elonmusk", name: "Elon Musk", bio: "", kind: "figure", domain: "tech", badge: "blue", followers: 228 * M, following: 1_142, location: null, joined: "June 2009", banner: "#0f1419" },
  { handle: "sama", name: "Sam Altman", bio: "AI is cool i guess", kind: "figure", domain: "tech", badge: "blue", followers: 4.1 * M, following: 986, location: "SF", joined: "July 2006", banner: "#1c2733" },
  { handle: "zuck", name: "Mark Zuckerberg", bio: "Building the future of human connection. Also jiu-jitsu.", kind: "figure", domain: "tech", badge: "blue", followers: 1.3 * M, following: 412, location: "Palo Alto, CA", joined: "February 2009", banner: "#0a2540", avatarSource: "finkd" },
  { handle: "JeffBezos", name: "Jeff Bezos", bio: "Amazon, Blue Origin, Bezos Earth Fund. Gradatim Ferociter.", kind: "figure", domain: "tech", badge: "blue", followers: 6.9 * M, following: 118, location: null, joined: "July 2008", banner: "#14213d" },
  { handle: "jensenhuang", name: "Jensen Huang", bio: "Founder and CEO, NVIDIA. The more you buy, the more you save.", kind: "figure", domain: "tech", badge: "blue", followers: 2.4 * M, following: 64, location: "Santa Clara, CA", joined: "March 2024", banner: "#1a2e05", avatarSource: null },
  { handle: "mcuban", name: "Mark Cuban", bio: "costplusdrugs.com. I reply to everyone. Yes, even you.", kind: "figure", domain: "tech", badge: "blue", followers: 8.9 * M, following: 2_870, location: "Dallas, TX", joined: "November 2008", banner: "#002b5c" },
  { handle: "BillAckman", name: "Bill Ackman", bio: "CEO, Pershing Square. Long-form poster. Longer-form thinker.", kind: "figure", domain: "tech", badge: "blue", followers: 1.8 * M, following: 1_904, location: "New York, NY", joined: "March 2017", banner: "#1b1b1b" },
  // ---- fashion, celebrities and pop culture
  { handle: "taylorswift13", name: "Taylor Swift", bio: "All's fair in love and poetry.", kind: "figure", domain: "pop", badge: "blue", followers: 94 * M, following: 0, location: null, joined: "December 2008", banner: "#3d2c29" },
  { handle: "KimKardashian", name: "Kim Kardashian", bio: "SKIMS. SKKN. Law student, technically.", kind: "figure", domain: "pop", badge: "blue", followers: 74 * M, following: 301, location: "Los Angeles, CA", joined: "March 2009", banner: "#2b2622" },
  { handle: "KylieJenner", name: "Kylie Jenner", bio: "@kyliecosmetics @khy @sprinter", kind: "figure", domain: "pop", badge: "blue", followers: 39 * M, following: 98, location: null, joined: "March 2011", banner: "#3a2230" },
  { handle: "Drake", name: "Drizzy", bio: "more life", kind: "figure", domain: "pop", badge: "blue", followers: 39 * M, following: 2_011, location: "Toronto", joined: "March 2009", banner: "#1a1a1a" },
  { handle: "iamcardib", name: "Cardi B", bio: "I say what I want. Ask your favorite.", kind: "figure", domain: "pop", badge: "blue", followers: 37 * M, following: 1_388, location: "The Bronx", joined: "November 2012", banner: "#40101c" },
  { handle: "rihanna", name: "Rihanna", bio: "@fentybeauty @savagexfenty @fentyskin", kind: "figure", domain: "pop", badge: "blue", followers: 107 * M, following: 1_021, location: "Barbados", joined: "October 2009", banner: "#33240f" },
  { handle: "RealChalamet", name: "Timothée Chalamet", bio: "in pursuit of greatness", kind: "figure", domain: "pop", badge: "blue", followers: 2.6 * M, following: 210, location: "New York", joined: "April 2013", banner: "#20262e" },
  // ---- politics
  { handle: "realDonaldTrump", name: "Donald J. Trump", bio: "45th & 47th President of the United States of America", kind: "figure", domain: "politics", badge: "blue", followers: 110 * M, following: 53, location: "Washington, DC", joined: "March 2009", banner: "#3b0a0a" },
  { handle: "JDVance", name: "JD Vance", bio: "Christian, husband, dad. Ohio.", kind: "figure", domain: "politics", badge: "blue", followers: 4.6 * M, following: 1_302, location: "Ohio", joined: "April 2014", banner: "#0b1f3a" },
  { handle: "AOC", name: "Alexandria Ocasio-Cortez", bio: "US Representative, NY-14 (the Bronx and Queens). In a modern, moral, and wealthy society, no American should be too poor to live.", kind: "figure", domain: "politics", badge: "blue", followers: 12.8 * M, following: 3_480, location: "Bronx + Queens, NYC", joined: "April 2010", banner: "#2a1a4a" },
  { handle: "GavinNewsom", name: "Gavin Newsom", bio: "Husband and father. Governor of California.", kind: "figure", domain: "politics", badge: "blue", followers: 2.9 * M, following: 1_750, location: "California", joined: "August 2007", banner: "#0a3d62" },
];

export const OUTLETS: CastMember[] = [
  { handle: "TechCrunch", name: "TechCrunch", bio: "Technology news and analysis with a focus on founders and startup teams.", kind: "outlet", domain: "tech", badge: "gold", followers: 10.1 * M, following: 912, location: "San Francisco, CA", joined: "March 2007", banner: "#0a8f08" },
  { handle: "business", name: "Bloomberg", bio: "The first word in business news.", kind: "outlet", domain: "tech", badge: "gold", followers: 9.8 * M, following: 1_310, location: "New York and the World", joined: "April 2009", banner: "#000000" },
  { handle: "CNBC", name: "CNBC", bio: "First in business worldwide.", kind: "outlet", domain: "tech", badge: "gold", followers: 5.3 * M, following: 840, location: "Englewood Cliffs, NJ", joined: "November 2008", banner: "#005594" },
  { handle: "politico", name: "POLITICO", bio: "Nobody knows politics and policy like POLITICO.", kind: "outlet", domain: "politics", badge: "gold", followers: 4.7 * M, following: 1_420, location: "Washington, DC", joined: "October 2007", banner: "#8b0000" },
  { handle: "TMZ", name: "TMZ", bio: "Breaking the biggest stories in celebrity and entertainment news.", kind: "outlet", domain: "pop", badge: "gold", followers: 6.5 * M, following: 611, location: "Los Angeles, CA", joined: "March 2007", banner: "#b00000" },
  { handle: "PopCrave", name: "Pop Crave", bio: "Your source for pop culture news, updates and charts.", kind: "outlet", domain: "pop", badge: "gold", followers: 2.1 * M, following: 1_908, location: null, joined: "November 2015", banner: "#c2185b" },
  { handle: "voguemagazine", name: "Vogue Magazine", bio: "The official account of Vogue. Fashion, beauty, culture, living.", kind: "outlet", domain: "pop", badge: "gold", followers: 15.2 * M, following: 1_105, location: "New York, NY", joined: "February 2009", banner: "#111111" },
];

/** Ordinary people. All fictional. */
export const CROWD: CastMember[] = [
  { handle: "cardigan_betty13", name: "betty ⸆⸉ (taylor's version)", bio: "she/her. 22. i have a theory and it's 40 slides long. fan account", kind: "crowd", domain: "pop", badge: null, followers: 14.2 * K, following: 1_313, location: "cornelia street (spiritually)", joined: "August 2020", banner: "#b08d57" },
  { handle: "keishabardigang", name: "BARDI GANG KEISHA", bio: "if you come for Belcalis you come for ME. stream or step.", kind: "crowd", domain: "pop", badge: null, followers: 9_840, following: 2_204, location: "Bronx NY", joined: "May 2018", banner: "#8b1e3f" },
  { handle: "DaleTSLAlong", name: "Dale | $TSLA to $2,000", bio: "Retired HVAC. 4,112 shares. Not selling. FSD is solved. Grandpa of 5.", kind: "crowd", domain: "tech", badge: "blue", followers: 31.5 * K, following: 688, location: "Scottsdale, AZ", joined: "January 2019", banner: "#7a0c0c" },
  { handle: "vex_eacc", name: "vex ⏩", bio: "e/acc. accelerate or perish. building something (stealth). the future is already late", kind: "crowd", domain: "tech", badge: "blue", followers: 22.7 * K, following: 3_021, location: "hayes valley", joined: "October 2021", banner: "#101820" },
  { handle: "miriam_pdoom", name: "Miriam Okafor", bio: "AI safety researcher. p(doom) updated daily, never downward. Views my own and correct.", kind: "crowd", domain: "tech", badge: null, followers: 18.1 * K, following: 902, location: "Berkeley, CA", joined: "February 2016", banner: "#2d2d44" },
  { handle: "HollowPointCap", name: "Hollow Point Research", bio: "Short-biased research. We told you so (pending). Not investment advice.", kind: "crowd", domain: "tech", badge: "blue", followers: 46.3 * K, following: 211, location: "Greenwich, CT", joined: "September 2017", banner: "#1f1f1f" },
  { handle: "chad_dot_eth", name: "CHAD.eth 🚀", bio: "gm. down 84% up only. $DOGE $BTC. wen. nfa dyor wagmi", kind: "crowd", domain: "tech", badge: "blue", followers: 12.9 * K, following: 5_644, location: "Miami / Dubai", joined: "March 2021", banner: "#2b1055" },
  { handle: "prestonhale_vc", name: "Preston Hale", bio: "GP @ Lattice Ventures. Investing in the inevitable. Threads on what founders get wrong. 🧵", kind: "crowd", domain: "tech", badge: "blue", followers: 64.0 * K, following: 1_871, location: "Palo Alto", joined: "June 2012", banner: "#0d3b66" },
  { handle: "priya_oncall", name: "priya (on call)", bio: "staff eng. paged 4 times last night. your AI strategy is a cron job. opinions are load-bearing", kind: "crowd", domain: "tech", badge: null, followers: 27.4 * K, following: 743, location: "Seattle", joined: "April 2014", banner: "#264653" },
  { handle: "GaryMulvaney4", name: "Gary Mulvaney", bio: "Husband. Bills fan. Just asking. Notifications ON for everyone.", kind: "crowd", domain: "crossover", badge: "blue", followers: 312, following: 4_998, location: "Buffalo, NY", joined: "December 2022", banner: "#00338d" },
  { handle: "thetearoomtips", name: "The Tea Room", bio: "Blind items, sightings, receipts. Submissions open. Allegedly.", kind: "crowd", domain: "pop", badge: null, followers: 88.6 * K, following: 404, location: "a booth at the back", joined: "July 2019", banner: "#5d3a66" },
  { handle: "odile_wears", name: "Odile Marchetti", bio: "Fashion critic. Formerly of several mastheads. I will be honest about the hem.", kind: "crowd", domain: "pop", badge: null, followers: 41.2 * K, following: 1_126, location: "Paris / Brooklyn", joined: "September 2011", banner: "#3c3c3c" },
  { handle: "LindaK_Ohio", name: "Linda Kowalski", bio: "Mom of 3, Grandma of 2. Love my family, my garden and my church. How do I turn off the blue thing", kind: "crowd", domain: "crossover", badge: null, followers: 147, following: 389, location: "Dayton, Ohio", joined: "January 2023", banner: "#6b8e23" },
  { handle: "connects_dots", name: "Just Asking Questions", bio: "Nothing is a coincidence. Do your own research. Follow the timing.", kind: "crowd", domain: "crossover", badge: "blue", followers: 19.3 * K, following: 2_717, location: "undisclosed", joined: "November 2020", banner: "#3b3b1a" },
  { handle: "nocontexttl", name: "no context timeline", bio: "posting the timeline without context so you don't have to", kind: "crowd", domain: "crossover", badge: null, followers: 402 * K, following: 12, location: null, joined: "May 2020", banner: "#222222" },
  { handle: "danielreyesnews", name: "Daniel Reyes", bio: "Reporter covering tech, power and money. DMs open. Signal on request.", kind: "crowd", domain: "crossover", badge: "blue", followers: 73.8 * K, following: 3_340, location: "Washington, DC", joined: "August 2010", banner: "#143642" },
  { handle: "RandyEagle1776", name: "Patriot Randy 🦅", bio: "God. Family. Country. Diesel. Banned 3 times. Still here.", kind: "crowd", domain: "politics", badge: "blue", followers: 26.6 * K, following: 6_102, location: "Texas, USA", joined: "February 2021", banner: "#7b1113" },
  { handle: "RachelResists", name: "Resist Rachel 🌊", bio: "Proud progressive. Dog mom. Blocked by 2 senators. Vote like it's 2018.", kind: "crowd", domain: "politics", badge: "blue", followers: 33.1 * K, following: 5_870, location: "Portland, OR", joined: "November 2016", banner: "#1d3557" },
];

export const CAST: CastMember[] = [...FIGURES, ...OUTLETS, ...CROWD];

export interface StockSeed {
  ticker: string;
  name: string;
  kind: "stock" | "crypto";
  price: number; // fallback opening price if no live quote is available
}

export const STOCKS: StockSeed[] = [
  { ticker: "TSLA", name: "Tesla", kind: "stock", price: 345.2 },
  { ticker: "NVDA", name: "NVIDIA", kind: "stock", price: 142.6 },
  { ticker: "META", name: "Meta Platforms", kind: "stock", price: 612.4 },
  { ticker: "AMZN", name: "Amazon", kind: "stock", price: 218.9 },
  { ticker: "AAPL", name: "Apple", kind: "stock", price: 232.1 },
  { ticker: "MSFT", name: "Microsoft", kind: "stock", price: 438.7 },
  { ticker: "SPOT", name: "Spotify", kind: "stock", price: 520.3 },
  { ticker: "NKE", name: "Nike", kind: "stock", price: 76.4 },
  { ticker: "BTC", name: "Bitcoin", kind: "crypto", price: 96_400 },
  { ticker: "DOGE", name: "Dogecoin", kind: "crypto", price: 0.312 },
];

/** Avatar path for an account. Figures and outlets have a downloaded picture at
 *  /avatars/<handle>.jpg; the Avatar component falls back to initials. */
export function avatarPath(handle: string, kind: AccountKind): string | null {
  return kind === "figure" || kind === "outlet" ? `/avatars/${handle}.jpg` : null;
}
