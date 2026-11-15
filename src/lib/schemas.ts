// Output schemas for the two model calls made on every tick.
// The simulation engine consumes these shapes and
// src/lib/prompts/ explains them to the models.
import { z } from "zod";
import { DOMAINS, type Domain } from "./subjects";
import { ARC_KINDS, ARC_TARGETS } from "./types";

const DOMAIN = z.enum(DOMAINS as [Domain, ...Domain[]]);
const TONE = z.enum([
  "feud",
  "drama",
  "hype",
  "wholesome",
  "shitpost",
  "business",
  "gossip",
  "meltdown",
]);

/** What a reply is doing: a kind of humour, a kind of remark, or neither. */
const STYLE = z.enum([
  "deadpan", "sarcasm", "absurd", "wordplay", "roast", "selfdeprecating", "online", "wholesome",
  "expert", "eyewitness", "question", "contrarian", "pedant", "fan", "complaint", "plain",
]);

/** A reference to a post. "p123" is an existing post (id 123). "n1", "n2"...
 *  are new posts in the same response. "a1" is the outlet post that carries
 *  the article in the same response. */
const REF = z.string();

/** Only for a post not written in English; English posts leave both keys out. */
const TRANSLATION = {
  language: z.string().nullish().describe('Language of the post in English, e.g. "Portuguese"; leave out for English'),
  translation: z.string().nullish().describe("Natural English translation of the post; leave out for English"),
};

export const NewPostSchema = z.object({
  ref: z.string().describe('Local id for this new post: "n1", "n2", ...'),
  author: z.string().describe("Handle without the @"),
  text: z.string().describe("The post, at most 280 characters"),
  reply_to: REF.nullable().describe("Ref of the post this replies to, or null"),
  quote_of: REF.nullable().describe("Ref of the post this quotes, or null"),
  heat: z.number().int().describe("1 (ignored) to 10 (breaks the internet)"),
  chart: z
    .string()
    .nullable()
    .catch(null)
    .describe("A ticker to attach a price chart to, for a post about that price; otherwise null"),
  poll: z
    .array(z.string())
    .nullable()
    .catch(null)
    .describe("2 to 4 short options if this post is a poll, as that account would really run one; otherwise null"),
  meme: z
    .object({
      template: z.string().describe("A template id from the list"),
      top: z.string(),
      bottom: z.string(),
    })
    .nullish()
    .catch(null)
    .describe("An image meme, { template, top, bottom }, only for the accounts the instructions name; otherwise leave out"),
  ...TRANSLATION,
});

export const RepostSchema = z.object({
  account: z.string().describe("Handle of the cast account that reposts, without the @"),
  of: REF.describe("Ref of the post it shares"),
});

/** The director's lever on the slate (slate.ts applyProject checks and stores it).
 *  Every field is required but nullable, so the whole object is one optional field. */
