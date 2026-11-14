// Output schemas for the two model calls made on every tick.
// FROZEN after phase 1. The simulation engine consumes these shapes and
// src/lib/prompts/ explains them to the models.
import { z } from "zod";

const DOMAIN = z.enum(["tech", "pop", "politics", "sports", "crossover"]);
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
    .describe("A ticker to attach a price chart to, for a post about that price; otherwise null"),
  poll: z
    .array(z.string())
    .nullable()
    .describe("2 to 4 short options if this post is a poll, as that account would really run one; otherwise null"),
});

export const RepostSchema = z.object({
  account: z.string().describe("Handle of the cast account that reposts, without the @"),
  of: REF.describe("Ref of the post it shares"),
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
      text: z.string().describe("At most 280 characters"),
      reply_to: REF.nullable(),
      quote_of: REF.nullable(),
      heat: z.number().int().describe("1 to 10"),
      style: STYLE.describe("What this post is doing: the kind of joke, the kind of remark, or plain"),
      gif: z.string().nullable().describe("A two to four word GIF search phrase, or null"),
      meme: z
        .object({
          template: z.string().describe("A template id from the list"),
          top: z.string(),
          bottom: z.string(),
        })
        .nullable(),
      tier_list: z
        .array(
          z.object({
            label: z.string().describe("The tier's name, one to three words"),
            members: z.array(z.string()).describe("Handles of famous accounts placed in this tier"),
          }),
        )
        .nullable()
        .describe("A tier list ranking famous accounts, best tier first, or null"),
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
export type DeskOutput = z.infer<typeof DeskSchema>;
export type CrowdOutput = z.infer<typeof CrowdSchema>;
