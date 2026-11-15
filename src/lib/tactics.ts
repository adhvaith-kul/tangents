// What a post is doing to the person reading it. Both writers label every post
// with one of these; X-ray shows the label and its explanation, and with Rage
// bait on the timeline ranks the provoking ones higher. Browser-safe.

export interface TacticInfo {
  label: string;
  /** One plain sentence X-ray shows under the label. */
  explanation: string;
  /** Built to provoke: what an outrage-driven timeline rewards. */
  hot: boolean;
}

export const TACTICS = {
  // ---- built to provoke
  bait: {
    label: "Rage bait", hot: true,
    explanation: "Says something provocative mainly to be argued with. Every angry reply carries it further.",
  },
  dunk: {
    label: "Dunk", hot: true,
    explanation: "Holds someone up to be mocked in front of an audience. It is written for the crowd watching, not for the person.",
  },
  strawman: {
    label: "Strawman", hot: true,
    explanation: "Attacks a weaker or more extreme claim than the one that was actually made.",
  },
  context: {
    label: "Out of context", hot: true,
    explanation: "Lifts a line away from what surrounded it, so it reads worse than it was.",
  },
  pileon: {
    label: "Pile-on", hot: true,
    explanation: "One of many replies saying the same thing to the same person. It adds weight, not information.",
  },
  tribal: {
    label: "Us and them", hot: true,
    explanation: "Turns a disagreement about a thing into a claim about what kind of people the other side are.",
  },
  purity: {
    label: "Purity test", hot: true,
    explanation: "Attacks someone on its own side for not going far enough.",
  },
  whatabout: {
    label: "Whataboutism", hot: true,
    explanation: "Answers a criticism by pointing at something the other side did.",
  },
  exaggeration: {
    label: "Exaggeration", hot: true,
    explanation: "States something as bigger, surer or worse than the record supports.",
  },
  loaded: {
    label: "Loaded question", hot: true,
    explanation: "Asks a question to plant the answer, not to learn it.",
  },
  spin: {
    label: "Spin", hot: true,
    explanation: "Puts the facts in words chosen to favour one side.",
  },
  farming: {
    label: "Engagement farming", hot: true,
    explanation: "Written to collect replies, likes or follows, whatever the subject happens to be.",
  },
  // ---- everything else
  report: { label: "Reporting", hot: false, explanation: "States what happened and who said it." },
  evidence: { label: "Evidence", hot: false, explanation: "Adds a fact, a number or a source that others can check." },
  opinion: { label: "Opinion", hot: false, explanation: "A view, argued in the writer's own name." },
  question: { label: "Sincere question", hot: false, explanation: "Asks because the writer wants to know." },
  joke: { label: "Joke", hot: false, explanation: "Played for the laugh." },
  support: { label: "Support", hot: false, explanation: "Cheers someone on." },
  cooling: { label: "Cooling it down", hot: false, explanation: "Tries to lower the temperature or find common ground." },
  promotion: { label: "Promotion", hot: false, explanation: "Sells or announces something of the writer's own." },
  everyday: { label: "Everyday", hot: false, explanation: "The writer's own day, with no argument in it." },
} as const satisfies Record<string, TacticInfo>;

export type Tactic = keyof typeof TACTICS;

export const TACTIC_IDS = Object.keys(TACTICS) as Tactic[];

/** A stored or model-written value as a tactic, or null when it is not one. */
export function tacticOf(v: unknown): Tactic | null {
  return typeof v === "string" && v in TACTICS ? (v as Tactic) : null;
}

export const isHot = (t: Tactic | null | undefined): boolean => !!t && TACTICS[t].hot;
