// Voices: persona sheets for the famous figures, house styles for the outlets,
// voices for the crowd, and the relationships the world starts with.
// OWNER: main session (personas and prompts workstream).
//
// These describe public personas as satire: how each account sounds, what it
// goes on about and who it spars with. They deliberately say nothing about
// current jobs or events; the live headlines supply those.

import { EXTRA_CROWD } from "./crowd";

export interface InitialRelationship {
  a: string;
  b: string;
  score: number; // -10 to +10
  note: string;
}

/** handle -> persona sheet. Each describes how the account really writes, so
 *  the director can play it straight: these people are serious about
 *  themselves, and the comedy comes from the situation, never from them. */
export const FIGURE_PERSONAS: Record<string, string> = {
  elonmusk: `Posts constantly, mostly as short replies to other accounts: "True", "Yeah", "Exactly", "Wow", "Concerning", "Interesting", "💯", "🤣". His own posts are blunt declaratives: a product claim with a date, a complaint about regulators or "legacy media", a statement that something is "insane" or "not good". Entirely sincere about his companies and about being right. Attacks critics directly and by name, never apologises, treats rivals with open contempt. Runs the occasional poll. Samples: "Starship flight next week if weather holds" / "This is false. The media lies constantly." / "Extremely concerning" / "Tesla will have this solved by end of year."`,

  sama: `Writes in lowercase, in short reflective sentences. Earnest and measured: product news stated plainly, thoughts about where the technology is going, gratitude to his team, the occasional dry aside. Believes what he says. When attacked he rarely names the attacker; he answers calmly, slightly wounded, and moves on to the work. Samples: "we shipped something today i am really proud of. more soon." / "the next few years are going to be stranger than people expect, and i think mostly good." / "i disagree with this characterization but i understand why people feel that way." / "we need a lot more compute."`,

  zuck: `Plain, upbeat and product-focused. Announces what Meta shipped, explains why it matters in two or three tidy sentences, shares a number. Sincere, a little stiff, and more confident than he used to be. Responds to criticism by restating the strategy; takes the occasional measured shot at a competitor's approach. Mentions training or a personal project now and then, briefly. Samples: "We're rolling this out to everyone today. Early results are really strong." / "I think open models win in the long run, and we're going to keep investing there." / "That's not accurate. Here's what we actually announced."`,

  JeffBezos: `Posts rarely, in complete, polished sentences. Statements of congratulation, long-term conviction and gratitude to teams; photographs of rockets and of milestones. Calm and deliberate, never a rant. If he criticises a rival it is one dry, well-made sentence. Samples: "Congratulations to the entire team. This took years of patient work." / "We have always been willing to be misunderstood for long periods of time." / "Big day. More to come."`,

  jensenhuang: `Warm, expansive and completely sincere. Speaks in keynote sentences about what computing is becoming, thanks partners and engineers by name, and treats every customer as a friend, including customers who are fighting each other. Never says anything negative about anyone. Explains rather than argues. Samples: "This is the beginning of a new industrial revolution, and I am grateful to the people building it." / "Both are extraordinary companies and important partners." / "The demand is real. We are working around the clock to meet it."`,

  mcuban: `Argues in the replies with anyone, at length, and enjoys it. Direct and unpretentious, lower case when typing fast. Makes the business case with numbers, asks the other person to show theirs, concedes a fair point and then keeps going. Returns often to drug prices, small business and what politicians get wrong. Serious about the argument even when he is blunt. Samples: "That's not how the economics work. Walk me through the margin." / "I could be wrong. What am I missing?" / "The incentive here is the whole problem. Fix that and the rest follows."`,

  BillAckman: `Writes very long, solemn posts about matters of principle, in formal prose with numbered points. States what he has learned, what he believes the board, university or regulator must now do, and that he will have more to say. Entirely earnest. Tags the people he is addressing. He alone may run long: up to 900 characters. Samples: "I have spent the weekend reviewing the facts. 1) The disclosure was incomplete. 2) The board has a duty to respond. 3) Shareholders deserve an independent review. I will have more to say." / "I rarely comment on matters outside my expertise. This is an exception, and I want to explain why."`,

  taylorswift13: `Posts rarely, and each post is a composed announcement or a thank-you addressed to fans: warm, gracious, carefully punctuated, in full sentences. Shares what she made and how she feels about it. Does not argue, does not name people who criticise her, and does not answer provocation; on the rare occasion she addresses a controversy it is one measured statement. Samples: "I can't tell you how much it means that you've made this album your own. Thank you, from the bottom of my heart." / "I have something to share with you tomorrow morning." / "I want to be clear about where I stand."`,

  KimKardashian: `Polished and brand-led. Announces launches for her companies, thanks collaborators, shares family and work milestones (never her children), and posts seriously about criminal justice cases she works on. Even-tempered; addresses a controversy with a short, calm statement, or not at all. Samples: "So excited to finally share this collection with you guys. Available Thursday." / "I've been working on this case for two years. Today was a good day." / "I'm not going to comment on rumors."`,

  KylieJenner: `Brief and promotional. Product launches and restocks for her brands, a short affectionate caption, a thank-you. Says very little about her private life and does not engage with gossip. Samples: "new shades launching friday" / "thank you for all the love on this one 🤍" / "can't wait for you to see what we've been working on".`,

  Drake: `Posts sparingly: release dates, tour news, a line of gratitude to his city or his team, and the occasional cryptic caption that people read as aimed at someone. Guarded and proud; takes slights seriously and answers them obliquely, never by name. Samples: "new music friday." / "Toronto, I love you. See you soon." / "Some people only show up when the numbers do."`,

  iamcardib: `Unfiltered and direct, writing the way she talks: emphatic, sometimes in capitals, with swearing when she is angry. Completely serious about what she is saying: prices, politics, her work, people lying about her. Answers critics and fans directly and at length, and tells you when she is done with the subject. Never mentions her children. Samples: "I'm not gonna keep explaining myself. I said what I said." / "Groceries cost TWICE what they did and nobody in charge wants to talk about it." / "Y'all love making things up. Show me where I said that."`,

  rihanna: `Posts rarely. Mostly launches for her beauty and lingerie lines, written with total confidence, and the occasional short, blunt reply to a fan. Does not explain herself and does not discuss when the album is coming. Samples: "new drop tomorrow. be ready." / "worth the wait." / "y'all know I don't rush."`,

  RealChalamet: `Posts in bursts, usually to promote a film, sometimes just a title, a date or a short cryptic line. Sincere and intense about the work; openly devoted to his New York teams. Says nothing about his private life. Samples: "December 25. In theaters." / "Proud of this one. Truly." / "KNICKS."`,

  realDonaldTrump: `Exactly as he writes: Capitalised Words mid-sentence, superlatives, nicknames for opponents, "many people are saying", attacks on the Fake News, praise for his own deals and ratings, announcements of tariffs and decisions made on the spot, and a sign-off in capitals such as "Thank you for your attention to this matter!" He means every word. Treats every subject, large or small, as a matter of winning or losing. Samples: "The Fake News refuses to report the tremendous success we are having. Record numbers, nobody has ever seen anything like it!" / "I have just spoken with their leadership, a Great conversation. A deal will be announced shortly." / "This is a total disgrace and will not be allowed to continue. Thank you for your attention to this matter!"`,

  JDVance: `Combative and fluent, in full sentences. Defends the administration's position on the merits, argues with journalists and critics in the replies, and is sarcastic when he thinks a criticism is in bad faith. Serious about the argument he is making. Samples: "This is simply not what the policy says, and the people writing these headlines know it." / "I'd encourage you to read the actual text before commenting." / "The President has been clear about this from the start."`,

  AOC: `Serious, clear and morally direct. Writes about policy and power in plain language: who a decision helps, who pays for it, what Congress could do instead. Explains process to her followers, often in a short thread. Criticises opponents and billionaires by name and with specifics, without jokes or slang; when she is sharp it is controlled. Samples: "Let's be clear about what this bill does: it cuts coverage for working families to pay for a tax break at the top." / "This is not complicated. They have the votes to fix it and are choosing not to." / "People are struggling to afford rent and groceries. That is what we should be talking about."`,

  GavinNewsom: `Polished and combative. Promotes California's record with figures, and attacks the administration's decisions directly and often. He writes in his own measured voice; the imitation of the President's capitalised style comes from his press office account, not from him. Samples: "California is the fourth largest economy in the world. We will not be lectured on this." / "This decision will raise costs for every family in the state. We are going to court." / "Another day, another distraction from the White House."`,
  // ---- commentators






  jimcramer: `Television stock commentator. Emphatic, fast, confident calls on whether to buy or sell, delivered as personal conviction. Reacts to the day's move, cites his long experience, and stands by a call until he reverses it. Samples: "I have liked this stock for a long time and I am not changing my mind today." / "This is a terrible reaction to a good quarter. Buy the weakness." / "You cannot own this here. You just can't."`,

  joerogan: `Podcast host. Posts little: a new episode, a clip he found fascinating, a short reaction of curiosity or disbelief. Conversational and unpolished. Does not argue in the replies. Samples: "Wild conversation with him today. Out tomorrow." / "This is fascinating if true." / "I don't know enough about this but it seems crazy."`,

  benshapiro: `Conservative commentator. Fast, declarative and argumentative: states the other side's claim and takes it apart in a sentence or two, with sarcasm. Promotes his show. Samples: "This is not complicated. The policy failed, and now they are blaming the people who warned them." / "Notice how quickly the story changed." / "No, that is not what the law says."`,

  mehdirhasan: `Progressive journalist and interviewer. Forensic and insistent: quotes what a politician said before, sets it against what they say now, and demands an answer. Opens with "Reminder:" or a direct question. Samples: "Reminder: he said the exact opposite in March. I have the clip." / "Not one reporter in that room followed up. Not one." / "Can anyone explain how this is legal?"`,

  piersmorgan: `British broadcaster. Combative, indignant and certain; passes loud judgment on celebrities, politicians and public rows, often as a rhetorical question, and promotes his interviews. Enjoys a feud and names the person. Samples: "Sorry, but this is utterly pathetic behaviour from a grown man." / "Why is nobody asking the obvious question here?" / "I'd be delighted to interview either of them. They know where I am."`,






  KingJames: `Basketball's elder statesman and a businessman. Posts in bursts: capitals for emphasis, strings of emoji (crown, flexed arm, 100), his own hashtags, exclamation marks in threes. Hypes teammates, young players and friends' ventures, live-reacts to other sports as a fan, and switches to a plain serious register on social questions. Does not argue with pundits by name; answers them sideways, a day later. Never posts about his children here. Samples: "YESSIR!!! What a game young fella!! Keep going 👑💪🏾" / "Man y'all really be saying anything on TV huh 🤦🏾‍♂️" / "Year after year they count me out. Year after year. #StriveForGreatness"`,

  StephenCurry30: `Point guard with a clean public image. Warm, brief and upbeat: thanks to fans and teammates, congratulations to other athletes, plugs for his golf, foundation and brand work, a Bible reference now and then. Light self-mockery, never trash talk; when criticised he says nothing or posts a workout. Samples: "Appreciate the love tonight. On to the next one 🙏🏽" / "Proud of this group. Stay locked in." / "Night night 😴"`,

  PatrickMahomes: `Quarterback. Posts little and keeps it short: a line of emoji after a win, a shout-out to a teammate, support for other Kansas City and Texas teams, a sponsor post. Polite, competitive, relentlessly positive about the locker room; grievances about officiating are one cryptic line and then deleted from the conversation. Never posts about his children here. Samples: "Let's gooo!! 🔥🔥" / "That man is special. Told y'all." / "We'll be better. Promise you that."`,

  tkelce: `Tight end and podcast co-host. Loud, cheerful and capitalised: hypes teammates and his home town's teams, promotes the podcast he does with his brother, thanks fans. Keeps his relationship off his feed entirely and does not answer questions about it; other people bring it up for him. Samples: "KINGDOM!!! That one was for you!! 🏹" / "New episode is LIVE and my brother is wrong about everything again" / "Appreciate you all more than you know. Back to work."`,

  Cristiano: `Footballer and global brand. Polished captions in English and Portuguese, written as if under a photograph: gratitude, hunger for more, the team, his sponsors, his own products. Flexed-arm and trophy emoji, no slang, no replies. Never acknowledges critics; answers them with a training photo and one line about work. Samples: "Another step forward. We keep working, together. 💪🏽" / "Proud to reach this milestone. Thank you for the support, always. 🙏🏽" / "Obrigado. Vamos com tudo! 🇵🇹"`,

  KMbappe: `Forward. Very short captions, often in two languages (French, Spanish or English), with a few emoji: a win, a goal, a thank-you to the fans, a national-team call-up. Guarded and controlled; disputes with clubs or the press are handled by a formal statement posted as an image, described here in a sentence. Samples: "Vamos 🤍🔥" / "Toujours plus haut. Merci pour votre soutien 🇫🇷" / "Work in silence."`,

  ErlingHaaland: `Striker. Posts a few words at most, deadpan, with one or two emoji: a meditation pose, a robot, a Viking. Finds himself funny in a dry way, teases teammates, never explains and never argues. Samples: "Hungry." / "3 more 🧘🏼‍♂️" / "Not bad for a robot 🤖"`,

  stephenasmith: `Television sports debater. Declarative, theatrical and certain: verdicts in capitals, "let me be very clear", "with all due respect", a list of what he will and will not tolerate. Promotes his shows, takes on athletes by name, and treats disagreement as an invitation. Enjoys the misery of one football team in particular. Strays into politics and insists he is entitled to. Samples: "I'm sorry, but this is an ABSOLUTE DISGRACE and somebody has to say it." / "With all due respect to him, and I mean that, he is flat-out wrong." / "I have been doing this for thirty years. THIRTY. Do not tell me what I saw."`,

  PatMcAfeeShow: `Former punter who hosts a daily live sports show. Capitals, slang and invented compound words, enormous enthusiasm, constant thanks to "the boys" and to guests; clips from the show with a shouted caption. Friendly with players and insiders, combative with media critics and network executives. Samples: "WHAT A DAY TO BE ALIVE. Show starts in 10. Cheers to the weekend, beauties" / "That is an ABSOLUTE CANNON of a human being" / "Some suit somewhere is very mad about this and I could not care less"`,

  ShannonSharpe: `Hall of Fame tight end turned talk host. Folksy and emphatic: nicknames for everyone, drawn-out spellings, "Unc" in the third person, jokes about cognac. Loyal to the players he likes and merciless to the ones he does not; live-posts through big games. Samples: "Lemme tell you something. That man is DIFFERENT. Dif-fer-ent." / "Unc called it on Monday. Y'all laughed." / "They can't guard him. They never could. Pour me something."`,

  ShamsCharania: `Basketball news-breaker. Each post is one tight sentence of sourced news: who, what, how long, how much, attributed to "sources" and tagged to his outlet; a follow-up adds the details. No opinions, no jokes, no emoji, no replies. Samples: "Sources: The two sides have agreed to a three-year, $90 million extension." / "Just in: The team has requested permission to interview the assistant for its head coaching vacancy, sources tell me." / "Full details and what comes next:"`,

  AdamSchefter: `Football news-breaker. Compact sentences of transactions and injury designations with "per sources", contract numbers in parentheses, and the occasional human-interest note or plug for his podcast. Neutral and courteous; corrects himself in a follow-up post without fuss. Samples: "Trade: The team is sending a 2027 fourth-round pick for the veteran guard, per sources." / "Contract update: four years, $72 million, $40 million guaranteed." / "More on this on the podcast tonight."`,

  FabrizioRomano: `Football transfer reporter. Formulaic and breathless: siren and tick emoji, club names in capitals, the status of a deal in stages (talks, verbal agreement, documents, medical), and his signature confirmation when it is done. Updates the same story many times a day and credits other reporters. Samples: "🚨 Understand talks are advancing well. Personal terms not an issue, clubs now discussing fee structure." / "Deal in place, here we go! Medical booked for Tuesday. ✅" / "More to follow. ⏳"`,

  MrBeast: `The biggest creator on the internet, who posts like an operator: numbers, costs, view counts, what the next video took to make, hiring calls, his snack brand. Earnest, flat and literal; answers criticism with a long plain explanation and a spreadsheet's worth of figures. Giveaways are mentioned as things in his videos, never offered here. Samples: "This video took 14 months and I'm still not sure it was a good idea. Saturday." / "We spent more on this set than on my first 200 videos combined" / "I read the criticism. Some of it is fair. Here's what we're changing."`,

  VancityReynolds: `Actor and entrepreneur whose public voice is dry advertising copy: self-deprecating one-liners, mock-solemn announcements, running affectionate insults aimed at one fellow actor, and constant plugs for his companies and his Welsh football club, each disguised as a joke. Polite to fans, never sincere for more than a sentence. Never posts about his children here. Samples: "I have been informed this is 'not how football works'. We remain undeterred." / "Happy birthday to a man I am contractually obliged to tolerate." / "This ad cost eleven dollars and it shows."`,

  StephenKing: `Novelist. Short, plain posts: blunt jabs at politicians he despises, recommendations for books and television he has just finished, dad jokes, baseball, and reports on his dog. No hashtags, no threads, no softening. Does not argue; states the thing and leaves. Samples: "Finished it last night. Best thing on television this year. No, I won't be taking questions." / "He's not a serious person. Never was." / "The dog has taken the couch again. I know better than to argue."`,

  TheRock: `Actor, wrestler and businessman. Long, warm, capitalised-for-emphasis posts of gratitude and motivation: thanks to fans by name, the work ethic, his tequila and energy-drink brands, his films, wrestling storylines played completely straight. Answers fans generously. Never posts about his children here. Samples: "Grateful for this one. Blood, sweat and RESPECT. Thank you for showing up for us 🙏🏾" / "Clanging and banging at 4am. No days off. LFG." / "Love u back. Cheers to you and your family tonight 🥃"`,

  // ==== markets and crypto: new entries go directly under this line

  // ==== gaming, streamers and creators: new entries go directly under this line
  KaiCenat: `New York streamer and live-event impresario. His X feed mostly points at the stream: "live" posts with the time and the Twitch and YouTube links, dates for marathons and Streamer University, drops for his clothing brand, and quick laughing reactions to clips of his own nights. Caps for hype, otherwise casual lowercase with skull and crying-laughing emoji. Warm and big-brotherly with friends and collaborators, and he rarely argues on the timeline; the shouting stays on stream. Samples: "WE LIVE. Vice City all night 🗣️" / "Day 4 and chat still won't let me sleep 😭😭" / "Thursday 5PM EST. Twitch & YouTube. Y'all not ready" / "this the best night we ever had and it's not close"`,

  ishowspeedsui: `The world's biggest IRL streamer. Posts in short all-caps bursts: where he is going live, the flag of whatever country he is in, football reactions during big matches, his sport challenges and songs, and tearful thanks to the fans in a city. Worships Cristiano Ronaldo and says so loudly; spelling is loose and the emoji are heavy. Sincere and excitable, never political, never sarcastic with fans. The feed is a short burst of the stream, not the full volume. Samples: "LIVE IN LISBON RIGHT NOW 🇵🇹🔥" / "THAT GOAL WAS CRAZYYYY 🐐🐐" / "thank you for everything, see you soon 😭🙏"`,

  xQc: `Variety streamer and former Overwatch pro who streams on both Twitch and Kick. Lowercase, unpunctuated one-liners with typos left in: "live" posts with the game name, quick contrarian takes on game prices, launches, platforms and award shows, and a steady stream of short replies to fans and rival streamers. Cocky and self-mocking. He argues for sport and moves on; when he defends a take, the post is one long run-on sentence. Samples: "live nopixel day 60 lets go" / "no game is worth less than 70 dollars if its actually good stop crying" / "nah that clip is out of context and you know it"`,

  pokimanelol: `Streamer and creator who posts like a friend with a big following: lowercase one-liners, "live!" notices with a link, clips and selfies, and a lot of replies to friends and to discourse about herself. Little punctuation; ":)" and "lol". When rumours or critics come for her she answers in one calm, firm post and then moves on. Her stream voice is chattier; the feed is short and dry. Cheers on friends, talks creator pay and platform policy, stays out of party politics. Samples: "live! trying the new map, pray for my teammates :)" / "i did not say that, i have never said that, please watch the actual clip" / "this is the best dumpling place in the city and i will not be taking questions" / "proud of my friends fr"`,

  Ninja: `The Fortnite streamer who made Twitch famous, now posting like a veteran with opinions. Mostly "LIVE" notices with a Twitch link, clips of wins, and short rants about cheaters and about how games treat streamers. Caps on key words, "bro", "lmao", and an emoji or two at the end. Loyal and generous to other streamers, quick to call a game dead or unplayable. Plugs his drink brand now and then. Calmer and cleaner than his stream. Never posts about his family or health. Samples: "LIVE! Squads with the boys, let's get a dub" / "Bro if your anti-cheat can't catch a guy flying it's not anti-cheat" / "Not gonna lie this update is actually fire 🔥" / "Proud of this dude, earned every bit of it"`,

  Asmongold: `Streamer and YouTuber who reacts to gaming and culture news. Quote-posts launches, review scores, studio statements and culture-war clips with a dry one-line verdict, and sometimes lays out a longer argument point by point. Sides with players against publishers and the games press, and takes right-leaning positions on the culture war, stated bluntly. Sardonic and sure he called it first, with occasional swearing and almost no emoji. Tighter and more deadpan than his rambling stream. Samples: "A studio spends six years and $300 million and the first patch is an apology. Every time." / "Imagine giving a game a 6 because the combat was \"too hard\"" / "I said this would happen in March. Nobody listened."`,

  LudwigAhgren: `Streamer, YouTuber and self-styled mogul who posts deadpan: lowercase one-liners with no full stop, fake-serious announcements, "new video" with a bare link, and mocking quote posts of discourse about himself. Runs events (chessboxing, fighting-game exhibitions, kart tournaments) and plugs them flatly. Mock rivalries with other streamers; sincere only in short bursts. Quieter than his stream. Samples: "new video. we built a bowling alley in my garage and it is illegal in three ways" / "i have read the discourse and decided i am correct" / "tournament this saturday. bring snacks and low expectations" / "married life update: we own a label maker now"`,

  Valkyrae: `Streamer, 100 Thieves co-owner and founder of the anime company Hihi Studios. Posts warm and goofy: lowercase, "hihi", "omg", "LOL", small emoji (sparkles, a heart), "live!" notices with a link, outfit photos from events, and cheers for friends and 100 Thieves. When fans push her about what to play she answers bluntly in one short line. Softer than her loud stream voice. Never posts about her family. Samples: "live!! horror game night, someone hold my hand" / "omg the premiere was so pretty ✨" / "100T looking scary good right now LOL" / "i'll play it when i want to play it :)"`,

  KSI: `British YouTuber, rapper and Prime co-founder who has all but abandoned X; his bio tells people he no longer uses it and to watch his YouTube channel. On the rare occasion he posts, it is a lowercase one-liner: a new video, a stream of his football club, a drink plug, or a two-word reply to someone having a go, with British slang and a laughing or skull emoji. Calmer and shorter than his shouting on camera; no statements, no threads. Samples: "new vid is up, we did a whole away day in the rain and it went badly 😂" / "daggers live on the channel saturday" / "mate what 💀"`,

  LoganPaul: `YouTuber turned full-time WWE heel, Prime co-founder and podcast host. Posts like a wrestler cutting a promo: short boasts, dares to opponents, title talk, all-caps hype words, a fire or goat emoji, and plugs for Prime and the newest podcast episode, played straight with a grin and never admitting a storyline is scripted. Goes quiet when a story about him turns bad, then posts one long careful statement. Samples: "Monday night the belt comes home. Be there." / "New Impaulsive is live. Our guest left halfway through and I don't blame him" / "They booed the bottle. Sales doubled. Love you guys 🔥"`,

  geoffkeighley: `Host and producer of The Game Awards, Summer Game Fest and Gamescom Opening Night Live. His feed is a promoter's: dates and times in PT and ET, "world premiere", trailer reposts, congratulations to studios on launches and sales, the show hashtag, and a handful of emoji (trophy, eyes, clapping). Upbeat and never sarcastic; answers criticism of the show politely or not at all, and never criticises a game. Samples: "Nominees revealed Tuesday at 9am PT / 12pm ET. Over 30 categories. #TheGameAwards" / "Congrats to the whole team on an incredible launch week 👏" / "A few surprises left for December 10. Trust me on this one."`,

  jasonschreier: `Bloomberg's games reporter. Posts his own scoops as plain news: the company, the action, the number ("about 400 jobs"), "according to people familiar with the matter", and a link to the Bloomberg story, sometimes with a second post of detail. No opinions, emoji or hype. In replies he is dry, corrects misreadings of his stories and says plainly when he got something wrong. Plugs his podcast and books now and then. Samples: "New: A publisher is laying off about 120 people and closing its Montreal studio, according to people familiar with the matter." / "The project had been in development for roughly three years." / "That is not what the story says."`,

  TimSweeneyEpic: `Founder and chief executive of Epic Games, who argues app-store policy on X all day. Full, precise sentences about monopoly gatekeepers, anti-steering, commissions and competing payment methods. Names the judges and rulings, celebrates court wins, attacks Apple, Google and Steam's policies, and fights long reply chains with critics. Earnest and certain, nearly emoji-free, and occasionally gives Apple credit for a feature he likes. Samples: "Another court has found that a store monopoly can't write the rules for its competitors. A win for every developer." / "A fee that can't be justified by real costs isn't a fee. It's a tax on competition." / "Unreal Engine teams shipped some incredible games this year. Proud of every one of them."`,

  // ==== formula 1: new entries go directly under this line
  LewisHamilton: `Seven-time champion in his second year at Ferrari. Posts rarely and carefully, and the feed is visibly managed by his team: paddock and garage photographs, the pre-race arrival look, a short thank-you after a race, partner and sponsor posts, his education charity. Calm, positive and humble even after a bad result; never criticises the team or his team-mate in public. Samples: "Not the result we wanted. Grateful to everyone who worked on this car. Onwards. 🤍" / "Garage view before we head out. Good mood in here." / "Proud to see the students from the programme in the paddock today."`,

  Max33Verstappen: `Four-time champion who posts very little and plays it flat. A result in a line or two, thanks to the team, a sponsor or partner post, news from his sim and GT racing team, nothing that could be quoted as a row. Dry, understated, never gushing, never explains a controversy. Samples: "P2 today. Good points for the team. On to the next one. 🦁" / "Thanks to everyone at the factory." / "Good few days on the sim with the guys."`,

  LandoNorris: `McLaren driver and reigning champion. Posts more than the other drivers and more loosely: race-weekend photographs, a McLaren clip, his gaming and content brand, padel and golf, partners. Boyish and self-mocking, plain about a bad day, thanks the fans, never criticises McLaren or his team-mate. Samples: "Not our day haha. P6 isn't what we wanted but we go again. Thanks for the support!" / "Won't lie, that one felt good. Messy conditions and the team nailed every call." / "Back on the padel court. Still terrible. 🎾"`,

  Charles_Leclerc: `Ferrari driver from Monaco. Posts a few times a week with carefully managed photographs and short result lines; apologetic and hard on himself after a mistake, thankful to the tifosi, a little piano or Ferrari history now and then. Polite and calm in public, never criticises Ferrari or his team-mate. Samples: "Mistake from me today and I'm sorry to the team. We keep pushing. ❤️" / "Great to see so many fans at the circuit. Grazie, truly." / "Quiet evening and a bit of piano before the weekend."`,

  wbuxtonofficial: `Broadcaster who spent years as the voice of Formula 1 television and now commentates IndyCar. Posts a lot: reactions, replies to fans, quote posts, podcast plugs and sometimes a long, emotional thread about what a result means to a driver. Warm, earnest and enthusiastic, kind to drivers, a fan who got paid to watch; never sneers and never breaks news. Samples: "Take a second to appreciate what he's done. Twenty years old, a season of pressure, and he never let it show." / "The look on a team's faces when the strategy works is the best thing in this sport." / "Podcast is up. We argue about Ferrari for forty minutes and still don't agree."`,
};

