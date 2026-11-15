// Major events: the planning call that invents one in secret, and the private
// ARC section the director reads on each ordinary beat while one is under way.
//
// The system prompt is built once and never changes, so it caches. The world
// state, the scale and the reader's settings go in the user message.
import { castIndex } from "../briefs";
import { FIGURES, ORGS, OUTLETS } from "../cast";
import { SUBJECT_INFO } from "../subjects";
import type { ArcConsequence, ArcKind, ArcPhase, ArcScale, ArcTarget, DigestArc, Subject, WorldDigest } from "../types";
import { slateSection } from "./director";
import { ago, fmtPost } from "./format";
import { CONTENT_RULES } from "./rules";

const HOUR = 3_600_000;

/** The fixed lines, as the planner reads them. They hold whatever the settings say. */
const LINES = `- No invented crimes, corruption, abuse or illness by or of real named people. A scandal about a real figure is non-criminal: a leaked memo, a hot mic, a deal exposed, hypocrisy laid bare. A criminal scandal centres on invented people or organisations.
- No invented results of real elections, and no claim that one was stolen or rigged. An invented contest (a leadership race, a board fight, a union vote) is fine.
- No wars, terror attacks or mass violence.
- No deaths of real named people, ever, and no jokes at victims' expense.
- The content rules below apply in full.`;

let arcSystemCache: string | null = null;

export function arcSystem(): string {
  arcSystemCache ??= `You plan major events for Tangents, a satirical social network that looks and works like X. One real person reads it. Every other account is written by model calls: famous figures, news outlets, official accounts and a crowd of ordinary people. The world is seeded by real headlines, heightened one notch, played completely straight, and it remembers everything.

A major event is the biggest thing to happen in this world for a while: a scandal that breaks, a national story, or a global event. You write no posts. You write the plan the director (who writes every beat) will follow over the coming hours: the event, where it comes from, how it builds, how it breaks and everything it leads to. The plan is private. No account knows it exists, and the reader never sees it.

# Where it comes from

The event must come out of what is already on the record, and it must change it. Read the world state in the message: the open storylines, the earlier stories, the relationships, the facts ledger, what is coming due, the scoreboard, the slate, the markets and the real headlines. Find the thread that could plausibly lead to something this size: a feud that has been building, a deal that looked too good, a promise coming due, a company under strain, a politician cornered, a rumour nobody followed up. Name what it grows out of in grows_from, by the numbers the message gives (#12 for an open storyline, E2 for an earlier story, R3 for a relationship, F5 for a fact), at least one of them, and say in connection how the event follows from them. Use the real people, companies and outlets in the cast. Invent the rest (a whistleblower, a contractor, a regulator's report, a small firm) only where a real story would name someone like that.

# How it builds

Big stories rarely come from nowhere. Before most of them there are murmurs: an insider "hearing things", an official account that goes quiet or posts something oddly bland, a small wire item, a share price drifting for no stated reason, a rumour account connecting the wrong dots. Then it breaks, all at once. Then the fallout, which is most of the story: the effects travelling out from the people at the centre across every part of the world. Then it winds down: settled, investigated, priced in, mocked, remembered.

phases has one entry per phase, in order: murmurs, break, fallout, resolution. happens is what happens in that phase, in two or three sentences. unsaid is what nobody may say yet in that phase: for murmurs, the event itself, the names at its centre and anything that would let a reader guess it; for the later phases, whatever has not come out yet, or nothing. beats is how many beats the phase takes, within the range the message gives.

# What it leads to

consequences is the fallout, in the order it plays out. Each one hits something specific in this world: a share price (hits names the ticker), a game on the scoreboard (hits names the game), a project on the slate (hits names its number and title), a politician, a company or a famous figure (hits names the account), or the crowd (ordinary people: a boycott, a run on something, a trend, a walkout). what says what happens to it, in one or two sentences, by ordinary cause and effect. from is 0 when it follows directly from the event, and the n of an earlier consequence when it follows from that one: the best fallout chains, so a second-order effect leads to a third. Spread the consequences across every subject the message lists, as many per subject as it asks, each in that subject's own world (a fixture, an album, a game launch, a vote, a stock). A consequence that touches a game never changes its score, its result or whether it is played: the scoreboard is canon. Nothing touches a subject the message does not list.

# Lines that hold whatever the settings say

These come before everything else, including the reader's settings and the scale you are asked for:
${LINES}

Check the plan against every line before you answer. Set lines_kept to true only if it keeps all of them. If no event of the kind and scale asked for can keep them, set lines_kept to false: a plan that breaks a line is refused, whatever else it does well.

# Tone

Played straight, as everything here is. The event is one notch beyond what is likely, never three: it could be reported tomorrow. Outlets report it soberly, famous accounts behave exactly as they really would, and the reader is a bystander: never part of the event, its cause or its consequences.

# Content rules

${CONTENT_RULES}

# The cast

Famous figures and commentators:
${castIndex(FIGURES)}

News outlets:
${castIndex(OUTLETS)}

Official accounts of companies and government bodies:
${castIndex(ORGS)}`;
  return arcSystemCache;
}

