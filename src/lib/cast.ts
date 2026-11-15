// The roster: who exists in the world. Pure data, no imports from the database.
// FROZEN after phase 1. Voices live in src/lib/personas.ts.
import { EXTRA_CROWD } from "./crowd";
import { CROWD_AVATARS } from "./crowd-avatars";
import { CROWD_HEADERS } from "./crowd-headers";
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
  /** A picture that ships with the app (the invented outlets' logos), instead of a downloaded one. */
  avatar?: string;
}

const M = 1_000_000;
const K = 1_000;

export const FIGURES: CastMember[] = [
  // ---- tech and business
  { handle: "elonmusk", name: "Elon Musk", bio: "", kind: "figure", domain: "tech", badge: "blue", followers: 228 * M, following: 1_142, location: null, joined: "June 2009", banner: "#0f1419" },
  { handle: "sama", name: "Sam Altman", bio: "AI is cool i guess", kind: "figure", domain: "tech", badge: "blue", followers: 4.1 * M, following: 986, location: "SF", joined: "July 2006", banner: "#1c2733" },
  { handle: "zuck", name: "Mark Zuckerberg", bio: "Building the future of human connection. Also jiu-jitsu.", kind: "figure", domain: "tech", badge: "blue", followers: 1.3 * M, following: 412, location: "Palo Alto, CA", joined: "February 2009", banner: "#0a2540", avatarSource: "finkd" },
  { handle: "JeffBezos", name: "Jeff Bezos", bio: "Amazon, Blue Origin, Bezos Earth Fund. Gradatim Ferociter.", kind: "figure", domain: "tech", badge: "blue", followers: 6.9 * M, following: 118, location: null, joined: "July 2008", banner: "#14213d" },
  { handle: "jensenhuang", name: "Jensen Huang", bio: "Co-founder of NVIDIA.", kind: "figure", domain: "tech", badge: "blue", followers: 2.4 * M, following: 64, location: "Santa Clara, CA", joined: "March 2024", banner: "#1a2e05", avatarSource: null },
  { handle: "mcuban", name: "Mark Cuban", bio: "costplusdrugs.com. I reply to everyone. Yes, even you.", kind: "figure", domain: "tech", badge: "blue", followers: 8.9 * M, following: 2_870, location: "Dallas, TX", joined: "November 2008", banner: "#002b5c" },
  { handle: "BillAckman", name: "Bill Ackman", bio: "CEO, Pershing Square. Long-form poster. Longer-form thinker.", kind: "figure", domain: "markets", badge: "blue", followers: 1.8 * M, following: 1_904, location: "New York, NY", joined: "March 2017", banner: "#1b1b1b" },
  // ---- fashion, celebrities and pop culture
  { handle: "taylorswift13", name: "Taylor Swift", bio: "All's fair in love and poetry.", kind: "figure", domain: "pop", badge: "blue", followers: 94 * M, following: 0, location: null, joined: "December 2008", banner: "#3d2c29" },
  { handle: "KimKardashian", name: "Kim Kardashian", bio: "SKIMS.", kind: "figure", domain: "pop", badge: "blue", followers: 74 * M, following: 301, location: "Los Angeles, CA", joined: "March 2009", banner: "#2b2622" },
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
  // ---- sport
  { handle: "KingJames", name: "LeBron James", bio: "EST. AKRON. Kid from Akron. #StriveForGreatness", kind: "figure", domain: "sports", badge: "blue", followers: 52.9 * M, following: 190, location: "Akron, Ohio", joined: "March 2009", banner: "#333639" },
  { handle: "StephenCurry30", name: "Stephen Curry", bio: "Believer. Husband. Golden State Warriors guard. Davidson Wildcat.", kind: "figure", domain: "sports", badge: "blue", followers: 17.6 * M, following: 880, location: "Bay Area", joined: "May 2009", banner: "#333639" },
  { handle: "PatrickMahomes", name: "Patrick Mahomes II", bio: "QB for the Kansas City Chiefs.", kind: "figure", domain: "sports", badge: "blue", followers: 2.7 * M, following: 1_340, location: "Kansas City, MO", joined: "June 2010", banner: "#333639" },
  { handle: "tkelce", name: "Travis Kelce", bio: "New Heights with my brother. Cleveland Heights raised.", kind: "figure", domain: "sports", badge: "blue", followers: 1.3 * M, following: 1_120, location: "Kansas City, MO", joined: "November 2010", banner: "#333639" },
  { handle: "Cristiano", name: "Cristiano Ronaldo", bio: "Welcome to the official account of Cristiano Ronaldo.", kind: "figure", domain: "sports", badge: "blue", followers: 115 * M, following: 75, location: null, joined: "June 2010", banner: "#333639" },
  { handle: "KMbappe", name: "Kylian Mbappé", bio: "Real Madrid. Équipe de France.", kind: "figure", domain: "sports", badge: "blue", followers: 15.2 * M, following: 310, location: "Madrid", joined: "August 2015", banner: "#333639" },
  { handle: "ErlingHaaland", name: "Erling Haaland", bio: "Manchester City. Norway.", kind: "figure", domain: "sports", badge: "blue", followers: 4.1 * M, following: 95, location: "Manchester, England", joined: "October 2019", banner: "#333639", avatarSource: null },
  { handle: "stephenasmith", name: "Stephen A Smith", bio: "First Take on ESPN. The Stephen A. Smith Show.", kind: "figure", domain: "sports", badge: "blue", followers: 6.5 * M, following: 410, location: "New York", joined: "November 2009", banner: "#333639" },
  { handle: "PatMcAfeeShow", name: "Pat McAfee", bio: "The Pat McAfee Show. Live every weekday. For the brand.", kind: "figure", domain: "sports", badge: "blue", followers: 3.4 * M, following: 2_950, location: "Indianapolis, IN", joined: "April 2009", banner: "#333639" },
  { handle: "ShannonSharpe", name: "Shannon Sharpe", bio: "Pro Football Hall of Famer. Club Shay Shay. Nightcap.", kind: "figure", domain: "sports", badge: "blue", followers: 2.5 * M, following: 640, location: "Atlanta, GA", joined: "August 2011", banner: "#333639" },
  { handle: "ShamsCharania", name: "Shams Charania", bio: "Senior NBA Insider, ESPN.", kind: "figure", domain: "sports", badge: "blue", followers: 3.1 * M, following: 1_480, location: "Chicago, IL", joined: "November 2010", banner: "#333639" },
  { handle: "AdamSchefter", name: "Adam Schefter", bio: "ESPN Senior NFL Insider.", kind: "figure", domain: "sports", badge: "blue", followers: 11.2 * M, following: 3_900, location: "New York", joined: "March 2009", banner: "#333639" },
  { handle: "FabrizioRomano", name: "Fabrizio Romano", bio: "Here we go! Transfers, 24/7.", kind: "figure", domain: "sports", badge: "blue", followers: 26.3 * M, following: 2_300, location: "Milan, Italy", joined: "March 2011", banner: "#333639" },
  // ---- film, television, books and the internet
  { handle: "MrBeast", name: "MrBeast", bio: "New video every Saturday. Feastables. Beast Philanthropy.", kind: "figure", domain: "gaming", badge: "blue", followers: 33 * M, following: 2_050, location: "Greenville, NC", joined: "June 2012", banner: "#333639" },
  { handle: "VancityReynolds", name: "Ryan Reynolds", bio: "Actor. Part-owner of a football club in Wales. Introducing people to things.", kind: "figure", domain: "pop", badge: "blue", followers: 21.3 * M, following: 560, location: "Vancouver, BC", joined: "November 2010", banner: "#333639" },
  { handle: "StephenKing", name: "Stephen King", bio: "Author.", kind: "figure", domain: "pop", badge: "blue", followers: 7 * M, following: 118, location: "Maine", joined: "December 2013", banner: "#333639" },
  { handle: "TheRock", name: "Dwayne Johnson", bio: "Founder. Tequila maker. Hardest worker in the room.", kind: "figure", domain: "pop", badge: "blue", followers: 17.2 * M, following: 610, location: null, joined: "February 2011", banner: "#333639" },
  // ---- commentators
  { handle: "piersmorgan", name: "Piers Morgan", bio: "Host of Piers Morgan Uncensored.", kind: "figure", domain: "pop", badge: "blue", followers: 8.7 * M, following: 1_690, location: "London", joined: "December 2010", banner: "#141414" },
  { handle: "joerogan", name: "Joe Rogan", bio: "Stand up comic, podcast host, UFC commentator.", kind: "figure", domain: "pop", badge: "blue", followers: 15.4 * M, following: 1_050, location: "Austin, TX", joined: "February 2009", banner: "#1a1a1a" },
  { handle: "jimcramer", name: "Jim Cramer", bio: "Host of Mad Money on CNBC. Co-anchor of Squawk on the Street.", kind: "figure", domain: "markets", badge: "blue", followers: 2.1 * M, following: 640, location: "New York", joined: "February 2009", banner: "#3d1010" },
  { handle: "benshapiro", name: "Ben Shapiro", bio: "Host of The Ben Shapiro Show. Co-founder, The Daily Wire.", kind: "figure", domain: "politics", badge: "blue", followers: 7.2 * M, following: 980, location: "Florida", joined: "June 2009", banner: "#0d1b2a" },
  { handle: "mehdirhasan", name: "Mehdi Hasan", bio: "Editor-in-chief and CEO of Zeteo. Author of Win Every Argument.", kind: "figure", domain: "politics", badge: "blue", followers: 1.8 * M, following: 2_740, location: "Washington, DC", joined: "April 2009", banner: "#2b1d0e" },

  // ==== markets and crypto: new entries go directly under this line
  { handle: "saylor", name: "Michael Saylor", bio: "Bitcoin is Hope.com | $BTC Hodler | @Strategy Founder & Chairman | free education saylor.org | $MSTR $STRC", kind: "figure", domain: "markets", badge: "blue", followers: 5.2 * M, following: 803, location: "Miami Beach, FL", joined: "January 2011", banner: "#f7931a" },
  { handle: "CathieDWood", name: "Cathie Wood", bio: "Founder, CEO and CIO @ARKinvest. Thematic portfolio manager for disruptive innovation, mom, economist, and women's advocate.", kind: "figure", domain: "markets", badge: "blue", followers: 3 * M, following: 525, location: "St. Petersburg, FL", joined: "February 2014", banner: "#1a1a2e" },
  { handle: "chamath", name: "Chamath Palihapitiya", bio: "Social Capital. 8090. God is in the details.", kind: "figure", domain: "markets", badge: "blue", followers: 2.5 * M, following: 1_153, location: "In the Arena", joined: "April 2007", banner: "#111111" },
  { handle: "PeterSchiff", name: "Peter Schiff", bio: "Chief Economist & Global Strategist Europac.com, Chairman SchiffGold.com, Host SchiffRadio.com, Best-selling Author", kind: "figure", domain: "markets", badge: "blue", followers: 1.8 * M, following: 319, location: null, joined: "July 2009", banner: "#8a6d1f" },
  { handle: "VitalikButerin", name: "vitalik.eth", bio: "I choose balance. First-level balance. mi pinxe lo crino tcati", kind: "figure", domain: "markets", badge: "blue", followers: 7.9 * M, following: 551, location: "Earth", joined: "May 2011", banner: "#3c3c5d" },
  { handle: "brian_armstrong", name: "Brian Armstrong", bio: "Co-founder & CEO @Coinbase. Creating more economic freedom in the world. Co-founder @researchhub @newlimit. Not investment advice.", kind: "figure", domain: "markets", badge: "blue", followers: 4 * M, following: 843, location: "Earth", joined: "April 2008", banner: "#0a2a6b" },
  { handle: "cz_binance", name: "CZ 🔶 BNB", bio: "Buy the book (proceeds go to charity). @binance @BNBchain @YZiLabs @GiggleAcademy", kind: "figure", domain: "markets", badge: "blue", followers: 13 * M, following: 1_281, location: null, joined: "August 2017", banner: "#2b2f36" },

  // ==== gaming, streamers and creators: new entries go directly under this line
  { handle: "KaiCenat", name: "Kai Cenat", bio: "Any Means Possible", kind: "figure", domain: "gaming", badge: "blue", followers: 3.1 * M, following: 220, location: null, joined: "February 2017", banner: "#333639" },
  { handle: "ishowspeedsui", name: "Speed⭐️", bio: "", kind: "figure", domain: "gaming", badge: "blue", followers: 4.2 * M, following: 168, location: "Tokyo", joined: "September 2018", banner: "#333639" },
  { handle: "xQc", name: "xQc", bio: "PLAYER OF GAMES - Streamer of streams, player of games", kind: "figure", domain: "gaming", badge: "blue", followers: 1.6 * M, following: 526, location: "Laval, Québec", joined: "October 2016", banner: "#333639" },
  { handle: "pokimanelol", name: "pokimane", bio: "content creator :) instagram.com/imane | youtube.com/pokimane | tiktok.com/@poki", kind: "figure", domain: "gaming", badge: "blue", followers: 4.1 * M, following: 1_776, location: null, joined: "December 2013", banner: "#333639" },
  { handle: "Ninja", name: "Ninja", bio: "I love video games. Co-Founder @nutcasemilk", kind: "figure", domain: "gaming", badge: "blue", followers: 6.7 * M, following: 1_512, location: "Illinois, USA", joined: "November 2010", banner: "#333639" },
  { handle: "Asmongold", name: "Zack", bio: "He/Him Professional Neckbeard--Daily streams on kick.com/asmongold and twitch.tv/Zackrawrr", kind: "figure", domain: "gaming", badge: "blue", followers: 1.4 * M, following: 1_614, location: "Austin TX", joined: "May 2010", banner: "#333639" },
  { handle: "LudwigAhgren", name: "ludwig", bio: "married man", kind: "figure", domain: "gaming", badge: "blue", followers: 1.9 * M, following: 1_042, location: "California, USA", joined: "July 2011", banner: "#333639" },
  { handle: "Valkyrae", name: "RAE", bio: "I stream on Twitch and YouTube :) @hihistudios • @100thieves • @wineaboutit69", kind: "figure", domain: "gaming", badge: "blue", followers: 2.9 * M, following: 1_027, location: null, joined: "August 2014", banner: "#333639" },
  { handle: "KSI", name: "ksi", bio: "I don't use Twitter/X anymore. If you wanna know what I'm doing, check out my YouTube channel below", kind: "figure", domain: "gaming", badge: "blue", followers: 8.1 * M, following: 1_060, location: "England", joined: "March 2011", banner: "#333639" },
  { handle: "LoganPaul", name: "Logan Paul", bio: "Artist, Boxer, Wrestler — Founder @PrimeHydrate — Host @IMPAULSIVE podcast", kind: "figure", domain: "gaming", badge: "blue", followers: 6.3 * M, following: 4_081, location: null, joined: "November 2011", banner: "#333639" },
  { handle: "geoffkeighley", name: "Geoff Keighley", bio: "@TheGameAwards - Thursday, December 10 @SummerGameFest - Returns June 2027 @Gamescom Opening Night Live - August 24, 2027", kind: "figure", domain: "gaming", badge: "blue", followers: 4 * M, following: 9_886, location: null, joined: "October 2007", banner: "#333639" },
  { handle: "jasonschreier", name: "Jason Schreier", bio: "Bloomberg reporter | Triple Click co-host | New York Times bestselling author", kind: "figure", domain: "gaming", badge: "blue", followers: 395 * K, following: 1_805, location: "New York", joined: "March 2010", banner: "#333639" },
  { handle: "TimSweeneyEpic", name: "Tim Sweeney", bio: "Epic Games founder and CEO.", kind: "figure", domain: "gaming", badge: "blue", followers: 354 * K, following: 1_194, location: null, joined: "August 2013", banner: "#333639" },

  // ==== formula 1: new entries go directly under this line
  { handle: "LewisHamilton", name: "Lewis Hamilton", bio: "man on many missions ✌🏾", kind: "figure", domain: "sports", badge: "blue", followers: 16.4 * M, following: 8, location: "Everywhere", joined: "November 2010", banner: "#333639" },
  { handle: "Max33Verstappen", name: "Max Verstappen", bio: "F1 World Champion @redbullracing | Keep Pushing the limits 🦁", kind: "figure", domain: "sports", badge: "blue", followers: 4.7 * M, following: 303, location: "Little bit of everywhere", joined: "April 2012", banner: "#333639" },
  { handle: "LandoNorris", name: "Lando Norris", bio: "Race super fast cars in Formula 1 with @McLarenF1", kind: "figure", domain: "sports", badge: "blue", followers: 2.9 * M, following: 69, location: null, joined: "March 2012", banner: "#333639" },
  { handle: "Charles_Leclerc", name: "Charles Leclerc", bio: "Formula 1 driver @scuderiaferrari", kind: "figure", domain: "sports", badge: "blue", followers: 4.2 * M, following: 188, location: "Monaco", joined: "March 2011", banner: "#333639" },
  { handle: "wbuxtonofficial", name: "Will Buxton", bio: "Broadcaster, voice artist & NYT Best Selling author.", kind: "figure", domain: "sports", badge: "blue", followers: 627 * K, following: 1_426, location: "Oxfordshire, UK", joined: "February 2009", banner: "#333639" },
];

