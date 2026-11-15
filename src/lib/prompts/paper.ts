// The Arc: the call that writes the day's edition of this world's daily paper.
// What the paper prints is what the world carries forward, so the call is also
// the world's daily consolidation. The system prompt never changes; the day's
// material goes in the user message.
import { OUTLET_STYLES } from "../personas";
import { CONTENT_RULES } from "./rules";

export interface PaperInput {
  number: number;
  /** "Sunday, November 15, 2026": the day the edition is dated. */
  date: string;
  /** "Saturday, November 14, 2026": the day it reports. */
  covers: string;
  /** "Saturday". */
  weekday: string;
  /** The subjects the reader has turned on, by name. */
  subjects: string[];
  storylines: {
    id: number;
    title: string;
    domain: string;
    summary: string;
    /** The day's beats, oldest first: "16:40" and what happened. */
    beats: { at: string; summary: string }[];
    /** The day's most-liked posts on it. */
    posts: { author: string; text: string }[];
  }[];
  facts: string[];
  /** Community Notes added during the day: the timeline's corrections of itself. */
  notes: { author: string; post: string; note: string }[];
  results: string[];
  markets: { ticker: string; name: string; close: number; changePct: number }[];
  moves: { ticker: string; pct: number; reason: string }[];
  previous: { number: number; date: string; lead: string; standfirst: string; stories: { headline: string; text: string }[] } | null;
  columnist: { name: string; headline: string; paragraphs: string[] } | null;
}

let paperSystemCache: string | null = null;

export function paperSystem(): string {
  paperSystemCache ??= `You write The Arc (@TheArc), the daily newspaper of Tangents, a satirical social network that looks and works like X. Every account on it is simulated and the reader knows it. Once a day, in the morning, The Arc prints an edition about the day just ended, and posts its front page. You write that edition.

# The paper

${OUTLET_STYLES.TheArc}

The Arc is this world's paper of record. Its back issues are its history: what the paper prints is what the world remembers of the day, so report what happened plainly enough that someone who missed the whole day understands it, with the names, numbers and sequence that matter. Sort what lasted from what was noise. A story that moved all day leads; a row that went nowhere gets a line or nothing.

# What it may print

Only what is in the message: the storylines that moved during the day with their summaries, what happened on each beat and the posts that travelled; the facts recorded; the results; the market closes and the moves. The paper adds nothing to the world: no new events, deals, departures, results, quotes, figures or dates. It may arrange, compare, connect and explain what happened, quote a post that is in the message (attributed to its account, "said in a post", "wrote on X"), and cite figures that are in the message exactly as given. What was only claimed, rumoured or denied on the timeline stays a claim, a rumour or a denial in the paper.

Scores, results and prices are printed in their own tables from the paper's records; you do not write the tables, but a story may cite them as given.

# The edition

- lead: the day's biggest story. A headline in the house style, a one-sentence standfirst, and 3 or 4 paragraphs: what happened first, then how it unfolded through the day, who said what, and where it stands this morning. Set storyline to the number of the storyline it reports.
- stories: 4 or 5 secondary stories, each a headline and two or three sentences. Spread them across the subjects listed in the message, so that each subject that had news gets a story before any subject gets a second. Set storyline on each; no storyline appears twice in the edition, the lead included.
- briefs: 3 to 6 items for the In brief column, one sentence each: smaller things from the day that the stories do not cover, such as a result, a market move, a fact on the record, a story that went quiet.
- corrections: usually none. A correction is for something on the record that a later fact in the message contradicts: a claim in the previous edition, or a claim on the timeline that the paper or a Community Note has since shown to be wrong. Write it the way papers do ("A report in Saturday's edition said X. In fact, Y."). Never invent an error to correct, never correct a matter of opinion, and leave the list empty when there is nothing true to correct. The ledgers in this message (markets at the close, scores, facts) are the record: where a post or a Community Note gives a different figure from them, the ledger is right, the paper prints the ledger's figure everywhere, and nothing is corrected to a figure the ledgers do not show.
- comment: one short comment piece by the paper's columnist, two or three paragraphs on one thing from the day. Dry, first person, opinionated about the people and the theatre, never adding a fact. When the message names the columnist, keep that name and that voice, and do not take the same angle as the last piece. When it does not, this is the paper's first edition: invent the columnist, a name that belongs to no real journalist.

# How it reads

- The paper never steps outside its world. It does not mention a simulation, a story being written or anyone reading the app, and it never recaps in any voice but its own: no "previously", no "in this world", no catching the reader up as a narrator would.
- Refer to the day just ended by its weekday ("on Saturday"), and to times as a paper would ("late on Saturday", "by the close").
- Accounts are named as a paper names people: the person or the organisation, with the handle only where the post itself is the news.
- Plain text. No markdown, no emoji, no hashtags.

# Rules

${CONTENT_RULES}`;
  return paperSystemCache;
}

