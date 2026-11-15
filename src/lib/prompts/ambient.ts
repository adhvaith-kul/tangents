// Everyday traffic: what the cast posts on an ordinary day, when the Usage
// setting gives those posts their own call instead of folding them into a beat.
import { castIndex } from "../briefs";
import { FIGURES, ORGS, OUTLETS } from "../cast";
import { getSettings } from "../settings";
import type { DigestPost, TasteSummary } from "../types";
import { volumes } from "../usage";
import { directorDials } from "./dials";
import { briefsBlock, fmtPost, fmtTaste, interestsLine } from "./format";
import { famousMemes } from "./memes";
import { CONTENT_RULES, EVERYDAY_ROUTINE, EVERYDAY_RULES, POST_CRAFT, TACTIC_LABELS, THREADS } from "./rules";

export interface AmbientInput {
  simTime: string;
  /** Recent posts, to avoid repeating them; one may be replied to or quoted. */
  timeline: DigestPost[];
  /** Titles of the open storylines, which ambient posts must leave alone. */
  openStorylines: string[];
  taste: TasteSummary;
  count: number;
}

let ambientSystemCache: string | null = null;

export function ambientSystem(): string {
  ambientSystemCache ??= `You write the everyday traffic on Tangents, a satirical social network that looks and works like X. One real person reads it. Another writer handles the news and the drama. Your job is everything else: what these accounts post on an ordinary day when nothing is happening to them.

${EVERYDAY_ROUTINE}

# Rules for everyday posts

${EVERYDAY_RULES}
${POST_CRAFT}
${THREADS}
- Give each post a ref: "n1", "n2", and so on. heat is 1 to 5: these are ordinary posts.
${TACTIC_LABELS}
- reposts: 0 to 2 plain reposts of a post from this response or the recent timeline, by an account that would naturally share it. Nobody reposts their own post.

${famousMemes()}

# Rules

${CONTENT_RULES}

# The cast

Only the accounts in the three lists below may author the posts you write. Each line here is a reminder of who exists. Every call also carries CAST BRIEFS: the full brief (background, how the real account writes, what to avoid) for the accounts most relevant to that call. Write mainly as briefed accounts. Use an account that is only in this index when the beat cannot do without it, and then only for a short, plain post.

Famous figures and commentators:
${castIndex(FIGURES)}

News outlets :
${castIndex(OUTLETS)}

Official accounts of companies and government bodies:
${castIndex(ORGS)}
`;
  return ambientSystemCache;
}

export function ambientUser(input: AmbientInput): string {
  const out: string[] = [];
  out.push(`TIME: ${input.simTime}`);
  if (input.openStorylines.length) {
    out.push(`OPEN STORYLINES (do not touch):\n${input.openStorylines.map((t) => `- ${t}`).join("\n")}`);
  }
  if (input.timeline.length) {
    out.push(`RECENT TIMELINE (do not repeat these; newest first):\n${input.timeline.map(fmtPost).join("\n")}`);
  }
  const settings = getSettings();
  out.push(`THE USER'S TASTE: ${settings.personalisation === "off" ? "personalisation is off; keep the mix broad." : fmtTaste(input.taste)}`);
  const interests = interestsLine(settings);
  if (interests) out.push(interests);
  // A fresh random draw each time, so quiet accounts get their turn.
  // Outlets are not in the random draw, so two are named here to get their turn.
  const outlets = [...OUTLETS].sort(() => Math.random() - 0.5).slice(0, 2).map((o) => o.handle);
  out.push(briefsBlock(outlets, "", settings, input.taste, volumes(settings).ambientBriefs));
  out.push(directorDials(settings, { everyday: true }));
  out.push(
    `Write ${input.count} everyday posts, each by a different account from the CAST BRIEFS, leaning towards what the user enjoys. Skip accounts that appear in the recent timeline.`,
  );
  return out.join("\n\n");
}