export const ProjectSchema = z.object({
  slate_number: z.number().int().nullable().describe("The project's number on the SLATE to move it on, or null to announce a new one"),
  happened: z
    .string()
    .describe('What happened, in a few words: "announced", "Zendaya joins the cast", "director exits", "dated for 14 August", "opened to $41 million"'),
  kind: z.enum(["film", "series", "album", "tour", "game"]).nullable().describe("A new project's kind; null on an update"),
  title: z.string().nullable().describe("A new project's title; null on an update"),
  maker: z
    .string()
    .nullable()
    .describe("A new project: the studio, platform, label or publisher making it, by name, or by handle when it is in the cast; null on an update"),
  logline: z.string().nullable().describe("A new project: one sentence on what it is; null on an update"),
  people: z
    .array(
      z.object({
        name: z.string().describe("The name as it would be billed"),
        handle: z.string().nullable().describe("Their handle when they are in the cast, otherwise null"),
        role: z.string().describe('A word or two: "star", "director", "writer", "artist", "featured artist", "host"'),
      }),
    )
    .nullable()
    .describe("People attached on this beat, top billing first; null if nobody joins"),
  leaving: z.array(z.string()).nullable().describe("Names or handles of people who leave the project on this beat; otherwise null"),
  status: z
    .enum(["announced", "in_production", "dated", "released", "delayed", "cancelled"])
    .nullable()
    .describe("Its status after this beat, or null if unchanged"),
  release: z
    .string()
    .nullable()
    .describe('Its release date as free text ("Summer 2027", "14 August 2027") when stated or changed on this beat; otherwise null'),
  figure: z
    .string()
    .nullable()
    .describe('A number stated on this beat, fixed from then on: "opened to $41 million", "sold 1.2 million copies in its first week"; otherwise null'),
  tagline: z.string().nullable().describe("A film's or series' poster tagline, when it has one; otherwise null"),
  stops: z
    .array(z.object({ city: z.string(), date: z.string().describe('"14 Mar"') }))
    .nullable()
    .describe("A tour: up to 12 cities with dates, in order; otherwise null"),
  platforms: z.string().nullable().describe('A game: "PS5, Xbox Series X|S, PC"; otherwise null'),
  card: z
    .enum(["title_card", "poster"])
    .nullable()
    .describe("A film or series: draw a title card (little known yet) or a poster (a cast or a date); null for other kinds"),
  card_on: z
    .string()
    .nullable()
    .describe('Ref of the post in this response that carries the drawn card ("a1", "n2", "e1"), or null for none'),
});