export const OUTLETS: CastMember[] = [
  { handle: "TechCrunch", name: "TechCrunch", bio: "Technology news and analysis with a focus on founders and startup teams.", kind: "outlet", domain: "tech", badge: "gold", followers: 10.1 * M, following: 912, location: "San Francisco, CA", joined: "March 2007", banner: "#0a8f08" },
  { handle: "business", name: "Bloomberg", bio: "The first word in business news.", kind: "outlet", domain: "tech", badge: "gold", followers: 9.8 * M, following: 1_310, location: "New York and the World", joined: "April 2009", banner: "#000000" },
  { handle: "CNBC", name: "CNBC", bio: "First in business worldwide.", kind: "outlet", domain: "tech", badge: "gold", followers: 5.3 * M, following: 840, location: "Englewood Cliffs, NJ", joined: "November 2008", banner: "#005594" },
  { handle: "politico", name: "POLITICO", bio: "Nobody knows politics and policy like POLITICO.", kind: "outlet", domain: "politics", badge: "gold", followers: 4.7 * M, following: 1_420, location: "Washington, DC", joined: "October 2007", banner: "#8b0000" },
  { handle: "TMZ", name: "TMZ", bio: "Breaking the biggest stories in celebrity and entertainment news.", kind: "outlet", domain: "pop", badge: "gold", followers: 6.5 * M, following: 611, location: "Los Angeles, CA", joined: "March 2007", banner: "#b00000" },
  { handle: "PopCrave", name: "Pop Crave", bio: "Your source for pop culture news, updates and charts.", kind: "outlet", domain: "pop", badge: "gold", followers: 2.1 * M, following: 1_908, location: null, joined: "November 2015", banner: "#c2185b" },
  { handle: "voguemagazine", name: "Vogue Magazine", bio: "The official account of Vogue. Fashion, beauty, culture, living.", kind: "outlet", domain: "pop", badge: "gold", followers: 15.2 * M, following: 1_105, location: "New York, NY", joined: "February 2009", banner: "#111111" },
  { handle: "Reuters", name: "Reuters", bio: "Top and breaking news, pictures and videos from Reuters.", kind: "outlet", domain: "crossover", badge: "gold", followers: 26 * M, following: 1_180, location: "Around the world", joined: "March 2007", banner: "#ff8000" },
  { handle: "AP", name: "The Associated Press", bio: "Advancing the power of facts, globally.", kind: "outlet", domain: "crossover", badge: "gold", followers: 16.5 * M, following: 7_100, location: "Global", joined: "June 2009", banner: "#1a1a1a" },
  { handle: "nytimes", name: "The New York Times", bio: "News tips? Share them here: nyti.ms/tips", kind: "outlet", domain: "politics", badge: "gold", followers: 53 * M, following: 860, location: "New York City", joined: "March 2007", banner: "#000000" },
  { handle: "WSJ", name: "The Wall Street Journal", bio: "Sign up for our newsletters and alerts.", kind: "outlet", domain: "tech", badge: "gold", followers: 20.6 * M, following: 1_060, location: "New York, NY", joined: "April 2007", banner: "#0a0a0a" },
  { handle: "CNN", name: "CNN", bio: "It's our job to Go There and tell the most difficult stories.", kind: "outlet", domain: "politics", badge: "gold", followers: 62 * M, following: 1_090, location: null, joined: "February 2007", banner: "#cc0000" },
  { handle: "FoxNews", name: "Fox News", bio: "Follow America's #1 cable news network.", kind: "outlet", domain: "politics", badge: "gold", followers: 26.8 * M, following: 260, location: "U.S.A.", joined: "March 2007", banner: "#003366" },
  { handle: "Variety", name: "Variety", bio: "The business of entertainment.", kind: "outlet", domain: "pop", badge: "gold", followers: 3.2 * M, following: 1_900, location: "Los Angeles, CA", joined: "August 2008", banner: "#0b0b0b" },
  { handle: "espn", name: "ESPN", bio: "Serving sports fans. Anytime. Anywhere.", kind: "outlet", domain: "sports", badge: "gold", followers: 49.8 * M, following: 610, location: null, joined: "February 2009", banner: "#333639" },
  { handle: "BleacherReport", name: "Bleacher Report", bio: "Sports culture, rankings and the moments everyone is talking about.", kind: "outlet", domain: "sports", badge: "gold", followers: 15.6 * M, following: 3_400, location: null, joined: "March 2009", banner: "#333639" },
  { handle: "TheAthletic", name: "The Athletic", bio: "In-depth sports coverage from the best reporters in the game.", kind: "outlet", domain: "sports", badge: "gold", followers: 1.3 * M, following: 2_650, location: null, joined: "December 2015", banner: "#333639" },
  { handle: "DEADLINE", name: "Deadline", bio: "Breaking Hollywood news since 2006.", kind: "outlet", domain: "pop", badge: "gold", followers: 1.5 * M, following: 2_200, location: "Los Angeles, CA", joined: "May 2009", banner: "#333639" },
  { handle: "IGN", name: "IGN", bio: "Video games, movies, TV and everything you're into.", kind: "outlet", domain: "gaming", badge: "gold", followers: 10.3 * M, following: 3_050, location: "Everywhere", joined: "November 2008", banner: "#333639" },
  { handle: "RollingStone", name: "Rolling Stone", bio: "Music, film, TV and political news coverage.", kind: "outlet", domain: "pop", badge: "gold", followers: 6.7 * M, following: 480, location: "New York, NY", joined: "March 2009", banner: "#333639" },
  { handle: "DiscussingFilm", name: "DiscussingFilm", bio: "Your source for film, television and entertainment news.", kind: "outlet", domain: "pop", badge: "gold", followers: 1.6 * M, following: 930, location: null, joined: "April 2015", banner: "#333639" },

  // ==== markets and crypto: new entries go directly under this line
  { handle: "unusual_whales", name: "unusual_whales", bio: "Market news, trading tools. Real-time option flow, screeners, GEX. Custom alerts & more. NFA", kind: "outlet", domain: "markets", badge: "blue", followers: 5.4 * M, following: 2_380, location: "United States", joined: "November 2019", banner: "#0b0f19" },
  { handle: "WatcherGuru", name: "Watcher.Guru", bio: "Watcher Guru gives you unparalleled, unbiased coverage of all-things crypto & finance in real-time | Posts Are Not Financial Advice | @BTCPrice", kind: "outlet", domain: "markets", badge: "gold", followers: 4.9 * M, following: 3, location: "Texas, USA", joined: "April 2021", banner: "#0d0d0d" },

  // ==== gaming, streamers and creators: new entries go directly under this line
  { handle: "Kotaku", name: "Kotaku", bio: "Gaming, reviews, tips and more", kind: "outlet", domain: "gaming", badge: "gold", followers: 2.4 * M, following: 196, location: null, joined: "January 2008", banner: "#333639" },
  { handle: "Dexerto", name: "Dexerto", bio: "The leading source for influencer, streamer, gaming, and viral content", kind: "outlet", domain: "gaming", badge: "gold", followers: 1.46 * M, following: 961, location: null, joined: "September 2009", banner: "#333639" },

  // ==== formula 1: new entries go directly under this line
  { handle: "wearetherace", name: "The Race", bio: "Motorsport coverage that cannot be beaten", kind: "outlet", domain: "sports", badge: "gold", followers: 203 * K, following: 336, location: null, joined: "January 2020", banner: "#333639" },
];

