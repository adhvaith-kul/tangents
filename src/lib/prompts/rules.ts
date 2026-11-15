// The text every writer shares: what may and may not be written, how a post is
// crafted, how threads work, what an ordinary day's posts are, and how a post
// is labelled.
import { TACTICS, TACTIC_IDS } from "../tactics";

export const CONTENT_RULES = `The audience is adult and knows every account is simulated. Timid, hedged or sanitised writing is a failure: give these accounts the edge, candour and self-regard they really have.

Wanted: feuds, ego, grievance, public rows, swearing where that person swears, attacks on rivals' products, decisions, statements and spin, heightened launches, acquisitions, break-ups and reconciliations, rumours about careers, deals and who is dating or snubbing whom among the cast. Politicians of both sides are held to the same treatment: their own words and their own theatre, played straight.

Never write, even as a joke:
- slurs, or hate aimed at people for race, religion, nationality, gender, sexuality or disability
- sexual content
- threats or calls to violence
- crimes, abuse allegations, medical or mental-health diagnoses, addiction or deaths invented about any real person or real organisation (a major event may give a crime to people and organisations that are themselves invented, and may report casualties, without names, only when its ARC section says they may be reported)
- anything about children, family members who are not public figures, or private individuals
- false voting information, invented election results, claims that a real election was stolen, rigged or fraudulent, or calls to real-world political action
- self-harm, drug instructions, or organised harassment of a real person
If a premise can only be played by breaking these rules, pick a different premise.

Real headlines sometimes report a lawsuit, a charge, an investigation, a conflict or a scandal. You may cover what the headline reports and the theatre around it (statements, spin, denials, who is gloating), as X does every day. Do not add allegations of your own and do not make jokes at a victim's expense.

Sport is covered like everything else. Results, scores and standings are kept by the scoreboard given in the message, which is canon like the facts ledger: never state a score, result or record that is not on it, and never contradict one that is. Everything around the games stays open to invention: trade and transfer rumours, contract standoffs, press-conference rows, punditry, fines, feuds, locker-room stories. No invented injuries, and none played for laughs.

Do not add disclaimers, labels or winks that the content is fictional. Write it straight.`;

export const POST_CRAFT = `- Numbers are the record, not decoration. Any figure a post states as fact (a price, a percentage, a score, a count, a sum of money, a date) is the one this message gives: in MARKETS or ON THE RECORD, on the SCOREBOARD, in the FACTS LEDGER, or in the post being answered. Copy it exactly, with the team, company or person it belongs to; never round it to a different number, restate it from memory or supply one the message does not have. Where the message gives no figure, the post does without ("sharply", "double digits", "the most this year"). Two posts in one answer never give different figures for the same thing. An account that would exaggerate does it in words ("a bloodbath", "the worst week I have seen"), not with a different number.
- Plain text only. No markdown, no surrounding quote marks, no "Post:" labels.
- At most 280 characters unless a persona sheet says otherwise.
- @mention with real handles from the cast. Use hashtags rarely, as that person would.
- People on this site do not explain the plot. They react, defend themselves, attack, deflect and change the subject. A reader should be able to tell who wrote a post with the name covered.
- Specific beats generic every time: a number, a brand, a named restaurant, an exact time of night.
- Vary length and shape. One-word replies sit next to long rants.
- A persona's sample lines show its register; do not reuse or lightly reword them. No catchphrases, running gags or recurring props.
- An account writes in another language only when the real account (or, for an ordinary account, the person described) really would, and only as often as they really do; most of their posts are still in English if that is how they post. When a post is not in English, also fill in "language" (its name in English) and "translation" (a natural English version); for an English post leave both out.
- A post that promises more ("Here's how:", "A thread", "1/", "Details below 👇", a closing colon) is the first post of a thread, and the rest of the thread must exist. Do not end a post that way by accident.
- A link in a post leads to a page on that account's own site, and the page is written from the post. So only outlets and official accounts put a link in a post, one at most, and the post says plainly what the page holds. People do not paste links; they say it in the post.`;

/** For the writers whose posts carry refs: how an account continues its own post. */
export const THREADS = `- Threads are ordinary on this site: a company walks through a launch, a commentator numbers an argument, an outlet lists the key points, a founder tells a story in parts. When an account would really post one, write it as a thread: the opening post, then that account's replies to itself in order, each replying to the one before it (reply_to set to the previous part's ref), two to four posts in all. Every part reads as a complete post and adds something; the last one lands the point. Mark the thread the way that account does ("🧵", "1/", or nothing at all). At most one thread per response, and its continuation posts do not count towards the number of posts asked for. A post that opens a thread must have the rest of it in this same response.`;

/** The tactic label every model-written post carries (lib/tactics.ts), listed
 *  from the same table the reader's X-ray shows, so the two cannot drift. */
const tacticList = (hot: boolean) =>
  TACTIC_IDS.filter((id) => TACTICS[id].hot === hot)
    .map((id) => `${id} (${TACTICS[id].explanation.split(". ")[0].replace(/\.$/, "")})`)
    .join("; ");

export const TACTIC_LABELS = `- tactic: what the post is doing to the person reading it. The reader can switch on a view that shows this label under every post, to see how a feed works on them, so it must be honest: pick what the post really does, not what its author would claim. One id per post.
  Built to provoke: ${tacticList(true)}.
  Not built to provoke: ${tacticList(false)}.
  Most posts on an ordinary day carry a calm label. Give a hot label only to a post that earns it, and do not spare one a post has earned.`;

/** What an ordinary day's posts are, and the rules they follow. */
export const EVERYDAY_ROUTINE = `Most of any real feed is routine. A chief executive plugs a product or shares a number. An outlet posts a markets wrap, a review or a feature. A company account announces a date. A musician thanks a city. A politician repeats a talking point. An analyst reiterates a rating. A commentator promotes tonight's show. Someone watches a game. Write that.`;
export const EVERYDAY_RULES = `- Each post stands alone. They are not about each other and not about one shared subject.
- No new plot. Nothing that would need a follow-up, move a share price, start a feud or surprise a reporter: no acquisitions, resignations, lawsuits, break-ups, accusations or policy shocks. If a post would make news, it is not an everyday post.
- Leave the open storylines alone. Do not mention them, hint at them or react to them.
- Routine does not mean generic. Be specific to the account: its real products, places, teams, habits and concerns.
- Routine does not mean flat either. This is a satire, and an everyday post is where it is quietest, not where it stops. Each one is the account being a slightly more revealing version of itself: the feature nobody asked for announced as a milestone, the humble-brag, the platitude delivered as insight, the brand joining a conversation it has no business in, the solemn update about something trivial, the plug that gives away what is really being sold. One small turn, in the account's own straight voice; a post that could be pasted unchanged from the real account's feed has missed it.
- Play it straight. Every account writes exactly as it does in real life, in its real register. Nobody jokes about their own persona, and the turn is never a punchline: the account means every word.
- One or two posts may reply to or quote another account's recent post, in the routine way accounts do (a congratulation, a thank-you, an agreement, a commentator disagreeing with a take). An account continuing its own post does not count.`;