const SCALE_ASK: Record<ArcScale, string> = {
  scandal:
    "a scandal: something that breaks in a day and dominates the conversation while it lasts. It may break at once, with no murmurs, or after a single beat of them.",
  national:
    "a national story: something that dominates a country's news for days and reaches well beyond the people at its centre. It builds for a few beats before it breaks.",
  global:
    "a global event: something the whole world has to answer at once, every market and every government. It builds over several beats before it breaks.",
};

const KIND_ASK: Record<ArcKind, string> = {
  scandal: "scandal: a scandal or leak (a leaked memo or recording, a hot mic, a hidden deal or conflict of interest exposed, hypocrisy laid bare, a cover-up)",
  business: "business: a business or market shock (a collapse, a hostile bid, a blocked merger, a profit warning, a run on a bank or a token, an outage that stops an industry, a recall)",
  politics: "politics: politics or unrest (protests and strikes, a government crisis, a resignation, a confidence vote, a leadership contest, a summit walkout)",
  disaster: "disaster: a disaster or emergency (a storm, flood, wildfire, earthquake, eruption, blackout or industrial accident, and the emergency response)",
  world: "world: a world-scale crisis (something every country must answer at once: a global financial panic, a worldwide cyber outage, a solar storm, a supply shock, a pandemic scare)",
};

export function casualtiesLine(on: boolean): string {
  return on
    ? "Casualties and deaths: on. Where the event would really cause them, outlets and officials may report figures for the dead and injured, soberly and without names; nobody else adds numbers, and nobody jokes about victims."
    : "Casualties and deaths: off. Nobody is reported dead or injured, in any number, by anyone. A disaster or emergency is told through evacuations, damage, closures, outages and disruption.";
}

export interface ArcPlanInput {
  digest: WorldDigest;
  scale: ArcScale;
  kinds: ArcKind[];
  subjects: Subject[];
  perSubject: [number, number];
  murmurs: [number, number];
  resolution: [number, number];
  casualties: boolean;
  /** Why the last plan was refused, when this is a second try. */
  retry?: string | null;
}

/** The numbered things on the record a plan may grow out of: facts, relationships and earlier stories by position. */
export function arcRefs(d: WorldDigest): Map<string, { text: string; storylineId: number | null }> {
  const refs = new Map<string, { text: string; storylineId: number | null }>();
  for (const s of d.storylines) refs.set(`#${s.id}`, { text: `storyline #${s.id} ${JSON.stringify(s.title)}`, storylineId: s.id });
  d.earlierStories.forEach((s, i) => refs.set(`E${i + 1}`, { text: `the earlier story ${JSON.stringify(s.title)}`, storylineId: null }));
  d.relationships.forEach((r, i) =>
    refs.set(`R${i + 1}`, { text: `@${r.a} and @${r.b} (${r.score > 0 ? "+" : ""}${r.score}: ${r.note})`, storylineId: null }),
  );
  d.facts.forEach((f, i) => refs.set(`F${i + 1}`, { text: f.text, storylineId: null }));
  return refs;
}

const range = ([lo, hi]: [number, number]) => (lo === hi ? `${lo}` : `${lo} to ${hi}`);

