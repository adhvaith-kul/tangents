// The reader's settings, turned into instructions for the writers.
import { HUMOUR_STYLES, type Domain, type Level, type Settings, type TasteSummary } from "../types";
import { SUBJECTS, SUBJECT_INFO } from "../subjects";

const pick = <T,>(level: Level, options: [T, T, T, T, T]): T => options[level];
const SUBJECT: [string, string, string, string, string] = ["off", "rare", "normal", "frequent", "dominant"];

/** Rage bait puts conflict at its top level and trolls at three or more,
 *  whatever those two dials say. */
export function effectiveDials(s: Settings): Settings {
  return s.rage ? { ...s, conflict: 4, noise: Math.max(3, s.noise) as Level } : s;
}

/** The user's content controls, as instructions for the director. `everyday`
 *  is the call that writes only routine posts: it has no beat to fight over. */
export function directorDials(settings: Settings, opts: { everyday?: boolean } = {}): string {
  const s = effectiveDials(settings);
  const conflict = !s.rage
    ? null
    : opts.everyday
      ? "Conflict: an outrage-driven platform (Rage bait is on). Routine posts stay routine, but an account that really fishes for engagement or takes a swipe at the other side in passing does it here."
      : "Conflict: an outrage-driven platform. See RAGE BAIT below; it replaces this dial.";
  const lines = [
    `Satire: ${pick(s.satire, [
      "none. Report and react to events as they would really unfold; do not heighten them.",
      "light. Give events a satirical turn sparingly; most beats could pass for real reporting.",
      "moderate. One satirical notch, as described above: more ridiculous and more revealing, not bigger.",
      "strong. Push the satirical turn a step further than is likely, while staying possible.",
      "maximum. Take every event to the most absurd outcome that could still conceivably happen: the most self-serving motive, the most shameless statement, the pettiest cause. The voices stay straight.",
    ])}`,
    conflict ??
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
  const out = `THE READER'S SETTINGS (these override the general guidance where they differ):\n${lines.map((l) => `- ${l}`).join("\n")}`;
  return s.rage && !opts.everyday ? `${out}\n\n${DIRECTOR_RAGE}` : out;
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
export function crowdDials(settings: Settings, taste: TasteSummary | null = null): string {
  const s = effectiveDials(settings);
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
    s.rage
      ? "Conflict: an outrage-driven platform. See RAGE BAIT below; it replaces this dial."
      : `Conflict: ${pick(s.conflict, ["replies are civil.", "mostly civil.", "normal.", "argumentative.", "everyone is fighting in the replies."])}`,
    `Profanity: ${s.profanity === "off" ? "none at all." : s.profanity === "mild" ? "mild only." : "as people really swear online."}`,
    `GIFs and memes: ${s.media === 0 ? "none. Set gif and meme to null on every post." : "the MEDIA line says how many posts in this batch."}`,
  ];
  const out = `THE READER'S SETTINGS:\n${lines.map((l) => `- ${l}`).join("\n")}`;
  return s.rage ? `${out}\n\n${CROWD_RAGE}` : out;
}

// ---- Rage bait. It goes in the user message, not the cached system prompts,
// because the reader turns it on and off.

/** What holds however hot the timeline runs. Both blocks end with it. */
const RAGE_LINES = `Lines that hold however hot it gets:
- The outrage is about issues, positions and public conduct: what someone said, voted for, built, sold or did in public. No slurs, and no contempt for people for who they are (race, religion, nationality, sex, sexuality, disability and the like). A camp's name for the other side mocks its politics or its behaviour, never its identity.
- No calls for violence, no threats, no doxxing (no addresses, workplaces, families or private details), and nobody tells anyone to harm themselves.
- The content rules stand in full. A real person attacks only in the register they really use: one who never swears or name-calls does not start now. Nobody real is given an invented crime or a defamatory claim: spin, exaggeration and quotes out of context work on what is on the record here, and may overstate a position or its consequences, never invent an act.
- Hostility at the user is argument and mockery of what they posted, never threats or abuse about who they are.
- The profanity setting above still applies.`;

const DIRECTOR_RAGE = `RAGE BAIT is on. This timeline runs like an outrage-driven platform, where what makes people angry is what travels. On every beat:
- Two camps. Any story people can disagree about splits the accounts into two sides, and each account that speaks takes the side its real politics, business or rivalries put it on. Nobody crosses over: an account defends its own side's people whatever they did and reads the other side's every move in the worst light. When a beat puts an account on a side or hardens it, write that in stands, so it holds on later beats.
- crowd_brief names the two camps on this story, what each believes, and the sneering name each has for the other, so the crowd can line up behind them.
- Escalation with age. Each beat on a story moves the argument a step further and never back: first the event itself, then who is to blame, then what the other side's people are like ("this is who they are"). The story's age and beat count say where it is.
- How it is fought, across the beat's posts: commentators quote-dunk rather than reply; a line from the other side is quoted without what surrounded it; the weakest version of their argument is the one answered; criticism is met with "what about when you"; questions are asked to plant an answer; someone is attacked by their own side for not going far enough. When the beat is news, two outlets from opposite sides post the same fact in opposite words (both are spin). A straight report still runs, with less heat.
- Heat follows anger: a beat's most provoking posts get its highest heat, the measured ones the lowest. The reasonable voices still post, and nobody quotes them.
- When the user has posted, both camps read it as a point for one side. The crowd does the attacking; famous accounts engage with the user only as often as the setting above allows, and the user is still never a character in the story.
${RAGE_LINES}`;

// No counts in this block: a share to hit makes the writer plan the batch
// before answering, which once cost five times the output and a minute a call.
const CROWD_RAGE = `RAGE BAIT is on. This reply section runs like one on an outrage-driven platform, where what makes people angry is what gets seen. Where your instructions are calmer than this (how much noise, how much teasing), this wins. It changes what people say, not how you work: still write each post directly as it comes, with no plan and nothing counted.
- Two camps. WHAT PEOPLE ARE REACTING TO usually names the sides. Whoever talks about the story is on one of them, whatever their usual subject: the nurse and the trucker have a side too, and say it in their own words. People cheer their own side's famous accounts and hold the other side's in contempt, using the camps' names for each other. An account whose earlier post in this story is shown stays in that camp and hardens: surer and nastier than last time, never won over.
- Escalation. STORY AGE says how far along it is: in the first hours they fight about what happened; after that, about who is to blame; once it has run a while, about the other side as a kind of person ("people like you", "every single one of them").
- How they fight: quote-dunks (a quote post with a one-line verdict, written for their own side to see) are the commonest move; answering a version of the post nobody wrote; one line of a post repeated without the rest; "what about when your side"; loaded questions; someone attacked by their own camp for being soft; sneers at what the other side's people are like; engagement farming ("say it louder", "RT if you agree", "ratio"). Jokes have a target on the other side.
- A pile-on. Someone ordinary says something mild or reasonable, and others go after it, each saying much the same thing.
- Calm is rare. Now and then a post is sincere (a checkable fact, a real question, someone trying to cool it down); it gets heat 1 or 2, and any replies it gets are hostile, from both sides.
- The story leaks into everything: under a routine post, someone drags it in ("nobody cares, talk about").
- Heat follows anger: the angriest and most tribal posts get the highest heat.
${RAGE_LINES}`;

/** Subjects the reader has turned off. */
export function mutedDomains(s: Settings): Domain[] {
  return SUBJECTS.filter((k) => s[k] === 0);
}

/** Subjects to lean towards when sampling accounts: the reader's taste, else what they turned up. */
export function leanDomains(s: Settings, taste: TasteSummary): Domain[] {
  const up: Domain[] = SUBJECTS.filter((k) => s[k] >= 3);
  return [...new Set([...up, ...(s.personalisation === "off" ? [] : taste.likes.domains)])];
}
