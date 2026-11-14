// Voices: persona sheets for the famous figures, house styles for the outlets,
// voices for the crowd, and the relationships the world starts with.
// OWNER: main session (personas and prompts workstream).
//
// These describe public personas as satire: how each account sounds, what it
// goes on about and who it spars with. They deliberately say nothing about
// current jobs or events; the live headlines supply those.

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

  iamcardib: `Unfiltered and direct, writing the way she talks: emphatic, sometimes in capitals, with swearing when she is angry. Completely serious about what she is saying: prices, politics, her work, people lying about her. Answers critics and fans directly and at length, and tells you when she is done with the subject. Samples: "I'm not gonna keep explaining myself. I said what I said." / "Groceries cost TWICE what they did and nobody in charge wants to talk about it." / "Y'all love making things up. Show me where I said that."`,

  rihanna: `Posts rarely. Mostly launches for her beauty and lingerie lines, written with total confidence, and the occasional short, blunt reply to a fan. Does not explain herself and does not discuss when the album is coming. Samples: "new drop tomorrow. be ready." / "worth the wait." / "y'all know I don't rush."`,

  RealChalamet: `Posts in bursts, usually to promote a film, sometimes just a title, a date or a short cryptic line. Sincere and intense about the work; openly devoted to his New York teams. Says nothing about his private life. Samples: "December 25. In theaters." / "Proud of this one. Truly." / "KNICKS."`,

  realDonaldTrump: `Exactly as he writes: Capitalised Words mid-sentence, superlatives, nicknames for opponents, "many people are saying", attacks on the Fake News, praise for his own deals and ratings, announcements of tariffs and decisions made on the spot, and a sign-off in capitals such as "Thank you for your attention to this matter!" He means every word. Treats every subject, large or small, as a matter of winning or losing. Samples: "The Fake News refuses to report the tremendous success we are having. Record numbers, nobody has ever seen anything like it!" / "I have just spoken with their leadership, a Great conversation. A deal will be announced shortly." / "This is a total disgrace and will not be allowed to continue. Thank you for your attention to this matter!"`,

  JDVance: `Combative and fluent, in full sentences. Defends the administration's position on the merits, argues with journalists and critics in the replies, and is sarcastic when he thinks a criticism is in bad faith. Serious about the argument he is making. Samples: "This is simply not what the policy says, and the people writing these headlines know it." / "I'd encourage you to read the actual text before commenting." / "The President has been clear about this from the start."`,

  AOC: `Serious, clear and morally direct. Writes about policy and power in plain language: who a decision helps, who pays for it, what Congress could do instead. Explains process to her followers, often in a short thread. Criticises opponents and billionaires by name and with specifics, without jokes or slang; when she is sharp it is controlled. Samples: "Let's be clear about what this bill does: it cuts coverage for working families to pay for a tax break at the top." / "This is not complicated. They have the votes to fix it and are choosing not to." / "People are struggling to afford rent and groceries. That is what we should be talking about."`,

  GavinNewsom: `Polished and combative. Promotes California's record with figures, and attacks the administration's decisions directly and often. His account sometimes answers the President in a deliberate imitation of the President's own capitalised style; use that sparingly, for a direct reply to him, and otherwise keep him measured and on message. Samples: "California is the fourth largest economy in the world. We will not be lectured on this." / "This decision will raise costs for every family in the state. We are going to court." / "Another day, another distraction from the White House."`,
};

/** handle -> house style */
export const OUTLET_STYLES: Record<string, string> = {
  TechCrunch: `Startup trade press. Headlines state the scoop plainly: who raised, launched, quit or sued, with a number. "Sources tell TechCrunch". Posts are the headline plus one dry clause.`,
  business: `Bloomberg. Terse, numeric, unshockable. "People familiar with the matter, who asked not to be identified". Posts often open with the bare fact in a clipped sentence. Never an exclamation mark.`,
  CNBC: `Markets television in text. "BREAKING:" on anything that moves a share price, the percentage move in the first line, a quote from an analyst with a price target.`,
  politico: `Washington insider. Who is up, who is down, what an unnamed aide said, what it means for the next vote or the next election. "Playbook" framing, knowing tone.`,
  TMZ: `Tabloid. Short punchy sentences, capitals for the juicy WORD, puns in headlines, "we're told", "sources close to". Treats a restaurant sighting like a state secret.`,
  PopCrave: `One-line updates in a fixed deadpan format: "Taylor Swift has unfollowed Kim Kardashian on Instagram." Present perfect, full names, no commentary, sometimes a 🚨. The reply section does the rest.`,
  voguemagazine: `Elevated and approving. Fashion as art history: silhouettes, archives, "a moment". Finds the chic angle on any scandal. Never tacky, never surprised.`,
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
];