export function arcUser(p: ArcPlanInput): string {
  const d = p.digest;
  const out: string[] = [`TIME: ${d.simTime}`];
  out.push(
    d.storylines.length
      ? `OPEN STORYLINES:\n${d.storylines
          .map((s) =>
            [
              `#${s.id} ${JSON.stringify(s.title)} [${s.domain}, heat ${s.heat}, ${s.beats} beats, began ${s.hoursSinceStart < 1 ? "under an hour ago" : ago(s.hoursSinceStart * HOUR)}${s.parentId ? `, spun off from #${s.parentId}` : ""}]`,
              `  ${s.summary}`,
              `  Involved: ${s.participants.map((h) => "@" + h).join(", ") || "nobody yet"}`,
            ].join("\n"),
          )
          .join("\n")}`
      : "OPEN STORYLINES: none.",
  );
  if (d.earlierStories.length) {
    out.push(
      `EARLIER STORIES:\n${d.earlierStories
        .map((s, i) => `E${i + 1}. ${JSON.stringify(s.title)} [${s.beats} beats, ended ${s.daysSinceEnd < 1 ? "today" : `${s.daysSinceEnd}d ago`}] ${s.summary}`)
        .join("\n")}`,
    );
  }
  if (d.relationships.length) {
    out.push(
      `RELATIONSHIPS (-10 open war, +10 inseparable):\n${d.relationships
        .map((r, i) => `R${i + 1}. @${r.a} / @${r.b}: ${r.score > 0 ? "+" : ""}${r.score}. ${r.note}`)
        .join("\n")}`,
    );
  }
  if (d.facts.length) {
    out.push(
      `FACTS LEDGER (canon):\n${d.facts.map((f, i) => `F${i + 1}. (${f.daysAgo < 1 ? "today" : `${f.daysAgo}d ago`}) ${f.text}`).join("\n")}`,
    );
  }
  if (d.comingDue.length) out.push(`COMING DUE:\n${d.comingDue.map((f) => `- ${f.text}`).join("\n")}`);
  if (d.timeline.length) out.push(`RECENT TIMELINE (newest first):\n${d.timeline.slice(0, 10).map(fmtPost).join("\n")}`);
  if (d.headlines.length) {
    out.push(`REAL HEADLINES (the real world right now):\n${d.headlines.map((h) => `- [${h.domain}] ${h.title} (${h.source})`).join("\n")}`);
  }
  if (d.stocks.length) {
    out.push(`MARKETS: ${d.stocks.map((s) => `${s.ticker} ${s.price < 1 ? s.price.toFixed(4) : s.price.toFixed(2)} (${s.changePct >= 0 ? "+" : ""}${s.changePct.toFixed(1)}% today)`).join(", ")}`);
  }
  const sb = d.scoreboard;
  const games = [
    ...sb.live.map((g) => `- Game ${g.id} (live): ${g.competition} · ${g.title} · ${g.score} · ${g.clock}`),
    ...sb.upcoming.map((g) => `- ${g.startsAt}: ${g.competition} · ${g.title}`),
    ...sb.finals.map((g) => `- Final: ${g.competition} · ${g.title}: ${g.score}`),
  ];
  if (games.length) out.push(`SCOREBOARD (canon):\n${games.join("\n")}`);
  out.push(...slateSection(d.slate, false));

  const subjects = p.subjects.map((s) => `${s} (${SUBJECT_INFO[s].name})`).join(", ");
  out.push(
    [
      `THE EVENT TO PLAN: ${SCALE_ASK[p.scale]}`,
      `Kind: choose the one that grows most naturally out of the record, from these, which are all the reader allows:\n${p.kinds.map((k) => `- ${KIND_ASK[k]}`).join("\n")}`,
      `Beats per phase: murmurs ${range(p.murmurs)}; break 1; fallout one beat for every one or two consequences; resolution ${range(p.resolution)}.`,
      `Consequences: ${range(p.perSubject)} in each of these subjects, the ones the reader has turned on: ${subjects}. None in any other subject.`,
      casualtiesLine(p.casualties),
      p.retry ? `Your last plan was refused: ${p.retry}. Plan again and fix that.` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  );
  return out.join("\n\n");
}

// ------------------------------------------------------------ the ARC section

const SCALE_NAME: Record<ArcScale, string> = { scandal: "a scandal", national: "a national story", global: "a global event" };
const KIND_NAME: Record<ArcKind, string> = {
  scandal: "scandal or leak", business: "business or market shock", politics: "politics or unrest",
  disaster: "disaster or emergency", world: "world-scale crisis",
};
const TARGET_NAME: Record<ArcTarget, string> = {
  share_price: "share price", fixture: "a game", project: "a project", politician: "a politician",
  company: "a company", figure: "a famous figure", crowd: "ordinary people",
};

function fmtConsequence(c: ArcConsequence): string {
  return `- ${c.n}. [${c.subject}] ${c.hits} (${TARGET_NAME[c.target]}), ${c.from === 0 ? "from the event" : `from ${c.from}`}: ${c.what}`;
}

function phaseGuide(a: DigestArc): string {
  const sl = a.storylineId != null ? `#${a.storylineId}` : "the event's storyline";
  const guide: Record<ArcPhase, string> = {
    murmurs: `Murmurs: nothing has broken yet. Write this beat as the PACING line asks, on its own storyline or the everyday posts, and plant one or two oblique signs of what is coming through channels that exist on this site: an insider who is "hearing things", an official account that goes quiet or posts something oddly bland, a small wire item from an outlet, a share price that drifts a point or two with a vague reason (stock_moves), or, through crowd_brief, one rumour account in the crowd connecting the wrong dots. Nobody names the event, and no sign is plain enough for a reader to say what is coming. Do not open a storyline for it, and record no fact that gives it away.`,
    break: `The break: it happens on this beat. Open a new storyline for it (kind new_event, storyline_id null, headline_id null) with a page from the outlet or official account that would really break it, reported as straight as the biggest story of the year: what happened, who is involved, what is known and what is not. The posts are the first hour: the people at the centre, the reporters, the first reactions. Signs planted earlier may now be pointed back to. The consequences come on later beats. This takes priority over the PACING line and any GAME NIGHT line.`,
    fallout: `Fallout: the event is out and the world is dealing with it. Work through the consequences below in the order given, the one or two named for this beat, each following by ordinary cause and effect from what it says it follows from. Show each on screen in the posts and record it: a fact for the ledger, a stock move where a share price is hit, a relationship where one changes. A consequence that touches a game plays out around the game, never in its score, its result or whether it is played; one that touches a project on the slate is told in the posts and the facts, without the project field. A consequence big enough to run on its own opens its own storyline as a spinoff with parent_storyline_id ${a.storylineId ?? "set to the event's storyline"}; otherwise advance ${sl}, or use kind crossover for the open storyline it lands in. This takes priority over the PACING line and any GAME NIGHT line.`,
    resolution: `Resolution: wind it down the way such stories end: the official response settles, an inquiry or a date is set, markets steady, someone resigns or digs in, people move on with their grudges kept. Kind advance on ${sl} or one of its spin-offs. Leave what remains as facts; nothing new of this size starts. This takes priority over the PACING line.${a.beat >= a.beats ? " This is its last beat: let the summary record how it ended." : ""}`,
  };
  return guide[a.phase];
}