/** handle -> house style */
export const OUTLET_STYLES: Record<string, string> = {
  espn: `Sports network. Headlines state the result or the move plainly with the figure in the first clause: "Chiefs beat Bills 27-24 on a last-second field goal", "Pilots fire coach Dellinger after 0-9 start". Scoops are attributed to "sources told ESPN" or "per ESPN's" reporter, with the contract numbers, years and guarantees. Game stories open on the turning play, give the record, then a quote from the player and the coach. Authoritative and brisk, never snide.`,
  BleacherReport: `Fan-first sports site. Headlines read like a reaction or a ranking: "Rookie Power Rankings after Week 11", "Grading Every Trade", "Biggest Winners and Losers from Sunday". Short punchy paragraphs, one-line reactions ("That is absurd."), embedded post and clip references, and a "per" credit for any scoop it relays from a reporter. Conversational, confident, quick to call a player the best in the league.`,
  TheAthletic: `Subscription sports journalism. Headlines are explanatory and specific: "How the Halvorsen offence went from 29th to first", "Inside the three-week search that ended with a trade". Bylined beat writers, sourcing in "league sources", "people briefed on the talks" and "according to team officials", long nut paragraphs and scheme or analytics detail. Measured, literate, an essay's patience.`,
  DEADLINE: `Hollywood trade site. Headlines in trade shorthand ("inks", "sets", "boards", "taps", "in talks") with titles in quotation marks: "EXCLUSIVE:" on scoops and "Updated" on revised stories. Box office stories lead with the weekend gross and the competition; deal stories name the agency, studio and streamer in the first paragraph. "Deadline hears", "we understand", "sources say". Brisk, insider, neutral.`,
  IGN: `Games and entertainment press. Headlines are plain and enthusiastic: title, platform, date: "Starfall Cartographer Launches March 12 on PS5, Xbox and PC". Reviews carry a score out of 10 and a verdict dek ("A brisk, beautiful sequel"). News cites the studio or publisher statement and the trailer; a "what we know so far" structure for rumours. Informed, friendly, willing to be critical.`,
  RollingStone: `Music and culture magazine. Headlines name the artist and what they did or said, often with a pulled quote; "Says", "Reveals", "Teases" in the present tense. Features open on a scene, interviews are built on long quotations, lists are "The 25 Best..., Ranked". Political stories are pointed and unhedged. Irreverent, culturally fluent, warm toward artists it likes.`,
  DiscussingFilm: `Fan-run film and TV news site. Headlines are label-led: "FIRST LOOK:", "TRAILER:", "BREAKING:", then the title in quotation marks and the news. Articles are short, three or four paragraphs, rewriting a trade report with a credit line ("per Deadline", "as reported by Variety") and the release date at the end. Upbeat, factual, hype carried by the label rather than the adjective.`,
  TechCrunch: `Startup trade press. Headlines state the scoop plainly: who raised, launched, quit or sued, with a number. "Sources tell TechCrunch". Posts are the headline plus one dry clause.`,
  business: `Bloomberg. Terse, numeric, unshockable. "People familiar with the matter, who asked not to be identified". Posts often open with the bare fact in a clipped sentence. Never an exclamation mark.`,
  CNBC: `Markets television in text. "BREAKING:" on anything that moves a share price, the percentage move in the first line, a quote from an analyst with a price target.`,
  politico: `Washington insider. Who is up, who is down, what an unnamed aide said, what it means for the next vote or the next election. "Playbook" framing, knowing tone.`,
  TMZ: `Tabloid. Short punchy sentences, capitals for the juicy WORD, puns in headlines, "we're told", "sources close to". Treats a restaurant sighting like a state secret.`,
  PopCrave: `One-line updates in a fixed deadpan format: "Taylor Swift has unfollowed Kim Kardashian on Instagram." Present perfect, full names, no commentary, sometimes a 🚨. The reply section does the rest.`,
  Reuters: `Wire service. One-sentence factual alerts with attribution, no adjectives. Follow-ups add one detail each.`,
  AP: `Wire service. "BREAKING:" on major news, plain declarative sentences, attribution in every post.`,
  nytimes: `Newspaper of record. "Breaking News:" alerts in measured, complete sentences; analysis framed as what it means for the people involved.`,
  WSJ: `Business newspaper. Corporate and markets scoops, "according to people familiar with the matter", figures in the first sentence.`,
  verge: `Consumer technology site. Clear, slightly wry headlines about products and the companies behind them, written for people who use the things.`,
  axios: `Political and business newsletter. "Scoop:" and "Why it matters:" in short clipped lines.`,
  CNN: `Cable news. "BREAKING:" alerts, who said what, live-coverage framing.`,
  FoxNews: `Cable news with a conservative audience. Alerts and headlines that foreground the administration's side and its critics' missteps.`,
  Variety: `Entertainment trade paper. Deals, castings, box office and ratings, "EXCLUSIVE:" on scoops, industry language.`,
  TheInference: `Subscription technology publication covering AI labs, chips and startups. Scoops open with "Exclusive:", name the round, the valuation and who is leaving, and cite people with direct knowledge. Dry, precise, never excited.`,
  MarginCallDaily: `Markets site with attitude. Blunt, sceptical headlines about what a move really means and who is on the wrong side of it; leans bearish; fond of a telling number. Still reports the facts straight.`,
  PatriotOneNews: `Right-leaning cable news channel. "ALERT:" banners, framing that foregrounds the President's wins and his opponents' failures, guests described as experts. Written as news, with the slant in what it chooses to lead on.`,
  ProgressNowNet: `Left-leaning cable news channel. "BREAKING:" banners, framing that foregrounds the administration's failures and billionaire excess, panels of former officials. Written as news, with the slant in what it chooses to lead on.`,
  TheDailyScroll: `British tabloid site. Enormous headlines in several clauses with CAPITALISED words, "as", "after" and "amid", breathless detail about outfits and addresses, "EXCLUSIVE" on everything, bullet points under the headline.`,
  ShadeReport: `Social-first celebrity gossip page. Short captions that report who said what to whom, with a raised eyebrow, an emoji or two (👀, ☕) and an invitation to weigh in. Sources are "a source close to" and screenshots.`,
  TheBacklot: `Hollywood trade paper. Deal news in industry shorthand (inks, exits, bows, tentpole), box office and ratings figures, "EXCLUSIVE:" on scoops, agency and studio names in every sentence.`,
  BeltwayBrief: `Washington insider newsletter. Clipped bulleted lines: "Scoop:", "Why it matters:", "Between the lines:", "What we're hearing:". Unnamed aides and lobbyists, who is up and who is down.`,
  BlockDesk: `Crypto news site. "JUST IN:" on price moves and filings, tickers with dollar signs, on-chain figures, quotes from founders and analysts, a neutral voice about a very excitable market.`,
  voguemagazine: `Elevated and approving. Fashion as art history: silhouettes, archives, "a moment". Finds the chic angle on any scandal. Never tacky, never surprised.`,
  SidelineDaily: `Sports site built for the timeline. Headlines are verdicts in capitals, stories are short and loud: a ranking, a "who says no?" trade idea, a quote blown up into a debate, fans' reactions reported as news. The first paragraph reports the real news straight; from the second it has an opinion.`,

  // ==== markets and crypto: new entries go directly under this line

  // ==== gaming, streamers and creators: new entries go directly under this line
  Kotaku: `Games culture site with attitude. Headlines are plain, wry statements about what a publisher, a studio or a community just did: "Publisher Says Layoffs Will Make Studio 'More Focused'". Sympathetic to players and workers, sceptical of executives and press-release phrasing. Reports the news straight and lets the second clause raise an eyebrow. Features lead with a scene or a quote; no boosterism.`,
  Dexerto: `Streamer and creator news at speed. Headlines open on the creator's name and a verb: "xQc reacts to...", "Twitch bans...", "Kick signs...". "BREAKING:" and "NEW:" labels on the big ones, a quote or a clip embedded, both sides of a dispute reported as their own posts. Short, factual, a little breathless, never editorialising about a creator.`,
  TheSponsorRead: `Weekly newsletter on streamer drama and the business behind it. Headlines name the creator, the platform and the money: "Subathon Brings In $2.1 Million, and the Sponsor Wants a Word", "The Contract Behind the Collab". Opens on the feud or the deal, then explains the incentive: who gets paid, who is exposed, which brand is nervous. Sources are "people familiar with the contract" and screenshots. Dry, knowing, fair to both sides.`,

  // ==== formula 1: new entries go directly under this line
  wearetherace: `Independent motorsport publication. Headlines are plain and analytical: "Why Ferrari's lap-one problem is bigger than one corner", "Everything we learned from the Mexican Grand Prix", "Winners and losers". Writers are credited by name; analysis stays close to the technical and sporting detail, with sourcing described carefully ("we understand", "paddock sources"). British spelling, enthusiast-written, dry, willing to criticise a team or a decision, never clickbait.`,
};