export const DirectorSchema = z.object({
  beat: z.object({
    kind: z.enum(["new_event", "advance", "spinoff", "crossover", "user_reaction"]),
    storyline_id: z
      .number()
      .int()
      .nullable()
      .describe("Existing storyline this beat advances, or null to open a new one"),
    parent_storyline_id: z
      .number()
      .int()
      .nullable()
      .describe("For a new storyline that spins off an existing one, the parent id"),
    headline_id: z
      .number()
      .int()
      .nullable()
      .describe("The real headline this beat dramatises, if any"),
    event: z
      .string()
      .describe("What happened on this beat, as one plain past-tense sentence for a log of events, under 160 characters"),
    title: z.string().describe("Storyline title, under 70 characters"),
    summary: z
      .string()
      .describe("Running summary of the whole storyline so far, 2 to 4 sentences"),
    domain: DOMAIN,
    tone: TONE,
    topics: z.array(z.string()).describe("2 to 4 lowercase topic tags"),
    heat: z.number().int().describe("1 to 10"),
  }),
  article: z
    .object({
      outlet: z.string().describe("Handle of the publishing account, without the @: an outlet, or an official account for its own announcement"),
      kind: z
        .enum(["article", "press_release", "blog", "statement"])
        .describe("article for an outlet; press_release, blog or statement for an official account"),
      headline: z.string(),
      dek: z.string().describe("One-sentence standfirst"),
      body: z.string().describe("3 to 4 paragraphs separated by blank lines"),
      post_text: z.string().optional().describe("The publishing account's post linking to the page"),
    })
    .nullable(),
  posts: z.array(NewPostSchema).describe("3 to 5 posts by accounts from the cast"),
  top_reply: z
    .object({
      author: z.string().describe("Handle of one of the ordinary accounts listed in the message"),
      reply_to: REF.describe("Ref of the post in this response that it answers"),
      text: z.string().describe("The reply, at most 200 characters"),
      style: z.string().optional().describe("Its kind of humour or remark, one word"),
      ...TRANSLATION,
    })
    .nullable()
    .describe("The one reply from an ordinary account that goes bigger than the post it answers, or null"),
  everyday: z
    .array(NewPostSchema)
    .describe('Routine posts unrelated to the beat, refs "e1", "e2", ...; only as many as the message asks for, otherwise empty'),
  reposts: z
    .array(RepostSchema)
    .describe("0 to 3 plain reposts: a cast account sharing someone else's post without comment"),
  notes: z
    .array(
      z.object({
        of: REF.describe("Ref of the post the note sits under"),
        text: z.string().describe("The note: one or two neutral sentences of correcting context"),
      }),
    )
    .describe("0 or 1 Community Notes"),
  relationships: z.array(
    z.object({
      a: z.string(),
      b: z.string(),
      delta: z.number().int().describe("-3 to +3"),
      note: z.string().describe("One line: why it moved"),
    }),
  ),
  facts: z.array(
    z.object({
      text: z.string().describe("A durable fact to remember, one sentence"),
      subjects: z.array(z.string()).describe("Handles the fact is about"),
      due_in_days: z
        .number()
        .nullish()
        .describe("Only for a promise, bet, deadline, announced date or prediction: days from now until it falls due (0.5 for later today, 7 for a week). Leave out for every other fact"),
    }),
  ),
  stock_moves: z.array(
    z.object({
      ticker: z.string(),
      pct: z.number().describe("Signed percentage move, e.g. -4.2"),
      reason: z.string().describe("Short reason, under 80 characters"),
    }),
  ),
  trends: z.array(
    z.object({
      label: z.string().describe('A hashtag or short phrase, e.g. "#MetGala" or "Zuck"'),
      category: z.string().describe('e.g. "Technology · Trending"'),
    }),
  ),
  crowd_brief: z
    .string()
    .describe("One or two sentences telling the crowd writer what people are reacting to"),
  user_follower_delta: z
    .number()
    .int()
    .describe("Followers the user gains from this beat; 0 unless the beat involves them"),
  game_event: z
    .object({
      game: z.number().int().describe("The number of a live game on the SCOREBOARD"),
      team: z.string().describe("The team it is for, as the scoreboard names it; in a race, the driver's surname"),
      points: z
        .number()
        .int()
        .describe("Basketball: a scoring run of 4 to 12 points. American football: 3 (field goal), 6, 7 or 8 (touchdown) or 2 (safety). Football: 1 (a goal). A race: places the driver gains (1 to 3) or loses (-1 to -6)"),
      label: z.string().describe('A few words for the play-by-play, e.g. "12-0 run", "pick-six", "late winner", "safety car"'),
    })
    .nullish()
    .describe("Optional: something that happens in a live game on this beat. Leave it out on most beats"),
  project: ProjectSchema.nullish().describe(
    "Optional: announce a new film, series, album, tour or game, or move one on the SLATE forward. Leave it out on most beats",
  ),
});
export type DirectorOutput = z.infer<typeof DirectorSchema>;

/** Everyday posts between story beats. */
export const AmbientSchema = z.object({
  posts: z.array(NewPostSchema).describe("Routine posts by accounts from the cast"),
  reposts: z.array(RepostSchema).describe("0 to 2 plain reposts"),
});
export type AmbientOutput = z.infer<typeof AmbientSchema>;

export const CrowdSchema = z.object({
  posts: z.array(
    z.object({
      author: z.string().describe("Handle of an ordinary account, without the @"),
      // Ahead of the text on purpose: a writer that names the length first keeps to it.
      length: z
        .enum(["few", "line", "full", "long"])
        .catch("line")
        .describe("Decided before the text is written: few (2 to 6 words), line (one line of 7 to 14 words), full (a sentence or two, 15 to 35 words), long (over 40 words)"),
      text: z.string().describe("At most 280 characters"),
      reply_to: REF.nullable(),
      quote_of: REF.nullable(),
      heat: z.number().int().describe("1 to 10"),
      ...TRANSLATION,
      // A wrong value in any of the next four falls back instead of failing the batch.
      style: STYLE.catch("plain").describe("What this post is doing: the kind of joke, the kind of remark, or plain"),
      gif: z.string().nullable().catch(null).describe("A two to four word GIF search phrase, or null"),
      meme: z
        .object({
          template: z.string().describe("A template id from the list"),
          top: z.string(),
          bottom: z.string(),
        })
        .nullable()
        .catch(null)
        .describe("An image meme: { template, top, bottom }, or null"),
      tier_list: z
        .array(
          z.object({
            label: z.string().describe("The tier's name, one to three words"),
            members: z.array(z.string()).describe("Handles of famous accounts placed in this tier"),
          }),
        )
        .nullable()
        .catch(null)
        .describe("A tier list ranking famous accounts, best tier first: [{ label, members: [handles] }], or null"),
    }),
  ),
});

