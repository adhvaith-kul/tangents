// The narrower interests offered at sign-up under each subject the reader
// picked. Picking one follows its accounts instead of the whole subject and
// gives them, and its topics, a head start in ranking. Browser-safe.
import type { Subject } from "./subjects";

export interface Interest {
  /** Unique across all subjects. */
  key: string;
  label: string;
  /** Topic tags, as the story writer tags beats, that get a starting weight. */
  topics: string[];
  /** Famous and official accounts followed when this is picked. */
  handles: string[];
}

export const INTERESTS: Record<Subject, Interest[]> = {
  tech: [
    { key: "ai", label: "AI", topics: ["ai", "openai", "nvidia"], handles: ["sama", "OpenAI", "xai", "nvidia", "jensenhuang", "Google", "Meta", "Microsoft"] },
    { key: "bigtech", label: "Big Tech", topics: ["apple", "meta", "amazon", "google", "microsoft"], handles: ["zuck", "JeffBezos", "Apple", "amazon", "Microsoft", "Google", "Meta"] },
    { key: "space", label: "Space and electric cars", topics: ["spacex", "tesla", "starship"], handles: ["elonmusk", "Tesla", "SpaceX", "blueorigin", "JeffBezos"] },
    { key: "founders", label: "Founders and investors", topics: ["startups", "founders"], handles: ["elonmusk", "sama", "mcuban", "zuck"] },
  ],
  markets: [
    { key: "stocks", label: "Stocks", topics: ["stocks", "markets", "earnings"], handles: ["jimcramer", "BillAckman", "CathieDWood", "chamath", "RobinhoodApp", "Nasdaq"] },
    { key: "crypto", label: "Crypto", topics: ["crypto", "bitcoin", "ethereum"], handles: ["saylor", "VitalikButerin", "brian_armstrong", "cz_binance", "coinbase", "binance"] },
    { key: "macro", label: "The Fed, gold and the economy", topics: ["fed", "rates", "inflation", "gold"], handles: ["federalreserve", "SECGov", "PeterSchiff"] },
  ],
  pop: [
    { key: "music", label: "Music", topics: ["music", "album", "tour"], handles: ["taylorswift13", "Drake", "iamcardib", "rihanna", "Spotify"] },
    { key: "film", label: "Film and TV", topics: ["film", "movies", "tv", "oscars"], handles: ["RealChalamet", "VancityReynolds", "TheRock", "StephenKing", "netflix", "MarvelStudios", "TheAcademy"] },
    { key: "celebrity", label: "Celebrities and fashion", topics: ["fashion", "celebrity"], handles: ["KimKardashian", "KylieJenner", "rihanna", "skims", "fentybeauty", "Nike"] },
    { key: "talk", label: "Talk shows and podcasts", topics: ["podcast", "interview"], handles: ["joerogan", "piersmorgan"] },
  ],
  gaming: [
    { key: "streamers", label: "Streamers", topics: ["streaming", "twitch", "kick"], handles: ["KaiCenat", "ishowspeedsui", "xQc", "Ninja", "Asmongold", "pokimanelol", "Valkyrae", "LudwigAhgren", "Twitch", "kick"] },
    { key: "creators", label: "YouTubers and creators", topics: ["youtube", "creators"], handles: ["MrBeast", "KSI", "LoganPaul", "LudwigAhgren"] },
    { key: "games", label: "Games and the industry", topics: ["games", "gaming", "gta"], handles: ["geoffkeighley", "jasonschreier", "TimSweeneyEpic", "PlayStation", "Xbox", "NintendoAmerica", "RockstarGames", "Fortnite", "thegameawards"] },
  ],
  politics: [
    { key: "whitehouse", label: "The White House and Republicans", topics: ["white house", "trump", "republicans"], handles: ["realDonaldTrump", "JDVance", "WhiteHouse", "GOP"] },
    { key: "democrats", label: "Democrats", topics: ["democrats", "congress"], handles: ["AOC", "GavinNewsom", "GovPressOffice", "TheDemocrats"] },
    { key: "commentary", label: "Commentators", topics: ["media", "debate"], handles: ["benshapiro", "mehdirhasan", "piersmorgan"] },
  ],
  sports: [
    { key: "nba", label: "NBA", topics: ["nba", "basketball"], handles: ["KingJames", "StephenCurry30", "ShamsCharania", "stephenasmith", "ShannonSharpe", "NBA", "Lakers"] },
    { key: "nfl", label: "NFL", topics: ["nfl"], handles: ["PatrickMahomes", "tkelce", "AdamSchefter", "PatMcAfeeShow", "NFL", "Chiefs", "dallascowboys"] },
    { key: "football", label: "Football", topics: ["football", "soccer", "premier league", "transfers"], handles: ["Cristiano", "KMbappe", "ErlingHaaland", "FabrizioRomano", "premierleague", "realmadrid", "ManUtd"] },
    { key: "f1", label: "Formula 1", topics: ["f1", "formula 1", "grand prix"], handles: ["LewisHamilton", "Max33Verstappen", "LandoNorris", "Charles_Leclerc", "wbuxtonofficial", "F1", "ScuderiaFerrari", "redbullracing"] },
  ],
};

export const INTEREST_KEYS: string[] = Object.values(INTERESTS).flatMap((list) => list.map((i) => i.key));

/** How strongly an account belongs to what the reader chose to follow closely.
 *  4 inside a chosen interest; 0.3 inside an interest they passed over, in a
 *  subject where they chose others (Formula 1 for someone who chose the NBA);
 *  1 for everything else: a subject they did not narrow, or an account that
 *  belongs to no interest. Timeline ranking and the draw of who posts everyday
 *  posts both lean on it. */
export function interestPull(handle: string, domain: string, chosen: readonly string[]): number {
  const list = (INTERESTS as Record<string, Interest[] | undefined>)[domain];
  if (!list || !chosen.length) return 1;
  const mine = list.filter((i) => chosen.includes(i.key));
  if (!mine.length) return 1;
  const h = handle.toLowerCase();
  const inside = (i: Interest) => i.handles.some((x) => x.toLowerCase() === h);
  if (mine.some(inside)) return 4;
  return list.some(inside) ? 0.3 : 1;
}

/** The chosen interests by subject, in words, for the writers. Null when none are chosen. */
export function interestsInWords(chosen: readonly string[], subjects: readonly Subject[]): string | null {
  const parts = subjects.flatMap((s) => {
    const mine = INTERESTS[s].filter((i) => chosen.includes(i.key)).map((i) => i.label);
    return mine.length ? [`${s}: ${mine.join(", ")}`] : [];
  });
  return parts.length ? parts.join("; ") : null;
}

