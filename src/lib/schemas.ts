// Output schemas for the two model calls made on every tick.
// FROZEN after phase 1. The simulation engine consumes these shapes and
// src/lib/prompts.ts explains them to the models.
import { z } from "zod";

const DOMAIN = z.enum(["tech", "pop", "politics", "crossover"]);
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
      outlet: z.string().describe("Outlet handle without the @"),
      headline: z.string(),
      dek: z.string().describe("One-sentence standfirst"),
      body: z.string().describe("3 to 4 paragraphs separated by blank lines"),
      post_text: z.string().describe("The outlet's post announcing the story"),
    })
    .nullable(),
  posts: z.array(NewPostSchema).describe("3 to 5 posts by accounts from the cast"),
  reposts: z
    .array(RepostSchema)
    .describe("0 to 3 plain reposts: a cast account sharing someone else's post without comment"),
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
    }),
  ),
});
export type CrowdOutput = z.infer<typeof CrowdSchema>;
