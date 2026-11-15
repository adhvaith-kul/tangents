// The text every writer shares: what may and may not be written, how a post is
// crafted, how threads work, and what an ordinary day's posts are.

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

export const POST_CRAFT = `- Plain text only. No markdown, no surrounding quote marks, no "Post:" labels.
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

/** What an ordinary day's posts are, and the rules they follow. */
export const EVERYDAY_ROUTINE = `Most of any real feed is routine. A chief executive plugs a product or shares a number. An outlet posts a markets wrap, a review or a feature. A company account announces a date. A musician thanks a city. A politician repeats a talking point. An analyst reiterates a rating. A commentator promotes tonight's show. Someone watches a game. Write that.`;
export const EVERYDAY_RULES = `- Each post stands alone. They are not about each other and not about one shared subject.
- No new plot. Nothing that would need a follow-up, move a share price, start a feud or surprise a reporter: no acquisitions, resignations, lawsuits, break-ups, accusations or policy shocks. If a post would make news, it is not an everyday post.
- Leave the open storylines alone. Do not mention them, hint at them or react to them.
- Routine does not mean generic. Be specific to the account: its real products, places, teams, habits and concerns.
- Play it straight. Every account writes exactly as it does in real life, in its real register. Nobody jokes about their own persona.
- One or two posts may reply to or quote another account's recent post, in the routine way accounts do (a congratulation, a thank-you, an agreement, a commentator disagreeing with a take). An account continuing its own post does not count.`;