/** One answer from Brok, the site's assistant. */
export const BrokSchema = z.object({
  text: z.string().describe("The answer, plain text"),
});

/** The rest of a thread whose first post is already published. */
export const ThreadSchema = z.object({
  posts: z.array(z.string()).describe("The 1 to 3 posts that follow the opening post, in order"),
});

/** The page behind a link in a post that is already published. */
export const PageSchema = z.object({
  kind: z
    .enum(["article", "press_release", "blog", "statement"])
    .describe("article for an outlet; blog, press_release or statement for an official account, whichever the post implies"),
  headline: z.string().describe("The page's title, as that site would write it"),
  dek: z.string().describe("One-sentence standfirst"),
  body: z.string().describe("2 to 4 short paragraphs separated by blank lines; steps as numbered lines"),
});

/** The news desk: how each fresh real headline relates to this world. */
export const DeskSchema = z.object({
  items: z.array(
    z.object({
      id: z.number().int().describe("The headline's number"),
      relation: z
        .enum(["new", "continues", "conflicts", "skip"])
        .describe("new: unrelated to this world so far. continues: a development in an open storyline. conflicts: contradicts something established here. skip: unusable"),
      storyline_id: z.number().int().nullable().describe("For continues or conflicts: the storyline concerned"),
      premise: z
        .string()
        .describe("The headline as it would read in this world: unchanged if new, adapted to fit established facts otherwise. One sentence."),
    }),
  ),
});
export type CrowdOutput = z.infer<typeof CrowdSchema>;

/** A major event's plan (sim/arc.ts checks it and stores what passes). */
export const ArcPlanSchema = z.object({
  lines_kept: z.boolean().describe("True only if the plan keeps every one of the fixed lines"),
  kind: z.enum(ARC_KINDS).describe("One of the kinds the message allows"),
  event: z.string().describe("The event in one plain sentence, as it will be reported when it breaks"),
  grows_from: z
    .array(z.string())
    .describe('What on the record it grows out of, by the numbers the message gives: "#12", "E2", "R3", "F5"'),
  connection: z.string().describe("One or two sentences on how the event follows from those"),
  phases: z
    .array(
      z.object({
        phase: z.enum(["murmurs", "break", "fallout", "resolution"]),
        happens: z.string().describe("What happens in this phase, two or three sentences"),
        unsaid: z.string().describe("What nobody may say yet in this phase; empty if nothing"),
        beats: z.number().int().describe("How many beats it takes, within the range the message gives"),
      }),
    )
    .describe("One entry per phase, in order: murmurs, break, fallout, resolution"),
  consequences: z
    .array(
      z.object({
        n: z.number().int().describe("1, 2, 3... in the order they play out"),
        subject: DOMAIN.catch("crossover").describe("The subject it belongs to: one the message lists"),
        target: z.enum(ARC_TARGETS).catch("crowd").describe("What kind of thing it hits"),
        hits: z.string().describe('Exactly what it hits: a ticker, a game, a project by number and title, an account by handle, or a group of ordinary people'),
        what: z.string().describe("What happens to it, one or two sentences"),
        from: z.number().int().describe("0 if it follows directly from the event; otherwise the n of the earlier consequence it follows from"),
      }),
    )
    .describe("The fallout, in the order it plays out"),
});
export type ArcPlanOutput = z.infer<typeof ArcPlanSchema>;