/** Invented outlets, each modelled on a recognisable kind of real one. */
export const FICTIONAL_OUTLETS: CastMember[] = [
  { handle: "TheInference", name: "The Inference", bio: "Reporting on the companies building AI. Subscribers get it first.", kind: "outlet", domain: "tech", badge: "gold", followers: 0.42 * M, following: 744, location: "San Francisco, CA", joined: "May 2019", banner: "/logos/TheInference-banner.svg", avatar: "/logos/TheInference.svg" },
  { handle: "MarginCallDaily", name: "Margin Call Daily", bio: "Markets, money and the people losing it. Not advice.", kind: "outlet", domain: "markets", badge: "gold", followers: 0.9 * M, following: 855, location: "New York, NY", joined: "March 2013", banner: "/logos/MarginCallDaily-banner.svg", avatar: "/logos/MarginCallDaily.svg" },
  { handle: "PatriotOneNews", name: "Patriot One News", bio: "America's news. No apologies.", kind: "outlet", domain: "politics", badge: "gold", followers: 3.4 * M, following: 818, location: "Washington, DC", joined: "January 2017", banner: "/logos/PatriotOneNews-banner.svg", avatar: "/logos/PatriotOneNews.svg" },
  { handle: "ProgressNowNet", name: "Progress Now Network", bio: "News with a point of view. Yours.", kind: "outlet", domain: "politics", badge: "gold", followers: 2.8 * M, following: 818, location: "New York, NY", joined: "June 2015", banner: "/logos/ProgressNowNet-banner.svg", avatar: "/logos/ProgressNowNet.svg" },
  { handle: "TheDailyScroll", name: "The Daily Scroll", bio: "Everything, everywhere, in one very long headline.", kind: "outlet", domain: "pop", badge: "gold", followers: 2.2 * M, following: 818, location: "London", joined: "October 2010", banner: "/logos/TheDailyScroll-banner.svg", avatar: "/logos/TheDailyScroll.svg" },
  { handle: "ShadeReport", name: "Shade Report", bio: "Celebrity news, receipts and the comments you came for.", kind: "outlet", domain: "pop", badge: "gold", followers: 5.1 * M, following: 707, location: "Los Angeles, CA", joined: "February 2014", banner: "/logos/ShadeReport-banner.svg", avatar: "/logos/ShadeReport.svg" },
  { handle: "TheBacklot", name: "The Backlot", bio: "Deals, box office and who is out. The business of entertainment.", kind: "outlet", domain: "pop", badge: "gold", followers: 1.1 * M, following: 670, location: "Los Angeles, CA", joined: "August 2009", banner: "/logos/TheBacklot-banner.svg", avatar: "/logos/TheBacklot.svg" },
  { handle: "BeltwayBrief", name: "Beltway Brief", bio: "What Washington is saying when it thinks nobody is listening.", kind: "outlet", domain: "politics", badge: "gold", followers: 0.75 * M, following: 744, location: "Washington, DC", joined: "September 2018", banner: "/logos/BeltwayBrief-banner.svg", avatar: "/logos/BeltwayBrief.svg" },
  { handle: "BlockDesk", name: "BlockDesk", bio: "Crypto markets, policy and protocol news.", kind: "outlet", domain: "markets", badge: "gold", followers: 1.6 * M, following: 633, location: "New York, NY", joined: "April 2016", banner: "/logos/BlockDesk-banner.svg", avatar: "/logos/BlockDesk.svg" },
  { handle: "SidelineDaily", name: "Sideline Daily", bio: "Sports, loudly. Rankings, receipts and trades nobody asked for.", kind: "outlet", domain: "sports", badge: "gold", followers: 3.8 * M, following: 1_270, location: "New York, NY", joined: "September 2012", banner: "/logos/SidelineDaily-banner.svg", avatar: "/logos/SidelineDaily.svg" },

  // ==== markets and crypto: new entries go directly under this line

  // ==== gaming, streamers and creators: new entries go directly under this line
  { handle: "TheSponsorRead", name: "The Sponsor Read", bio: "Streamer drama, brand deals and the business of being online. Weekly, with receipts.", kind: "outlet", domain: "gaming", badge: "gold", followers: 0.38 * M, following: 602, location: "Los Angeles, CA", joined: "June 2021", banner: "/logos/TheSponsorRead-banner.svg", avatar: "/logos/TheSponsorRead.svg" },

  // ==== formula 1: new entries go directly under this line
];
OUTLETS.push(...FICTIONAL_OUTLETS);

