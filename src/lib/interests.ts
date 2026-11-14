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
    { key: "stocks", label: "Stocks", topics: ["stocks", "markets", "earnings"], handles: ["jimcramer", "BillAckman"] },
    { key: "crypto", label: "Crypto", topics: ["crypto", "bitcoin"], handles: [] },
  ],
  pop: [
    { key: "music", label: "Music", topics: ["music", "album", "tour"], handles: ["taylorswift13", "Drake", "iamcardib", "rihanna", "Spotify"] },
    { key: "film", label: "Film and TV", topics: ["film", "movies", "tv", "oscars"], handles: ["RealChalamet", "VancityReynolds", "TheRock", "StephenKing", "netflix", "MarvelStudios", "TheAcademy"] },
    { key: "celebrity", label: "Celebrities and fashion", topics: ["fashion", "celebrity"], handles: ["KimKardashian", "KylieJenner", "rihanna", "skims", "fentybeauty", "Nike"] },
    { key: "talk", label: "Talk shows and podcasts", topics: ["podcast", "interview"], handles: ["joerogan", "piersmorgan"] },
  ],
  gaming: [
    { key: "streamers", label: "Streamers", topics: ["streaming", "twitch", "kick"], handles: ["KaiCenat", "ishowspeedsui", "xQc", "Ninja", "Asmongold", "pokimanelol", "Valkyrae", "LudwigAhgren"] },
    { key: "creators", label: "YouTubers and creators", topics: ["youtube", "creators"], handles: ["MrBeast", "KSI", "LoganPaul", "LudwigAhgren"] },
    { key: "games", label: "Games and the industry", topics: ["games", "gaming", "gta"], handles: ["geoffkeighley", "jasonschreier", "TimSweeneyEpic"] },
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
    { key: "f1", label: "Formula 1", topics: ["f1", "formula 1"], handles: [] },
  ],
};

/** Every interest by key. */
export const INTEREST_BY_KEY = new Map(Object.values(INTERESTS).flat().map((i) => [i.key, i]));