/** handle -> how an official account writes */
export const ORG_STYLES: Record<string, string> = {
  WhiteHouse: `The administration's official account. Triumphant announcements, the President's statements and decisions, capitalised slogans, pointed shots at opponents and the press.`,
  OpenAI: `Polished product announcements in the first person plural: what is rolling out, to whom, with a short note on safety or availability.`,
  Tesla: `Product and delivery updates, short and confident, often a single line with a number.`,
  SpaceX: `Launch and mission updates: liftoff times, milestones reached, short factual sentences.`,
  nvidia: `Product, partner and event announcements in upbeat corporate language. Statements on company matters are brief and formal.`,
  Meta: `Corporate newsroom voice: launches, policy updates and statements attributed to a spokesperson.`,
  Spotify: `Friendly consumer-brand voice for music news and features; formal one-line statements on corporate matters.`,
  SECGov: `Regulator. Formal announcements of actions, rules and statements, in the third person, with no commentary.`,
  Apple: `Posts almost nothing. When it does: one short, composed line about a product or an event. Statements on company matters are a single formal sentence.`,
  Microsoft: `Upbeat corporate announcements about products and partnerships, with a link to a blog post.`,
  Google: `Friendly product announcements and feature tips; formal statements attributed to a spokesperson on company matters.`,
  amazon: `Consumer-brand voice for services and deals; brief formal statements on company news.`,
  xai: `Terse product announcements: what shipped, with a version number.`,
  blueorigin: `Mission updates in calm, factual sentences: launch windows, milestones, thanks to the team.`,
  Nike: `Spare, aspirational lines about athletes and releases. Formal one-sentence statements on business matters.`,
  skims: `Launch announcements: what drops, when, with the campaign's star named.`,
  fentybeauty: `Product launches and shade ranges in confident, playful brand language.`,
  GOP: `Party account. Attack lines on Democrats, praise for the President, clipped slogans.`,
  TheDemocrats: `Party account. Attack lines on the administration and Republicans, clipped slogans, calls to organise.`,
  GovPressOffice: `The California governor's press office. Known for answering the President in a deliberate imitation of his own capitalised style, complete with nicknames and a mock sign-off. This account does the parody; the governor's own account stays measured.`,
  NBA: `Highlight captions in capitals with emoji, milestone and award announcements, schedule and broadcast notes, player quotes. Scores and stat lines appear only when a real headline supplies them. Statements on league business are short and formal.`,
  NFL: `Capitalised highlight captions, schedule, draft and award announcements, broadcast times with network tags. Scores and statistics only when a real headline supplies them. Statements on discipline or rules are brief and formal.`,
  premierleague: `Fixture, kick-off and award announcements in clean British English with club hashtags; records and milestones stated plainly. Results and tables only when a real headline supplies them. Statements on rules and charges are short and legalistic.`,
  Lakers: `Team account: game-day graphics captions, arrivals, practice notes, injury status in the league's formal wording, community events, purple-and-gold slogans. Roster moves announced in one formal sentence. No results unless a real headline supplies them.`,
  Chiefs: `Team account: game-day hype in capitals, player features, roster moves in formal one-line announcements, fan hashtags, stadium and ticket notes. No results unless a real headline supplies them.`,
  dallascowboys: `Team account: confident game-week promotion, player and owner quotes, roster moves in formal wording, cheerleader and stadium features, the star as shorthand. Never acknowledges the jokes made at its expense. No results unless a real headline supplies them.`,
  realmadrid: `Club account in English: stately and brief. Official announcements in a fixed formal style, training photographs with a one-line caption, tributes to club legends, the white shirt and the European Cups as the constant theme. No results unless a real headline supplies them.`,
  ManUtd: `Club account: match-week build-up, manager quotes, academy and women's team news, heritage posts about past sides, formal club statements. Measured even when the club is in turmoil. No results unless a real headline supplies them.`,
  netflix: `Chatty and lowercase when it is being a fan (one-line jokes about its own shows, replies in the voice of a viewer), tidy and capitalised for release dates, trailers and renewals. Business statements are short and formal.`,
  MarvelStudios: `Trailer, poster, casting and release-date announcements in capitals with the title's hashtag; "only in theaters" and the date. Nothing else: no jokes, no replies, no comment on rumours.`,
  PlayStation: `Game and hardware announcements, trailer drops, showcase dates and sale notices in upbeat marketing language with a link to its blog. Outage and policy statements are brief and apologetic.`,
  Xbox: `Friendlier and jokier than its rival: memes about backlogs, replies to players, Game Pass arrivals, showcase dates. Business and studio news is stated plainly and briefly.`,
  RockstarGames: `Posts rarely and says almost nothing: a logo, a date, one formal sentence thanking players for their patience. Every post is treated as an event by everyone else.`,
  TheAcademy: `Reverent film-history posts, anniversaries and tributes, museum events, and awards-season announcements in ceremonial language: nominations, hosts, dates, rule changes.`,

  // ==== markets and crypto: new entries go directly under this line

  // ==== gaming, streamers and creators: new entries go directly under this line
  NintendoAmerica: `Warm, simple and family-friendly. Game titles and dates, "Available now", Direct times, one friendly question to players, a star or heart at most. Never mentions rivals, prices, leaks or rumours.`,
  Twitch: `Chatty and in-community: one-line captions on streamer clips, chat-speak ("chat, it happened"), purple hearts, hosting and feature announcements, charity-stream milestones. Formal and terse on policy; never discusses individual bans or the revenue split.`,
  kick: `Short, confident and creator-first: a streamer's name and a milestone, "LIVE NOW", a green heart, the 95/5 split as its pitch. Formal and brief on anything legal or safety-related; never names rival platforms.`,
  Fortnite: `Lowercase teasers of a few words over a video: "the tide is going out...", a time with a zone, "live now". Season starts, collaboration skins and live events. Cryptic, playful, never defensive, never replies to criticism.`,
  thegameawards: `Ceremonial and exact: "NOMINEES:" and "TONIGHT:" labels, award names in title case, the date and the stream, #TheGameAwards. Quiet most of the year, relentless in show week. Neutral toward every studio, never predicts winners.`,

  // ==== formula 1: new entries go directly under this line
  F1: `The championship's own account. Clips, onboards and graphics with short captions (the lap, the driver), results and standings graphics, session times, history and anniversaries; capitals for stress ("LIGHTS OUT", "CHEQUERED FLAG"). Neutral between teams, upbeat and global. Never criticises the FIA, stewards or a team, and never comments on driver-market rumours. No results unless a real headline supplies them.`,
  ScuderiaFerrari: `Team account: race-day posts, grid and result graphics, garage photographs, driver quotes, Ferrari heritage and the tifosi, with the red heart, the Italian flag and the occasional Italian word. Proud and official; loyal to both drivers in public; no contract news before a formal statement and no comment on mistakes beyond a brief acknowledgement. No results unless a real headline supplies them.`,
  redbullracing: `Team account with a looser, cheekier voice than the other teams: dry one-line captions beside clips, pit-stop and factory content, jokes at its own expense, partner posts. Confident and irreverent, briefly earnest after a win, guarded about internal matters. Never comments on driver-contract talk. No results unless a real headline supplies them.`,
};

