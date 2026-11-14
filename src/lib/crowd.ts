// The wider crowd: ordinary people, fans, traders, trolls and passers-by. All
// fictional. Kept as compact rows; profile details that nobody reads closely
// (join date, banner, following count) are derived from the handle.
// OWNER: main session (personas and prompts workstream).
import type { Domain } from "./types";

/** [handle, name, domain, followers, blue badge, bio, voice] */
type Row = [string, string, Domain, number, boolean, string, string];

const ROWS: Row[] = [
  // ---- people who build and run technology
  ["kev_ships", "Kevin Tran", "tech", 3_200, true, "indie hacker. 4 apps, $612 MRR. building in public", "Relates every story to his side project and his revenue numbers. Upbeat, slightly desperate."],
  ["sre_marcus", "Marcus Webb", "tech", 8_900, false, "Infra at a big cloud. Opinions mine, outages everyone's", "Calm and technical. Explains what probably broke and why the press release is wrong."],
  ["laid_off_lena", "Lena Fischer", "tech", 5_400, false, "ex-big-tech PM. three rounds of layoffs. open to work", "Wry about big tech management. Reads announcements for the layoffs hidden in them."],
  ["design_sol", "Sol Reyes", "tech", 12_100, false, "product designer. kerning enjoyer", "Judges every launch by its interface and typography, with specific visual complaints."],
  ["anjali_codes", "Anjali Menon", "tech", 2_100, false, "CS student, Bangalore. learning in public", "Earnest and curious. Asks what a launch means for people starting their careers."],
  ["the_real_gpu_guy", "Tomasz K.", "tech", 6_700, false, "I benchmark things so you don't have to", "Hardware numbers, prices and availability. Distrusts marketing charts."],
  ["cto_dad", "Raj Patel", "tech", 15_400, true, "CTO at a 40-person startup. 3 kids. tired", "The operator's view: what it costs, what breaks, who you become dependent on."],
  ["oss_maintainer", "hal", "tech", 9_800, false, "i maintain a library you depend on. unpaid", "Dry and weary. Notes when a billion-dollar launch rests on volunteer code."],
  ["promptwizard_ai", "Jaxon | AI Automation", "tech", 41_000, true, "I help you 10x with AI. Free guide below 👇", "Engagement farmer. Turns any news into a numbered list of lessons and a link in his bio."],
  ["artist_not_ai", "Mirela Draws", "tech", 23_800, false, "illustrator. no, you can't train on my work", "Angry and articulate about AI and creators' rights. Replies under every AI launch."],
  ["hype_beast_luca", "Luca", "tech", 9_900, false, "early adopter. already pre-ordered", "Buys everything on day one and defends every launch against critics."],
  ["mr_okafor_physics", "Mr. Okafor", "tech", 4_100, false, "HS physics teacher. That's not how that works", "Patiently corrects the science in product claims and launch announcements."],
  // ---- money
  ["theta_gang_greg", "Greg Lombardi", "tech", 7_300, false, "options seller. down bad since 2021", "Posts his trades and losses frankly. Every headline is a volatility event."],
  ["boglehead_bob", "Bob Hendricks", "tech", 1_900, false, "Index funds. 31 years. Still boring", "Unmoved by everything. Tells people to hold and ignore the noise."],
  ["macro_doomer", "Viktor Lang", "tech", 52_000, true, "Macro strategist. The cycle always ends", "Reads every event as a sign of the top. Ominous, sure of himself."],
  ["fintwit_sara", "Sara Lindqvist, CFA", "tech", 34_000, true, "Equity analyst. Models, not vibes", "Sober numbers: margins, multiples, what the guidance implies."],
  ["wsb_tendies", "DeepValueDave", "tech", 18_900, false, "put the roof money in. not advice", "Reckless retail trader. All in or bust, posts his positions, speaks in trading-forum slang."],
  ["btc_maxi_ryan", "Ryan ₿", "tech", 27_600, true, "Bitcoin only. Fiat is the scam", "Everything proves the case for bitcoin. Scornful of banks and of every other coin."],
  ["memecoin_minh", "minh", "tech", 4_400, false, "trading dog coins from a dorm", "Hype and regret within the same hour. Asks if it is too late to buy."],
  ["landlord_larry", "Larry Buckner", "tech", 2_600, false, "Small business owner. Three rentals. Fed up", "Complains about rates, taxes and regulation. Suspicious of both parties and of big tech."],
  // ---- pop culture
  ["barbz_reign", "QUEEN SLEEZE 👑", "pop", 11_200, false, "barb since 09. don't play with her", "Nicki Minaj fan account. Fights rival fan bases on sight and brings chart numbers."],
  ["beyhive_tiff", "Tiffany 🐝", "pop", 8_700, false, "hive. renaissance changed my life", "Reverent about Beyoncé and calmly certain nobody else compares."],
  ["ovo_szn", "Dre", "pop", 6_100, false, "6 God. stats don't lie", "Drake defender. Cites streaming numbers and takes every slight personally."],
  ["navy_rih", "Fenty Navy Ash", "pop", 9_300, false, "waiting on R9 since 2016", "Rihanna fan who has given up on the album and buys everything anyway."],
  ["kylie_updates_", "Kylie Daily", "pop", 54_000, false, "Fan updates on Kylie Jenner. Not affiliated", "Update-account voice: what she wore, where she was, which brands were tagged."],
  ["army_wandering", "minjae⁷", "pop", 3_900, false, "bts. in the wrong fandom's replies again", "K-pop fan who turns up everywhere, polite and relentless about streaming."],
  ["filmbro_felix", "Felix Brandt", "pop", 7_600, false, "35mm or nothing", "Opinionated about cinema, awards campaigns and box office. A little pompous."],
  ["popcrit_naomi", "Naomi Adeyemi", "pop", 31_000, true, "Culture writer", "Thoughtful criticism of what a celebrity moment means. Writes in full, considered sentences."],
  ["sneaker_jay", "Jay Morales", "pop", 14_800, false, "sz 10.5. L on every drop", "Sneakers and resale prices. Judges every collaboration by whether he could get a pair."],
  ["stylist_bea", "Béa Laurent", "pop", 16_500, false, "stylist. not yours", "Fashion insider: who pulled what, from which house, and what it signals."],
  ["podcast_dana", "Dana & Dish Pod", "pop", 22_400, true, "New episode every Tuesday", "Promotes her podcast under every story, with a firm opinion and a link."],
  ["reality_rita", "Rita Calloway", "pop", 4_800, false, "I watch it all so you don't have to", "Reality television devotee who follows celebrity news like a series."],
  ["thrift_theo", "theo", "pop", 5_600, false, "found it for $4", "Against brands and for thrift. Scoffs at the prices of celebrity product lines."],
  ["swiftie_dad", "Mark (Emma's dad)", "pop", 890, false, "Took my daughter to the Eras Tour. Changed man", "Wholesome father who became a fan. Enthusiastic, gets small details wrong."],
  // ---- politics
  ["wonk_wendy", "Wendy Cho", "politics", 28_700, true, "Health policy. Read the bill", "Explains what the text actually says. Exasperated by both parties."],
  ["centrist_dad", "Tom Bradley", "politics", 3_100, false, "Reasonable guy. Both sides have a point", "Earnest moderate who wishes everyone would calm down."],
  ["libertarian_lou", "Lou Castellano", "politics", 9_700, false, "Taxation is theft. The roads are fine", "Sees government behind every problem. Consistent and sarcastic."],
  ["union_maria", "Maria Santos", "politics", 13_200, false, "Organizer, Local 11", "Brings the workers' angle to every corporate and political story."],
  ["hill_staffer_anon", "Hill Staffer", "politics", 39_000, false, "Anonymous. Underpaid. It is worse than you think", "Dry insider asides about how Congress actually works."],
  ["vet_for_truth", "Mike Kowalczyk", "politics", 7_200, false, "USMC (ret.). Country over party", "Plain-spoken and patriotic. Distrusts politicians of every kind."],
  ["teacher_ms_j", "Ms. Jackson", "politics", 4_300, false, "8th grade civics. Yes, I have read the Constitution", "Gently corrects civics mistakes. Tired."],
  ["maga_mom_tx", "Deb 🇺🇸", "politics", 18_600, true, "Mom. Texan. America First", "Enthusiastic supporter of the President. Shares, cheers, uses exclamation marks."],
  ["blue_wave_ben", "Ben Feldman", "politics", 21_000, true, "Dem volunteer. 4,000 doors knocked", "Partisan optimist who turns everything into a reason to vote."],
  ["local_news_carl", "Carl Jennings", "politics", 6_400, false, "Reporter in Dayton. City council is the real beat", "Brings national stories down to their local effect. Factual."],
  ["econ_grad_student", "priyanka", "politics", 5_200, false, "econ phd candidate. it's the elasticity", "Corrects bad economics in the replies. Nerdy and patient."],
  ["farm_report_dale", "Dale Whitfield", "politics", 2_800, false, "Corn, beans, opinions. Iowa", "Tariffs and prices as seen from a farm. Laconic."],
  // ---- everyone else
  ["nurse_jo", "Jo RN", "crossover", 3_600, false, "Night shift. Coffee", "Tired and humane. Little patience for billionaires or for politicians."],
  ["trucker_big_al", "Big Al", "crossover", 2_200, false, "18 wheels. 2.3 million miles", "Practical talk about fuel, tariffs and automation."],
  ["college_zoe", "zoe", "crossover", 1_500, false, "sophomore. chronically online", "Ironic distance, current slang, finds everything unbelievable."],
  ["barista_dev", "Devon", "crossover", 980, false, "pulling shots, writing a screenplay", "Observational. Reports what customers are saying about the news."],
  ["retired_ruth", "Ruth Abernathy", "crossover", 430, false, "Retired librarian. Birdwatcher", "Polite and precise. Asks the sensible question, mildly appalled."],
  ["dadjokes_dan", "Dan Olsen", "crossover", 7_100, false, "Dad. I have jokes", "Makes a pun on the headline and knows it is bad."],
  ["london_gaz", "Gaz", "crossover", 5_300, false, "South London. Spurs, sadly", "British sarcasm about American news and American billionaires."],
  ["lagos_tech_bro", "Chidi O.", "crossover", 11_400, true, "Building fintech in Lagos", "How the news lands outside the United States. Ambitious, direct."],
  ["aussie_shaz", "Shaz", "crossover", 2_700, false, "Brisbane. It's already tomorrow here", "Dry Australian outsider's commentary."],
  ["manila_marco", "Marco Dela Cruz", "crossover", 6_200, false, "night shift. basketball always", "Friendly fan's view from the Philippines. Follows celebrities and the NBA closely."],
  ["lawyer_up_liz", "Liz Aronson, Esq.", "crossover", 19_500, true, "Litigator. This is not legal advice", "Says what the filing or contract actually means and warns against reading posts as law."],
  ["doomscroll_dee", "dee", "crossover", 3_300, false, "logging off (i am not logging off)", "Worn out by the timeline and unable to stop reading it."],
  ["skeptic_sam", "Sam Whitlock", "crossover", 16_200, false, "Source?", "Asks for the source on every claim and points out what is unverified."],
  ["old_site_og", "joined in 2008", "crossover", 45_000, false, "this site used to be good", "Long-time user who compares everything to how it was."],
  ["grammar_gwen", "Gwen", "crossover", 2_400, false, "It's 'fewer'", "Corrects the grammar and spelling in famous people's posts."],
  // ---- sport
  ["lakeshow_trey", "Trey 💜💛", "sports", 8_400, false, "Lakers in 6. every year. don't @ me", "Lakers diehard. Every loss is the officials or the front office, every win means a title. Proposes trades that give up nothing."],
  ["dak_truther_88", "Cowboys Nation Rick", "sports", 5_100, false, "America's Team. This is our year", "Cowboys optimist. Declares each season the one, defends the owner, and is the butt of everyone's jokes without noticing."],
  ["kc_kingdom_jess", "Jess | Red Friday", "sports", 3_900, false, "Chiefs Kingdom. Season tickets, section 118", "Chiefs fan from the stands: tailgate details, crowd noise, a calm confidence that irritates other fans."],
  ["gooner_femi", "Femi", "sports", 12_700, false, "Arsenal. Trust the process (still)", "Arsenal supporter in London. Swings between title talk and despair inside one post. British football slang; argues with rival fans."],
  ["madridista_carlos", "Carlos 🤍", "sports", 21_300, false, "Hala Madrid y nada más", "Real Madrid fan. Lordly certainty that the club wins in the end and every star wants to join. Drops in Spanish."],
  ["suffering_stan_nyj", "Stan (suffering)", "sports", 2_600, false, "Jets fan. I have seen things", "Supports a team that always loses. Gallows humour, expects the worst, oddly proud of it. Finds his own team's angle in everyone else's news."],
  ["fantasy_guru_phil", "Phil | Start/Sit", "sports", 9_300, true, "Fantasy football. 3 leagues, 0 titles since 2019", "Sees every piece of news as a fantasy-football problem: who to start, who to drop, how it ruined his week."],
  ["parlay_pete", "Parlay Pete", "sports", 6_600, false, "5-leg dreamer. down bad. not advice", "Sports bettor who posts only his own slips and how the last leg lost. Superstitious. Never tells anyone else what to bet."],
  ["transfer_tony", "Tony | ITK", "sports", 17_800, false, "In The Know (allegedly). Notifications on", "Transfer-rumour addict. Tracks private jets and shirt-number clues, treats every vague report as confirmation, replies 'announce it' under club posts."],
  ["expected_goals_eva", "Eva Lindholm", "sports", 14_200, true, "Data analyst. The eye test lies", "Analytics account. Answers hot takes with a number and a warning about sample size. Calm, a little condescending."],
  ["coach_dre", "Coach Dre", "sports", 4_300, false, "Played D2 corner. Coaching HS ball now. Film don't lie", "Former college player turned high-school coach. Fundamentals, effort, what the film shows. Gentle about young players, hard on professionals who loaf."],
  ["touchline_kate", "Kate", "sports", 1_800, false, "Travel soccer chauffeur. Snack schedule enforcer", "A parent on the touchline of youth sport who never names or describes a child: the fees, the 6am drives, the other parents, what the professionals could learn about hustle."],
  ["ref_watch_bill", "Bill", "sports", 2_900, false, "That was holding. I have the screenshot", "Blames the officials for everything. Frame-by-frame grievances, rule-book citations, theories about which teams get the calls."],
  // ---- screens, games, charts and books
  ["fourstar_frames", "Imogen Park", "pop", 16_500, false, "Four favourites change weekly. ★★★½", "Film-diary critic. One-line reviews with a star rating, obscure comparisons, weary about franchises."],
  ["boxoffice_ben", "Box Office Ben", "pop", 28_900, true, "Tracking the weekend. Numbers, not vibes", "Box-office tracker. Opening estimates, budgets, second-weekend drops and what they mean for the studio. Dry."],
  ["cape_lore_daily", "Cape Lore Daily", "pop", 41_200, false, "Superhero news, leaks and timelines. Fan account", "Franchise fan account. Treats casting rumours as scripture, explains the timeline, defends the studio against critics and then turns on it."],
  ["waiting_on_six", "Niko", "pop", 7_700, false, "pre-ordered nothing. waiting on one game", "Has waited years for one sequel. Relates every release, delay and trailer back to it and studies logos for clues."],
  ["any_percent_ash", "ash", "pop", 5_600, false, "any% runner. PB by 0.4s. reset", "Speedrunner. Talks in frames, skips and resets, judges a game by how it breaks, finds corporate announcements funny."],
  ["chart_data_maya", "Maya | Chart Watch", "pop", 33_400, false, "Streams, sales, debuts. Receipts only", "Music-chart obsessive. Posts positions, streaming counts and records; settles fan wars with numbers and starts new ones."],
  ["shelf_life_nora", "Nora Reads", "pop", 8_800, false, "140 books a year. Annotating in pen", "Book person. Compares everything to a novel, recommends one, complains about adaptations before seeing them."],
  // ---- trolls, farmers and noise
  ["actually_wrong", "Well, Actually", "crossover", 14_300, true, "Asking the questions nobody will", "Contrarian. Takes the opposite side of any consensus to start an argument."],
  ["ratio_hunter", "ratio", "crossover", 31_000, false, "L", "One-line dunks written to collect more likes than the post they answer."],
  ["engagement_ella", "Ella | Growth", "crossover", 67_000, true, "Follow for daily insights", "Engagement bait: restates the news as a question and asks for thoughts."],
  ["jessica88214", "Jessica88214", "crossover", 12, false, "", "Reads like a spam account: generic praise and an offer to message about an opportunity. Harmless."],
  ["Emily_Carter5521", "Emily Carter", "crossover", 38, false, "", "Spam account. A generic compliment that would fit any post, then says she has sent the poster a message. Never mentions the subject."],
  ["Sophia93710284", "Sophia", "crossover", 4, false, "", "Spam account. One unrelated line about earning from home in her spare time, and to ask her how. Harmless, never names a product or a site."],
  ["tee_drops_now", "Tee Drops 🔥", "crossover", 211, false, "Custom prints. Shop in bio", "Spam account under popular posts: says the post would look great on a shirt and that it is already in their shop. One line."],
  ["MoonCat_100x", "MOONCAT 🚀🚀", "tech", 1_900, true, "$MOONCAT. Early is everything", "Coin-shilling bot. Turns any post into a reason to buy the invented coin $MOONCAT. Rocket emoji, capitals, no punctuation."],
  ["brandon_ai_growth", "Brandon Lee | AI | Web3 | Growth", "tech", 5_300, true, "4x founder. Thought leader. Helping you scale", "Reads like an automated reply: two tidy sentences of agreeable filler about innovation and a fast-moving landscape that could sit under any post."],
  ["promo_plug_4u", "Promote It Here", "crossover", 77, false, "", "Spam account. Replies only, three or four words telling the poster to promote it on their page. Tags nobody."],
  ["ceo_of_everything", "CEO of Everything (parody)", "tech", 88_000, true, "PARODY. Disrupting disruption", "Obvious parody of a tech chief executive: grand announcements about nothing."],

  // ==== markets and crypto: new entries go directly under this line

  // ==== gaming, streamers and creators: new entries go directly under this line

  // ==== formula 1: new entries go directly under this line
];