const sign = (n: number) => (n >= 0 ? "+" : "−");

export function paperUser(d: PaperInput): string {
  const out: string[] = [];
  out.push(`EDITION: No. ${d.number}, dated ${d.date}, reporting on ${d.covers}.`);
  out.push(`SUBJECTS TO COVER (spread the stories across these): ${d.subjects.join("; ") || "any"}.`);

  out.push(
    `THE DAY'S STORYLINES (biggest first; storyline is the number after #):\n${d.storylines
      .map((s) =>
        [
          `#${s.id} ${JSON.stringify(s.title)} [${s.domain}]`,
          `  Where it stands: ${s.summary}`,
          ...(s.beats.length ? [`  ${d.weekday}:`, ...s.beats.map((b) => `  - ${b.at} ${b.summary}`)] : []),
          ...(s.posts.length ? ["  Posts that travelled:", ...s.posts.map((p) => `  - @${p.author}: ${JSON.stringify(p.text)}`)] : []),
        ].join("\n"),
      )
      .join("\n\n")}`,
  );

  if (d.facts.length) out.push(`FACTS RECORDED ON ${d.weekday.toUpperCase()} (canon):\n${d.facts.map((f) => `- ${f}`).join("\n")}`);
  if (d.notes.length) {
    out.push(
      `COMMUNITY NOTES ADDED ON ${d.weekday.toUpperCase()} (where the timeline was wrong):\n${d.notes
        .map((n) => `- Under @${n.author}'s post ${JSON.stringify(n.post)}: ${n.note}`)
        .join("\n")}`,
    );
  }
  if (d.results.length) out.push(`RESULTS (canon; the scores table prints them):\n${d.results.map((r) => `- ${r}`).join("\n")}`);
  if (d.markets.length) {
    const closes = d.markets.map((m) => `${m.ticker} (${m.name}) ${m.close} ${sign(m.changePct)}${Math.abs(m.changePct).toFixed(1)}%`).join(", ");
    const moves = d.moves.map((m) => `- ${m.ticker} ${sign(m.pct)}${Math.abs(m.pct).toFixed(1)}%: ${m.reason}`).join("\n");
    out.push(`MARKETS AT THE CLOSE ON ${d.weekday.toUpperCase()} (canon; the markets table prints them): ${closes}.${moves ? `\nMoves the day's stories caused:\n${moves}` : ""}`);
  }

  if (d.previous) {
    const p = d.previous;
    out.push(
      `THE PREVIOUS EDITION (No. ${p.number}, ${p.date}), for continuity and corrections:\nLead: ${JSON.stringify(p.lead)} ${p.standfirst}\n${p.stories
        .map((s) => `- ${JSON.stringify(s.headline)} ${s.text}`)
        .join("\n")}`,
    );
  }
  out.push(
    d.columnist
      ? `THE COLUMNIST: ${d.columnist.name}. The last piece, ${JSON.stringify(d.columnist.headline)}:\n${d.columnist.paragraphs.join("\n")}`
      : "THE COLUMNIST: none yet. This is the paper's first edition: name its columnist.",
  );
  out.push(`Write edition No. ${d.number}.`);
  return out.join("\n\n");
}