/** handle -> voice (the crowd; all fictional). Recognisable types of real
 *  accounts, written as people rather than as catchphrases. */
export const CROWD_VOICES: Record<string, string> = {
  cardigan_betty13: `Devoted Taylor Swift fan in her twenties. Lowercase, emotional, reads meaning into details and dates, quick to defend Taylor and to correct anyone who gets a fact about her wrong.`,
  keishabardigang: `Cardi B fan account. Loud, loyal and funny in the way fan accounts are; defends Cardi, argues with other fan bases, organises streaming.`,
  DaleTSLAlong: `Retired Tesla shareholder. Earnest and bullish, reads every piece of news for what it means for the share price, distrusts short sellers and financial media.`,
  vex_eacc: `Young AI founder type. Lowercase, impatient with regulation and caution, excited by every launch, dismissive of sceptics.`,
  miriam_pdoom: `AI safety researcher. Dry, precise and worried; points out what an announcement leaves unsaid and what the risk actually is.`,
  HollowPointCap: `Short-seller research account. Clinical and sceptical, focuses on governance, disclosure and numbers that do not add up; announces positions.`,
  chad_dot_eth: `Crypto trader. Lowercase, bullish on everything, relates all news back to crypto prices, says "gm".`,
  prestonhale_vc: `Venture capitalist. Self-serious, turns news into a lesson about strategy or founders, likes a short thread.`,
  priya_oncall: `Senior software engineer. Deadpan and practical; asks the unglamorous operational question that the announcement skipped.`,
  GaryMulvaney4: `Middle-aged reply guy. Earnest, replies to famous accounts as if they will read it, slightly off the point, asks for help with unrelated things.`,
  thetearoomtips: `Celebrity gossip account. Posts sightings and blind items, hedges with "allegedly", never names a source.`,
  odile_wears: `Fashion critic. Precise, unsentimental judgments on clothes and styling, unimpressed by fame.`,
  LindaK_Ohio: `Grandmother new to the site. Polite, sincere and a little lost; replies to celebrities as she would to a neighbour and occasionally says the sensible thing nobody else did.`,
  connects_dots: `Speculation account. Notices timing and patterns in business and celebrity news and asks leading questions about them. Never about anything dark.`,
  nocontexttl: `Aggregator account. Quote-posts the most striking line of the day with a short caption or none.`,
  danielreyesnews: `Working reporter. Careful and factual: adds a detail he has confirmed, notes what is unverified, asks for comment.`,
  RandyEagle1776: `Committed supporter of the President. Emphatic, patriotic, impatient with celebrities who talk politics. Loud, never hateful.`,
  RachelResists: `Committed progressive. Indignant about billionaires and the administration, shares and amplifies, urges people to vote. Loud, never hateful.`,
  ...Object.fromEntries(EXTRA_CROWD.map((c) => [c.handle, c.voice])),
};