/** Official accounts of companies and government bodies. They issue statements
 *  and announcements; they do not publish articles. */
export const ORGS: CastMember[] = [
  { handle: "WhiteHouse", name: "The White House", bio: "President Donald J. Trump. The Golden Age of America.", kind: "org", domain: "politics", badge: "gold", followers: 4.6 * M, following: 14, location: "Washington, D.C.", joined: "January 2025", banner: "#0a1a3a" },
  { handle: "OpenAI", name: "OpenAI", bio: "OpenAI's mission is to ensure that AGI benefits all of humanity.", kind: "org", domain: "tech", badge: "gold", followers: 4.4 * M, following: 4, location: null, joined: "December 2015", banner: "#000000" },
  { handle: "Tesla", name: "Tesla", bio: "Electric vehicles, giant batteries and solar.", kind: "org", domain: "tech", badge: "gold", followers: 24 * M, following: 140, location: "Austin, TX", joined: "February 2008", banner: "#111111" },
  { handle: "SpaceX", name: "SpaceX", bio: "SpaceX designs, manufactures and launches the world's most advanced rockets and spacecraft.", kind: "org", domain: "tech", badge: "gold", followers: 39 * M, following: 120, location: "Starbase, TX", joined: "April 2009", banner: "#000814" },
  { handle: "nvidia", name: "NVIDIA", bio: "The engine of AI.", kind: "org", domain: "tech", badge: "gold", followers: 2.6 * M, following: 60, location: "Santa Clara, CA", joined: "November 2008", banner: "#1a2e05" },
  { handle: "Meta", name: "Meta", bio: "Building the future of human connection.", kind: "org", domain: "tech", badge: "gold", followers: 13.9 * M, following: 28, location: "Menlo Park, CA", joined: "November 2011", banner: "#0a2540" },
  { handle: "Spotify", name: "Spotify", bio: "Listening is everything.", kind: "org", domain: "pop", badge: "gold", followers: 13.2 * M, following: 3_400, location: null, joined: "July 2008", banner: "#0d2b16" },
  { handle: "SECGov", name: "U.S. Securities and Exchange Commission", bio: "Protecting investors; maintaining fair, orderly and efficient markets; facilitating capital formation.", kind: "org", domain: "markets", badge: "gold", followers: 1.3 * M, following: 60, location: "Washington, DC", joined: "January 2009", banner: "#0b2545" },
  { handle: "Apple", name: "Apple", bio: "Apple.com", kind: "org", domain: "tech", badge: "gold", followers: 9.9 * M, following: 0, location: "Cupertino, CA", joined: "September 2011", banner: "#000000" },
  { handle: "Microsoft", name: "Microsoft", bio: "Our mission is to empower every person and every organization on the planet to achieve more.", kind: "org", domain: "tech", badge: "gold", followers: 13.6 * M, following: 2_400, location: "Redmond, WA", joined: "September 2009", banner: "#0b3d5c" },
  { handle: "Google", name: "Google", bio: "Organizing the world's information and making it universally accessible and useful.", kind: "org", domain: "tech", badge: "gold", followers: 32 * M, following: 290, location: "Mountain View, CA", joined: "February 2009", banner: "#1a2a44" },
  { handle: "amazon", name: "Amazon", bio: "Official account of Amazon. Delivering smiles.", kind: "org", domain: "tech", badge: "gold", followers: 6.1 * M, following: 120, location: "Seattle, WA", joined: "February 2009", banner: "#131921" },
  { handle: "xai", name: "xAI", bio: "Understand the Universe.", kind: "org", domain: "tech", badge: "gold", followers: 1.9 * M, following: 30, location: null, joined: "July 2023", banner: "#000000" },
  { handle: "blueorigin", name: "Blue Origin", bio: "For the benefit of Earth.", kind: "org", domain: "tech", badge: "gold", followers: 1.2 * M, following: 90, location: "Kent, WA", joined: "April 2015", banner: "#0a2a6b" },
  { handle: "Nike", name: "Nike", bio: "Just do it.", kind: "org", domain: "pop", badge: "gold", followers: 9.8 * M, following: 150, location: "Beaverton, Oregon", joined: "November 2011", banner: "#111111" },
  { handle: "skims", name: "SKIMS", bio: "Solutions for every body.", kind: "org", domain: "pop", badge: "gold", followers: 1.1 * M, following: 40, location: null, joined: "June 2019", banner: "#cbb8a6" },
  { handle: "fentybeauty", name: "Fenty Beauty", bio: "Beauty for all. By Rihanna.", kind: "org", domain: "pop", badge: "gold", followers: 1.3 * M, following: 310, location: null, joined: "August 2017", banner: "#c9a48a" },
  { handle: "GOP", name: "GOP", bio: "The official account of the Republican National Committee.", kind: "org", domain: "politics", badge: "gold", followers: 3.5 * M, following: 1_200, location: "Washington, DC", joined: "March 2008", banner: "#b00000" },
  { handle: "TheDemocrats", name: "The Democrats", bio: "The official account of the Democratic National Committee.", kind: "org", domain: "politics", badge: "gold", followers: 2.5 * M, following: 1_100, location: "Washington, DC", joined: "April 2008", banner: "#0a3a8b" },
  { handle: "GovPressOffice", name: "Governor Newsom Press Office", bio: "Official account of the press office of California Governor Gavin Newsom.", kind: "org", domain: "politics", badge: "gold", followers: 720 * K, following: 310, location: "Sacramento, CA", joined: "January 2019", banner: "#0a3d62" },
  // ---- leagues and clubs
  { handle: "NBA", name: "NBA", bio: "The official account of the NBA.", kind: "org", domain: "sports", badge: "gold", followers: 48.3 * M, following: 2_100, location: "New York, NY", joined: "February 2009", banner: "#333639" },
  { handle: "NFL", name: "NFL", bio: "The official account of the National Football League.", kind: "org", domain: "sports", badge: "gold", followers: 36.1 * M, following: 2_700, location: "New York, NY", joined: "August 2008", banner: "#333639" },
  { handle: "premierleague", name: "Premier League", bio: "The official account of the Premier League.", kind: "org", domain: "sports", badge: "gold", followers: 46.2 * M, following: 90, location: "London", joined: "December 2011", banner: "#333639" },
  { handle: "Lakers", name: "Los Angeles Lakers", bio: "17x NBA champions. Lake Show.", kind: "org", domain: "sports", badge: "gold", followers: 13.4 * M, following: 480, location: "Los Angeles, CA", joined: "February 2009", banner: "#333639" },
  { handle: "Chiefs", name: "Kansas City Chiefs", bio: "Official account of the Kansas City Chiefs. #ChiefsKingdom", kind: "org", domain: "sports", badge: "gold", followers: 3.3 * M, following: 1_950, location: "Kansas City, MO", joined: "March 2009", banner: "#333639" },
  { handle: "dallascowboys", name: "Dallas Cowboys", bio: "Official account of the Dallas Cowboys. #DallasCowboys", kind: "org", domain: "sports", badge: "gold", followers: 4.8 * M, following: 720, location: "Frisco, TX", joined: "February 2009", banner: "#333639" },
  { handle: "realmadrid", name: "Real Madrid C.F.", bio: "Official account of Real Madrid C.F. 15 European Cups.", kind: "org", domain: "sports", badge: "gold", followers: 53.4 * M, following: 70, location: "Madrid", joined: "August 2009", banner: "#333639" },
  { handle: "ManUtd", name: "Manchester United", bio: "The official account of Manchester United.", kind: "org", domain: "sports", badge: "gold", followers: 39.2 * M, following: 160, location: "Manchester, England", joined: "April 2012", banner: "#333639" },
  // ---- studios, platforms and games
  { handle: "netflix", name: "Netflix", bio: "Wanna talk about movies and shows all day?", kind: "org", domain: "pop", badge: "gold", followers: 22.4 * M, following: 1_580, location: "California, USA", joined: "October 2008", banner: "#333639" },
  { handle: "MarvelStudios", name: "Marvel Studios", bio: "The official account of Marvel Studios.", kind: "org", domain: "pop", badge: "gold", followers: 5.3 * M, following: 240, location: "Burbank, CA", joined: "June 2012", banner: "#333639" },
  { handle: "PlayStation", name: "PlayStation", bio: "Official account for PlayStation. Updates on PS5, PS VR2, PlayStation Plus and more.", kind: "org", domain: "gaming", badge: "gold", followers: 34.6 * M, following: 720, location: "California", joined: "October 2007", banner: "#333639" },
  { handle: "Xbox", name: "Xbox", bio: "Xbox games, consoles and Game Pass. Play anywhere.", kind: "org", domain: "gaming", badge: "gold", followers: 22.1 * M, following: 4_300, location: "Redmond, WA", joined: "April 2009", banner: "#333639" },
  { handle: "RockstarGames", name: "Rockstar Games", bio: "The official home of Rockstar Games.", kind: "org", domain: "gaming", badge: "gold", followers: 21.8 * M, following: 1_400, location: "New York, NY", joined: "August 2008", banner: "#333639" },
  { handle: "TheAcademy", name: "The Academy", bio: "We are The Academy. Celebrating the art and science of the movies.", kind: "org", domain: "pop", badge: "gold", followers: 4.2 * M, following: 590, location: "Los Angeles, CA", joined: "February 2009", banner: "#333639" },

  // ==== markets and crypto: new entries go directly under this line
  { handle: "coinbase", name: "Coinbase 🛡️", bio: "The future of finance is on Coinbase. For support: @CoinbaseSupport", kind: "org", domain: "markets", badge: "gold", followers: 7.2 * M, following: 198, location: null, joined: "May 2012", banner: "#0052ff" },
  { handle: "binance", name: "Binance", bio: "All Finance on Binance | #Binance #BNB | Support: @BinanceHelpDesk | Posts are not directed towards UK users.", kind: "org", domain: "markets", badge: "gold", followers: 16.1 * M, following: 573, location: null, joined: "June 2017", banner: "#0b0e11" },
  { handle: "RobinhoodApp", name: "Robinhood", bio: "Trade. Invest. Earn.", kind: "org", domain: "markets", badge: "gold", followers: 1.4 * M, following: 33, location: "Menlo Park, CA", joined: "March 2013", banner: "#00c805" },
  { handle: "Nasdaq", name: "Nasdaq", bio: "Powering the world's economies.", kind: "org", domain: "markets", badge: "gold", followers: 247 * K, following: 6_678, location: "Global", joined: "October 2008", banner: "#0f1a2b" },
  { handle: "federalreserve", name: "Federal Reserve", bio: "The official Twitter channel of the Board of Governors of the Federal Reserve System.", kind: "org", domain: "markets", badge: "gold", followers: 1.6 * M, following: 26, location: "Washington, D.C", joined: "March 2009", banner: "#002855" },

  // ==== gaming, streamers and creators: new entries go directly under this line
  { handle: "NintendoAmerica", name: "Nintendo of America", bio: "Welcome to the official Nintendo of America X account, where you'll find the latest Nintendo news! For ESRB ratings go to http://esrb.org.", kind: "org", domain: "gaming", badge: "gold", followers: 15.7 * M, following: 230, location: "Redmond, WA", joined: "April 2007", banner: "#333639" },
  { handle: "Twitch", name: "Twitch", bio: "Twitch is where thousands of communities come together for whatever, every day. For site issues follow @TwitchSupport.", kind: "org", domain: "gaming", badge: "gold", followers: 9.4 * M, following: 1_139, location: "San Francisco, CA", joined: "June 2011", banner: "#333639" },
  { handle: "kick", name: "KICK", bio: "From Every Angle", kind: "org", domain: "gaming", badge: "gold", followers: 542 * K, following: 345, location: null, joined: "October 2022", banner: "#333639" },
  { handle: "Fortnite", name: "Fortnite", bio: "the hunt has begun...", kind: "org", domain: "gaming", badge: "gold", followers: 19.6 * M, following: 122, location: null, joined: "December 2011", banner: "#333639" },
  { handle: "thegameawards", name: "The Game Awards", bio: "Live December 10, 2026 from Peacock Theater in LA. Celebrate the best and see what's next in video games.", kind: "org", domain: "gaming", badge: "gold", followers: 1.57 * M, following: 945, location: "Peacock Theater, Los Angeles", joined: "September 2014", banner: "#333639" },

  // ==== formula 1: new entries go directly under this line
  { handle: "F1", name: "Formula 1", bio: "In 2026 It's All To Drive For 🤩", kind: "org", domain: "sports", badge: "gold", followers: 12.9 * M, following: 101, location: null, joined: "August 2009", banner: "#333639" },
  { handle: "ScuderiaFerrari", name: "Scuderia Ferrari HP", bio: "The official home of the Tifosi. 🇮🇹 🏆 16x Constructors’ Champions 🏆 15x Drivers’ Champions", kind: "org", domain: "sports", badge: "gold", followers: 5.8 * M, following: 80, location: "Maranello, Italy", joined: "January 2010", banner: "#333639" },
  { handle: "redbullracing", name: "Oracle Red Bull Racing", bio: "We sell drinks. Everything else got out of hand. 🪽", kind: "org", domain: "sports", badge: "gold", followers: 4.9 * M, following: 11_183, location: "Worldwide", joined: "December 2010", banner: "#333639" },
];