const BANNERS = ["#1c2733", "#2b2622", "#14213d", "#3a2230", "#20262e", "#1a2e05", "#33240f", "#2d2d44", "#40101c", "#143642"];
const MONTHS = ["January", "March", "April", "June", "August", "September", "November"];

function hash(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export interface CrowdExtra {
  handle: string;
  name: string;
  bio: string;
  domain: Domain;
  badge: "blue" | null;
  followers: number;
  following: number;
  joined: string;
  banner: string;
  voice: string;
}

/** Accounts that only ever post spam. How often they appear follows the reader's noise setting. */
export const SPAM_HANDLES = new Set([
  "jessica88214", "Emily_Carter5521", "Sophia93710284", "tee_drops_now", "MoonCat_100x", "brandon_ai_growth", "promo_plug_4u",
]);

export const EXTRA_CROWD: CrowdExtra[] = ROWS.map(([handle, name, domain, followers, blue, bio, voice]) => {
  const h = hash(handle);
  return {
    handle,
    name,
    bio,
    domain,
    badge: blue ? "blue" : null,
    followers,
    following: 150 + (h % 3200),
    joined: `${MONTHS[h % MONTHS.length]} ${2011 + (h % 13)}`,
    banner: BANNERS[h % BANNERS.length],
    voice,
  };
});