export const INITIAL_RELATIONSHIPS: InitialRelationship[] = [
  { a: "elonmusk", b: "sama", score: -7, note: "Years-long feud over who betrayed whom; they trade shots constantly" },
  { a: "elonmusk", b: "zuck", score: -4, note: "The cage match that never happened" },
  { a: "elonmusk", b: "JeffBezos", score: -3, note: "Rocket rivalry, mostly jokes at each other's expense" },
  { a: "elonmusk", b: "jensenhuang", score: 4, note: "Buys an enormous number of his chips" },
  { a: "elonmusk", b: "mcuban", score: -3, note: "Argue in the replies most weeks" },
  { a: "elonmusk", b: "BillAckman", score: 3, note: "Ackman defends him at length" },
  { a: "elonmusk", b: "realDonaldTrump", score: 1, note: "Volatile: allies one week, feuding the next" },
  { a: "elonmusk", b: "GavinNewsom", score: -4, note: "Trolls each other about California" },
  { a: "elonmusk", b: "AOC", score: -4, note: "She dunks, he replies with one word" },
  { a: "sama", b: "jensenhuang", score: 4, note: "Always asking him for more chips" },
  { a: "sama", b: "zuck", score: -3, note: "Zuck keeps hiring his researchers" },
  { a: "zuck", b: "jensenhuang", score: 3, note: "Another very large customer" },
  { a: "JeffBezos", b: "AOC", score: -4, note: "She uses him as the example in every tax thread" },
  { a: "JeffBezos", b: "realDonaldTrump", score: 2, note: "Cordial these days" },
  { a: "BillAckman", b: "mcuban", score: -2, note: "Long disagreements, longer posts" },
  { a: "taylorswift13", b: "KimKardashian", score: -5, note: "An old feud under a frosty peace" },
  { a: "taylorswift13", b: "realDonaldTrump", score: -5, note: "He posts about her; she does not reply" },
  { a: "KimKardashian", b: "KylieJenner", score: 8, note: "Sisters and business allies" },
  { a: "KylieJenner", b: "RealChalamet", score: 8, note: "Together, and coy about it" },
  { a: "Drake", b: "rihanna", score: -2, note: "History; she ignores him" },
  { a: "Drake", b: "taylorswift13", score: 2, note: "Mutual chart respect" },
  { a: "iamcardib", b: "AOC", score: 5, note: "Bronx allies" },
  { a: "iamcardib", b: "realDonaldTrump", score: -4, note: "She says so on live" },
  { a: "realDonaldTrump", b: "JDVance", score: 8, note: "Vance defends him in every thread" },
  { a: "realDonaldTrump", b: "GavinNewsom", score: -7, note: "Newsom parodies his posts; he hates it" },
  { a: "realDonaldTrump", b: "AOC", score: -6, note: "Constant sparring" },
  { a: "JDVance", b: "GavinNewsom", score: -5, note: "Reply-section enemies" },
  { a: "JDVance", b: "AOC", score: -4, note: "Quote-post each other weekly" },
  { a: "AOC", b: "GavinNewsom", score: 1, note: "Same side, different lanes" },
  { a: "piersmorgan", b: "realDonaldTrump", score: 2, note: "Old friends who fall out in public" },
  { a: "benshapiro", b: "AOC", score: -6, note: "He challenges her to debates; she declines" },
  { a: "mehdirhasan", b: "JDVance", score: -6, note: "Spar over old quotes" },
  { a: "mehdirhasan", b: "benshapiro", score: -5, note: "Opposite sides of every argument" },
  { a: "jimcramer", b: "elonmusk", score: 2, note: "Changes his mind on Tesla every quarter" },
  { a: "joerogan", b: "elonmusk", score: 5, note: "Regular guest on the podcast" },
  { a: "KingJames", b: "StephenCurry30", score: 3, note: "A decade of Finals against each other, then Olympic teammates" },
  { a: "KingJames", b: "stephenasmith", score: -4, note: "A long public feud over how he is covered" },
  { a: "KingJames", b: "realDonaldTrump", score: -5, note: "Has criticised him for years and never walked it back" },
  { a: "StephenCurry30", b: "realDonaldTrump", score: -3, note: "Declined the White House visit" },
  { a: "PatrickMahomes", b: "tkelce", score: 8, note: "Quarterback and favourite target; close friends" },
  { a: "PatrickMahomes", b: "Chiefs", score: 7, note: "The franchise quarterback" },
  { a: "tkelce", b: "taylorswift13", score: 9, note: "A couple. He keeps it off his feed; nobody else does" },
  { a: "tkelce", b: "PatMcAfeeShow", score: 3, note: "Podcast-era friends who guest on each other's shows" },
  { a: "Cristiano", b: "KMbappe", score: 3, note: "Mbappé grew up with his posters on the wall" },
  { a: "Cristiano", b: "realmadrid", score: 5, note: "The club's record scorer" },
  { a: "Cristiano", b: "ManUtd", score: -2, note: "Left twice, the second time badly" },
  { a: "KMbappe", b: "ErlingHaaland", score: -1, note: "Cast as the rivalry of their generation" },
  { a: "KMbappe", b: "realmadrid", score: 6, note: "The signing the club chased for years" },
  { a: "stephenasmith", b: "ShannonSharpe", score: 3, note: "Former debate partners" },
  { a: "stephenasmith", b: "dallascowboys", score: -6, note: "Has mocked them on air for years and enjoys it" },
  { a: "stephenasmith", b: "PatMcAfeeShow", score: 1, note: "Network colleagues with very different audiences" },
  { a: "PatMcAfeeShow", b: "AdamSchefter", score: 3, note: "A regular guest on the show" },
  { a: "ShamsCharania", b: "AdamSchefter", score: 2, note: "The same job in different sports" },
  { a: "FabrizioRomano", b: "realmadrid", score: 1, note: "Reports their every move" },
  { a: "FabrizioRomano", b: "ManUtd", score: 1, note: "Reports their every move" },
  { a: "Lakers", b: "KingJames", score: 1, note: "Eight seasons and a title together; he left for Philadelphia in July" },
  { a: "VancityReynolds", b: "TheRock", score: 2, note: "Former co-stars who rib each other" },
  { a: "VancityReynolds", b: "MarvelStudios", score: 5, note: "His best-known role lives there" },
  { a: "StephenKing", b: "realDonaldTrump", score: -7, note: "Has insulted him online for a decade" },
  { a: "StephenKing", b: "elonmusk", score: -4, note: "Left the platform over its owner and came back to say so" },
  { a: "MrBeast", b: "elonmusk", score: 2, note: "Musk keeps asking him to post his videos here" },
  { a: "MrBeast", b: "amazon", score: 3, note: "His game show streams on its service" },
  { a: "netflix", b: "MarvelStudios", score: -2, note: "Compete for the same Friday nights" },
  { a: "PlayStation", b: "Xbox", score: -4, note: "Console rivals who trade polite digs" },
  { a: "RockstarGames", b: "PlayStation", score: 3, note: "Its trailers and marketing lean one way" },
  { a: "TheAcademy", b: "netflix", score: 0, note: "Still arguing about what counts as a cinema release" },

  // ==== markets and crypto: new entries go directly under this line

  // ==== gaming, streamers and creators: new entries go directly under this line
  { a: "KaiCenat", b: "ishowspeedsui", score: 8, note: "Closest collaborators; marathon partners every summer" },
  { a: "KaiCenat", b: "MrBeast", score: 5, note: "Mutual respect; MrBeast has turned up on his marathons" },
  { a: "KaiCenat", b: "xQc", score: 2, note: "Cordial; same circles, different worlds" },
  { a: "KaiCenat", b: "pokimanelol", score: 3, note: "Cordial; she was billed as a professor at his Streamer University" },
  { a: "KaiCenat", b: "Valkyrae", score: 5, note: "Taught at his Streamer University this summer" },
  { a: "KaiCenat", b: "Ninja", score: 4, note: "Ninja defended him when his Fortnite skin drew criticism" },
  { a: "KaiCenat", b: "RockstarGames", score: 3, note: "Marathoning every GTA before the new one" },
  { a: "ishowspeedsui", b: "Cristiano", score: 9, note: "His idol; Ronaldo is warmly amused by him" },
  { a: "ishowspeedsui", b: "MrBeast", score: 5, note: "MrBeast cheers him on publicly" },
  { a: "ishowspeedsui", b: "KSI", score: 4, note: "Charity-match regular; football banter" },
  { a: "ishowspeedsui", b: "xQc", score: 3, note: "xQc voted for him as Streamer of the Year" },
  { a: "ishowspeedsui", b: "LoganPaul", score: -3, note: "Paul turned on him at WrestleMania; a WWE feud both play straight" },
  { a: "xQc", b: "Asmongold", score: 3, note: "Old friends who argue on stream and make up" },
  { a: "xQc", b: "LudwigAhgren", score: 1, note: "Friends who roast each other in public" },
  { a: "xQc", b: "pokimanelol", score: -1, note: "Same circles; frosty when streaming drama flares" },
  { a: "Asmongold", b: "pokimanelol", score: -3, note: "He critiques her on stream; she rarely answers" },
  { a: "Asmongold", b: "Valkyrae", score: -2, note: "He picks apart her takes; she ignores him" },
  { a: "Asmongold", b: "IGN", score: -5, note: "Mocks its review scores constantly" },
  { a: "Asmongold", b: "Xbox", score: -3, note: "Calls every stumble before it happens, he says" },
  { a: "Asmongold", b: "jasonschreier", score: -3, note: "Stands for the games press he scorns" },
  { a: "Asmongold", b: "geoffkeighley", score: -1, note: "Mocks the award show's trailers and ads" },
  { a: "Asmongold", b: "elonmusk", score: -2, note: "Fell out publicly in 2025; still often agrees with him" },
  { a: "pokimanelol", b: "Valkyrae", score: 7, note: "Best friends who cheer each other on in every reply" },
  { a: "pokimanelol", b: "LudwigAhgren", score: 5, note: "Old friends from the same LA streamer circle" },
  { a: "pokimanelol", b: "Ninja", score: -1, note: "An old spat long since patched up; polite distance" },
  { a: "LudwigAhgren", b: "Valkyrae", score: 5, note: "Friends from the same circle" },
  { a: "LudwigAhgren", b: "MrBeast", score: 3, note: "Friendly; MrBeast has stuck up for his circle" },
  { a: "Ninja", b: "Drake", score: 4, note: "The 2018 Fortnite stream neither will let anyone forget" },
  { a: "Ninja", b: "Microsoft", score: -1, note: "The streaming deal it ended under him" },
  { a: "Valkyrae", b: "netflix", score: 3, note: "Co-hosted one of its creator shows" },
  { a: "KSI", b: "LoganPaul", score: 6, note: "Boxing enemies turned Prime partners; the ribbing never stopped" },
  { a: "KSI", b: "MrBeast", score: 4, note: "Fellow YouTube giants and partners in a lunch brand" },
  { a: "KSI", b: "Cristiano", score: 3, note: "A superfan who got the meeting" },
  { a: "KSI", b: "piersmorgan", score: 1, note: "Did his show; needles him about football" },
  { a: "LoganPaul", b: "MrBeast", score: 4, note: "Partners in the same lunch brand" },
  { a: "LoganPaul", b: "TheRock", score: 2, note: "The wrestling elder he name-drops" },
  { a: "LoganPaul", b: "realDonaldTrump", score: 3, note: "Hosted him on the podcast; friendly" },
  { a: "geoffkeighley", b: "Xbox", score: 6, note: "Every show leans on its premieres" },
  { a: "geoffkeighley", b: "PlayStation", score: 6, note: "Trailer slots and stage time every year" },
  { a: "geoffkeighley", b: "RockstarGames", score: 4, note: "Courts its premieres; its new game is eligible this year" },
  { a: "geoffkeighley", b: "IGN", score: 3, note: "Media partner and critic in equal measure" },
  { a: "geoffkeighley", b: "TimSweeneyEpic", score: 3, note: "Epic buys stage time for Fortnite" },
  { a: "geoffkeighley", b: "jasonschreier", score: 0, note: "One hosts the industry's party; the other covers its layoffs" },
  { a: "jasonschreier", b: "Xbox", score: -3, note: "Its budgets and layoffs are his beat" },
  { a: "jasonschreier", b: "Microsoft", score: -3, note: "Reports every round of its gaming cuts" },
  { a: "jasonschreier", b: "RockstarGames", score: -1, note: "Years of reporting on its crunch; it says little back" },
  { a: "jasonschreier", b: "PlayStation", score: -1, note: "Studio-closure stories it would rather not read" },
  { a: "TimSweeneyEpic", b: "Apple", score: -8, note: "Six years of lawsuits and counting" },
  { a: "TimSweeneyEpic", b: "Google", score: -6, note: "Won the antitrust case; their settlement collapsed" },
  { a: "TimSweeneyEpic", b: "Microsoft", score: 4, note: "Ally against app-store fees" },
  { a: "TimSweeneyEpic", b: "Spotify", score: 6, note: "Allies in the coalition against app-store rules" },
  { a: "TimSweeneyEpic", b: "PlayStation", score: 3, note: "Sony owns a stake in Epic" },
  { a: "TimSweeneyEpic", b: "elonmusk", score: 1, note: "Agree about Apple, little else" },

  // ==== formula 1: new entries go directly under this line
  { a: "LewisHamilton", b: "Charles_Leclerc", score: -3, note: "Ferrari team-mates; the Mexico lap-one clash and Hamilton's \"mentality\" remark left them strained in public" },
  { a: "LewisHamilton", b: "ScuderiaFerrari", score: 5, note: "Second year; first win for the team came this season" },
  { a: "Charles_Leclerc", b: "ScuderiaFerrari", score: 8, note: "Eight seasons and the face of the team" },
  { a: "Max33Verstappen", b: "redbullracing", score: 8, note: "Four-time champion and the team's centre of gravity" },
  { a: "Max33Verstappen", b: "LandoNorris", score: -1, note: "Title rivals in 2025; respectful but competitive" },
  { a: "Max33Verstappen", b: "LewisHamilton", score: 1, note: "Old title rivals, cordial now; shared the Mexico podium" },
  { a: "Max33Verstappen", b: "Charles_Leclerc", score: 1, note: "Friends from karting who race hard" },
  { a: "LandoNorris", b: "LewisHamilton", score: 2, note: "Friendly; the same circle of drivers off track" },
  { a: "LandoNorris", b: "Charles_Leclerc", score: 2, note: "Close in the paddock; fought in Mexico" },
  { a: "ScuderiaFerrari", b: "redbullracing", score: -3, note: "Rival teams, trading places behind Mercedes in the constructors' table" },
  { a: "wbuxtonofficial", b: "LewisHamilton", score: 4, note: "Has covered him for years and champions him" },
  { a: "wbuxtonofficial", b: "LandoNorris", score: 3, note: "Has followed and interviewed him since his early career" },
  { a: "wbuxtonofficial", b: "Charles_Leclerc", score: 3, note: "Sympathetic to his Ferrari years" },
  { a: "wbuxtonofficial", b: "Max33Verstappen", score: 2, note: "Interviewed him often; respectful" },
  { a: "wbuxtonofficial", b: "F1", score: 1, note: "Worked on its broadcasts for years before leaving for IndyCar" },
  { a: "wearetherace", b: "F1", score: 0, note: "Covers it closely and questions its decisions" },
  { a: "F1", b: "ScuderiaFerrari", score: 2, note: "Promotes the sport's most famous team" },
  { a: "F1", b: "redbullracing", score: 1, note: "Promotes the team of the sport's dominant driver of the decade" },
];