/** Ordinary people. All fictional. */
const BASE_CROWD: CastMember[] = [
  { handle: "cardigan_betty13", name: "betty ⸆⸉ (taylor's version)", bio: "she/her. 22. i have a theory and it's 40 slides long. fan account", kind: "crowd", domain: "pop", badge: null, followers: 14.2 * K, following: 1_313, location: "cornelia street (spiritually)", joined: "August 2020", banner: "#b08d57" },
  { handle: "keishabardigang", name: "BARDI GANG KEISHA", bio: "if you come for Belcalis you come for ME. stream or step.", kind: "crowd", domain: "pop", badge: null, followers: 9_840, following: 2_204, location: "Bronx NY", joined: "May 2018", banner: "#8b1e3f" },
  { handle: "DaleTSLAlong", name: "Dale | $TSLA to $2,000", bio: "Retired HVAC. 4,112 shares. Not selling. FSD is solved. Grandpa of 5.", kind: "crowd", domain: "tech", badge: "blue", followers: 31.5 * K, following: 688, location: "Scottsdale, AZ", joined: "January 2019", banner: "#7a0c0c" },
  { handle: "vex_eacc", name: "vex ⏩", bio: "e/acc. accelerate or perish. building something (stealth). the future is already late", kind: "crowd", domain: "tech", badge: "blue", followers: 22.7 * K, following: 3_021, location: "hayes valley", joined: "October 2021", banner: "#101820" },
  { handle: "miriam_pdoom", name: "Miriam Okafor", bio: "AI safety researcher. p(doom) updated daily, never downward. Views my own and correct.", kind: "crowd", domain: "tech", badge: null, followers: 18.1 * K, following: 902, location: "Berkeley, CA", joined: "February 2016", banner: "#2d2d44" },
  { handle: "HollowPointCap", name: "Hollow Point Research", bio: "Short-biased research. We told you so (pending). Not investment advice.", kind: "crowd", domain: "markets", badge: "blue", followers: 46.3 * K, following: 211, location: "Greenwich, CT", joined: "September 2017", banner: "#1f1f1f" },
  { handle: "chad_dot_eth", name: "CHAD.eth 🚀", bio: "gm. down 84% up only. $DOGE $BTC. wen. nfa dyor wagmi", kind: "crowd", domain: "markets", badge: "blue", followers: 12.9 * K, following: 5_644, location: "Miami / Dubai", joined: "March 2021", banner: "#2b1055" },
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

export const CROWD: CastMember[] = [
  ...BASE_CROWD,
  ...EXTRA_CROWD.map(
    (c): CastMember => ({
      handle: c.handle, name: c.name, bio: c.bio, kind: "crowd", domain: c.domain, badge: c.badge,
      followers: c.followers, following: c.following, location: null, joined: c.joined, banner: c.banner,
    }),
  ),
];

export const CAST: CastMember[] = [...FIGURES, ...OUTLETS, ...ORGS, ...CROWD];

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
export function avatarOf(c: CastMember): string | null {
  return c.avatar ?? CROWD_AVATARS[c.handle] ?? avatarPath(c.handle, c.kind);
}

/** The profile header: an image path (starting with "/") where one ships with
 *  the app, otherwise the account's flat colour. */
export function bannerOf(c: CastMember): string {
  return CROWD_HEADERS[c.handle] ?? c.banner;
}

export function avatarPath(handle: string, kind: AccountKind): string | null {
  return kind === "figure" || kind === "outlet" || kind === "org" ? `/avatars/${handle}.jpg` : null;
}
