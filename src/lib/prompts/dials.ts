// The reader's settings, turned into instructions for the writers.
import { HUMOUR_STYLES, type Domain, type Level, type Settings, type TasteSummary } from "../types";
import { SUBJECTS, SUBJECT_INFO } from "../subjects";

const pick = <T,>(level: Level, options: [T, T, T, T, T]): T => options[level];
const SUBJECT: [string, string, string, string, string] = ["off", "rare", "normal", "frequent", "dominant"];

/** The user's content controls, as instructions for the director. */
export function directorDials(s: Settings): string {
  const lines = [
    `Satire: ${pick(s.satire, [
      "none. Report and react to events as they would really unfold; do not heighten them.",
      "light. Heighten sparingly; most beats could pass for real reporting.",
      "moderate. Heighten one notch, as described above.",
      "strong. Push events a step further than is likely, while staying possible.",
      "maximum. Take every event to the most dramatic outcome that could still conceivably happen. The voices stay straight.",
    ])}`,
    `Conflict: ${pick(s.conflict, [
      "minimal. People disagree politely or not at all; no feuds.",
      "low. Disagreement is measured; rows are rare.",
      "normal.",
      "high. Rivals take the bait; arguments run on.",
      "maximum. Every beat has someone attacking someone by name.",
    ])}`,
    `Subjects: ${SUBJECTS.map((k) => `${SUBJECT_INFO[k].name} ${SUBJECT[s[k]]}`).join("; ")}. A subject that is off does not appear: no beats about it, no accounts from it, no headlines from it.`,
    `Profanity: ${s.profanity === "off" ? "none at all, from anyone." : s.profanity === "mild" ? "mild only, where that person really swears." : "as that person really swears."}`,
    `Famous accounts engaging with the user: ${pick(s.visibility, [
      "never. Nobody famous replies to, quotes or mentions the user.",
      "rarely: about one substantive post in five.",
      "sometimes: about half of substantive posts, as described above.",
      "often: most substantive posts get one famous reply or quote.",
      "always: every post gets at least one famous reply or quote.",
    ])}`,
  ];
  return `THE READER'S SETTINGS (these override the general guidance where they differ):\n${lines.map((l) => `- ${l}`).join("\n")}`;
}

/** Which kinds of humour to lean on and which never to write: the reader's
 *  settings first, then what their engagement has shown. */
export function humourLine(s: Settings, taste: TasteSummary | null): string {
  const name: Record<string, string> = {
    deadpan: "deadpan", sarcasm: "sarcasm", absurd: "absurd", wordplay: "wordplay", roast: "roasts",
    selfdeprecating: "self-deprecating", online: "extremely online", wholesome: "wholesome",
  };
  const fav = HUMOUR_STYLES.filter((k) => s.humourStyles[k] === 2).map((k) => name[k]);
  const never = HUMOUR_STYLES.filter((k) => s.humourStyles[k] === 0).map((k) => name[k]);
  const learned = s.personalisation === "off" || !taste ? [] : taste.likes.styles.filter((k) => !never.includes(name[k] ?? k));
  const skipped = s.personalisation === "off" || !taste ? [] : taste.avoids.styles;
  return [
    "Kinds of humour and remark:",
    fav.length ? `the reader has asked for more ${fav.join(", ")}: most jokes are in those registers.` : "no kind is favoured in the settings.",
    never.length ? `Never write ${never.join(" or ")}.` : null,
    learned.length ? `They respond most to: ${learned.join(", ")}; write more of those.` : null,
    skipped.length ? `They scroll past: ${skipped.join(", ")}; write fewer.` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

/** The same controls, for the crowd writer. */
export function crowdDials(s: Settings, taste: TasteSummary | null = null): string {
  const lines = [
    `Jokes, memes and trolling: ${pick(s.shitposting, [
      "almost none. Replies are sincere.",
      "occasional.",
      "a normal amount for this site.",
      "a lot. Many replies are bits, dunks and running jokes.",
      "constant. Most of the reply section is jokes, memes and trolling.",
    ])}`,
    humourLine(s, taste),
    `Trolls, bots and engagement bait: ${pick(s.noise, [
      "none.",
      "at most one per batch.",
      "one or two per batch.",
      "three or four per batch.",
      "about a third of the batch.",
    ])}`,
    `Conflict: ${pick(s.conflict, ["replies are civil.", "mostly civil.", "normal.", "argumentative.", "everyone is fighting in the replies."])}`,
    `Profanity: ${s.profanity === "off" ? "none at all." : s.profanity === "mild" ? "mild only." : "as people really swear online."}`,
    `GIFs and memes: ${s.media === 0 ? "none. Set gif and meme to null on every post." : s.media === 1 ? "at most two posts in the batch." : "up to five posts in the batch."}`,
  ];
  return `THE READER'S SETTINGS:\n${lines.map((l) => `- ${l}`).join("\n")}`;
}

/** Subjects the reader has turned off. */
export function mutedDomains(s: Settings): Domain[] {
  return SUBJECTS.filter((k) => s[k] === 0);
}

/** Subjects to lean towards when sampling accounts: the reader's taste, else what they turned up. */
export function leanDomains(s: Settings, taste: TasteSummary): Domain[] {
  const up: Domain[] = SUBJECTS.filter((k) => s[k] >= 3);
  return [...new Set([...up, ...(s.personalisation === "off" ? [] : taste.likes.domains)])];
}