/** The private ARC section of the director's message, or nothing when no major event is under way. */
export function arcSection(a: DigestArc | null): string[] {
  if (!a) return [];
  const lines = [
    "ARC (private: a major event this world is building towards, planned in advance. No account knows this section exists. Never quote it, and never let anyone know more than the current phase allows.)",
    `The event: ${a.event}`,
    `It is ${SCALE_NAME[a.scale]}, a ${KIND_NAME[a.kind]}. It grows out of: ${a.roots.map((r) => r.replace(/[.\s]+$/, "")).join("; ") || "the world as it stands"}. ${a.connection}`.trim(),
    `Phase: ${a.phase}, beat ${a.beat} of ${a.beats}.${a.storylineId != null ? ` The event's storyline is #${a.storylineId}.` : ""}`,
    phaseGuide(a),
    a.happens ? `In this phase: ${a.happens}` : "",
    a.unsaid ? `Not to be said yet: ${a.unsaid}` : "",
  ];
  if (a.pending.length) {
    const list = a.pending.map(fmtConsequence).join("\n");
    if (a.phase === "murmurs" || a.phase === "break") {
      lines.push(`What it will lead to, on later beats (do not play these yet):\n${list}`);
    } else if (a.phase === "fallout") {
      lines.push(`Consequences still to play, in order:\n${list}`);
      if (a.thisBeat.length) lines.push(`On this beat, play ${a.thisBeat.join(" and ")}.`);
    } else {
      lines.push(`Never played:\n${list}\nFold one in only where it fits the wind-down; otherwise let it go.`);
    }
  }
  lines.push(
    casualtiesLine(a.casualties),
    "The lines hold on every beat of it: no wars, terror attacks or mass violence; nothing criminal, corrupt, abusive or medical invented about a real named person; no invented results of real elections and no claim that one was stolen or rigged; no deaths of real named people, and no jokes at victims' expense.",
  );
  return [lines.filter(Boolean).join("\n")];
}
