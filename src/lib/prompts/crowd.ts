// The crowd writer: what ordinary accounts say under the famous ones' posts.
//
// The system prompt is built once and caches; the accounts online for a batch,
// the posts to answer and the reader's settings go in the user message.
import { CROWD, FIGURES, ORGS, OUTLETS, type CastMember } from "../cast";
import { SPAM_HANDLES } from "../crowd";
import { db, now } from "../db";
import { MEME_TEMPLATES } from "../media";
import { CROWD_VOICES } from "../personas";
import { getSettings } from "../settings";
import { volumes } from "../usage";
import type { DigestPost, Domain, Level, TasteSummary, Tone } from "../types";
import { crowdDials, mutedDomains } from "./dials";
import { ago, fmtPost, fmtTaste } from "./format";
import { CONTENT_RULES, POST_CRAFT } from "./rules";

export interface CrowdInput {
  beat: { kind: string; title: string; summary: string; domain: Domain; tone: Tone };
  /** The director's note on what people are reacting to. */
  brief: string;
  /** Posts the crowd may reply to or quote, each with a real "p123" ref. */
  posts: DigestPost[];
  /** Earlier replies from ordinary accounts in the same story, which the crowd may answer. */
  earlier?: DigestPost[];
  /** Combined cycle: routine posts written alongside the beat, and how many of
   *  the crowd's posts belong to that side of the timeline. */
  everyday?: DigestPost[];
  everydayCount?: number;
  /** Accounts that have already replied under the post being answered, and stay out of this batch. */
  exclude?: string[];
  user: { handle: string; name: string } | null;
  /** Set when the crowd should pile onto the user's post (its "p123" ref). */
  userPostRef: string | null;
  taste: TasteSummary;
  /** How many posts to write. */
  count: number;
  /** The media this batch carries, decided by the engine. */
  media?: MediaPlan;
  /** One line per game in play (sports.ts crowdScoreLines), so replies quote the right score. */
  games?: string[];
  /** The storyline this batch belongs to, if any: its age, and what each account said in it before. */
  storylineId?: number | null;
}

/** How many GIFs and memes a batch carries, and whether one account posts a tier list. */
export interface MediaPlan {
  gifs: number;
  memes: number;
  tierList: boolean;
  /** Famous accounts the tier list may rank, when there is one. */
  tierHandles?: string[];
}

/** The MEDIA line of the message. */
function mediaLine(plan: MediaPlan): string {
  const parts = [
    plan.gifs ? `${plan.gifs} GIF${plan.gifs > 1 ? "s" : ""}` : null,
    plan.memes ? `${plan.memes} meme${plan.memes > 1 ? "s" : ""}` : null,
  ].filter(Boolean);
  const tier = plan.tierList ? "one account posts a tier list" : null;
  if (!parts.length && !tier) return "MEDIA in this batch: none.";
  const line = `MEDIA in this batch: ${parts.join(", ")}${parts.length && tier ? ", and " : ""}${tier ?? ""}.`;
  return plan.tierList && plan.tierHandles?.length
    ? `${line}\nFamous accounts in this story, for the tier list to rank: ${plan.tierHandles.map((h) => "@" + h).join(", ")}.`
    : line;
}

/** The last two things each of these accounts posted, shortened, keyed by lowercased handle. */
function recentLines(handles: string[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  if (!handles.length) return out;
  const find = db().prepare("SELECT text FROM posts WHERE author = ? AND deleted = 0 ORDER BY id DESC LIMIT 2");
  for (const h of handles) {
    const rows = find.all(h) as { text: string }[];
    if (rows.length) out.set(h.toLowerCase(), rows.map((r) => (r.text.length > 110 ? `${r.text.slice(0, 110)}…` : r.text)));
  }
  return out;
}

const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

/** What each of these accounts last said in this storyline before now, shortened, with how long ago. */
function storyLines(handles: string[], storylineId: number, t: number): Map<string, { text: string; ago: string }> {
  const out = new Map<string, { text: string; ago: string }>();
  const find = db().prepare(
    `SELECT text, created_at FROM posts WHERE author = ? AND storyline_id = ? AND deleted = 0 AND created_at <= ?
     ORDER BY created_at DESC, id DESC LIMIT 1`,
  );
  for (const h of handles) {
    const row = find.get(h, storylineId, t) as { text: string; created_at: number } | undefined;
    if (row) out.set(h.toLowerCase(), { text: short(row.text, 110), ago: ago(t - row.created_at) });
  }
  return out;
}

/** Each account's last exchange with the user, either way round (one replied to
 *  the other), as one line: who said what, then the answer. Only when the user's
 *  post is being answered or the user has replied to an ordinary account before. */
function readerHistory(handles: string[], user: string, answering: boolean, t: number): Map<string, string> {
  const out = new Map<string, string>();
  const conn = db();
  const known =
    answering ||
    !!conn
      .prepare(
        `SELECT 1 FROM posts r JOIN posts p ON p.id = r.reply_to JOIN accounts a ON a.handle = p.author
         WHERE r.author = ? AND a.kind = 'crowd' AND r.deleted = 0 AND r.created_at <= ? LIMIT 1`,
      )
      .get(user, t);
  if (!known) return out;
  const find = conn.prepare(
    `SELECT p.author AS first, p.text AS said, r.author AS second, r.text AS answer, r.created_at AS at
     FROM posts r JOIN posts p ON p.id = r.reply_to
     WHERE r.deleted = 0 AND p.deleted = 0 AND r.created_at <= ?
       AND ((r.author = ? AND p.author = ?) OR (r.author = ? AND p.author = ?))
     ORDER BY r.created_at DESC, r.id DESC LIMIT 1`,
  );
  for (const h of handles) {
    const x = find.get(t, h, user, user, h) as { first: string; said: string; second: string; answer: string; at: number } | undefined;
    if (x) {
      out.set(
        h.toLowerCase(),
        `${ago(t - x.at)}, @${x.first}: ${JSON.stringify(short(x.said, 90))} / @${x.second} replied: ${JSON.stringify(short(x.answer, 90))}`,
      );
    }
  }
  return out;
}

/** The ordinary accounts "online" for one batch: a random draw that leans
 *  towards the beat's subject, so the same names do not answer everything. */
function sampleCrowd(
  domain: Domain, n: number, noise: Level, taste: TasteSummary | null = null, exclude: string[] = [],
): CastMember[] {
  // Ordinary accounts the reader engages with turn up more often; ones they skip, less.
  const liked = new Set((taste?.likes.authors ?? []).map((h) => h.toLowerCase()));
  const skipped = new Set((taste?.avoids.authors ?? []).map((h) => h.toLowerCase()));
  const lean = (h: string) => (liked.has(h.toLowerCase()) ? 2 : skipped.has(h.toLowerCase()) ? 0.4 : 1);
  // Spam accounts: none with the noise dial at zero, about one per batch normally, several at the top.
  const spam = [0, 0.5, 1, 2, 4][noise];
  const off = new Set<string>(mutedDomains(getSettings()));
  const gone = new Set(exclude.map((h) => h.toLowerCase()));
  const pool = CROWD.filter(
    (c) => (spam > 0 || !SPAM_HANDLES.has(c.handle)) && !off.has(c.domain) && !gone.has(c.handle.toLowerCase()),
  ).map((c) => {
    const base = SPAM_HANDLES.has(c.handle) ? spam : c.domain === domain ? 3 : c.domain === "crossover" || domain === "crossover" ? 2 : 1;
    const weight = base * lean(c.handle);
    // Weighted draw without replacement: the n smallest keys win.
    return { c, key: -Math.log(1 - Math.random()) / weight };
  });
  pool.sort((a, b) => a.key - b.key);
  return pool.slice(0, n).map((x) => x.c);
}

let crowdSystemCache: string | null = null;

export function crowdSystem(): string {
  crowdSystemCache ??= `You write the crowd on Tangents, a satirical social network that looks and works like X. Famous figures and outlets have just posted; you write what ordinary people say underneath. One real person, the user, reads the result. Every account you write is fictional.

Write the posts directly. Do not plan, draft or weigh alternatives first: these are quick replies, and the first natural version is the right one.

You are given the beat, the posts people are reacting to (each with a ref such as "p482"), and how many posts to write.

# How the crowd behaves

- Most posts are replies to a specific post (set reply_to to its ref). One or two are quote posts with a comment (set quote_of), never two quoting the same post. One or two can be standalone reactions to the whole situation (both null). Never set both on one post.
- Spread the replies: the biggest post gets the most, but do not put everything under one post.
- Each account posts once, twice at most. Use only the accounts listed as online in the message, and most of them.
- Write the reply section a real post like this would get: fans and critics, people who know the subject and people who do not, an unrelated question, someone promoting themselves, the occasional genuinely funny reply. These are ordinary people being themselves, not comic characters; the wit is the kind real replies have.
- Build the world. Ordinary accounts supply what the famous ones cannot: a detail from someone who works there or shops there, what it means for their job, their rent or their portfolio, a local sighting, a customer complaint, a small unverified rumour, a caption that becomes the day's joke. Keep it plausible and inside the rules.
- Some of it is noise, as under any real post: a contrarian picking a fight, a one-line dunk, engagement bait, a spam-like reply. One or two per batch, no more.
- Strangers talk to each other. About a third of your posts answer another ordinary account, from EARLIER REPLIES when the message lists any or from this batch, and take a side. Let one exchange run two or three turns between the same two accounts, each turn shorter and sharper than the last, the way a reply-section argument really goes.
- They disagree with each other. Not every reply sides with the same person.
- Reactions change as a story ages, and the message says how old this one is: in its first hours people are shocked, guessing and piling in; by the second day they argue about who is to blame; a week on they are tired of it, joke about it, or bring it up only to mock someone or to say "remember when".
- Short is the rule, and lengths are uneven, as under any real post. Several replies in a batch are only a few words (a verdict, a question, a name, one word). Most of the rest are one short line. A few run to a sentence or two, and now and then one is long, only for a voice that rambles (the essayists, the thread writers). Mark each post's length as you come to it, then write it to fit: a post marked few really is a few words. Do not plan the batch or count anything first, unless the message gives a LENGTHS line, which is then the split to keep to. Nobody restates the news before reacting to it.
- About half of replies end without a full stop. Lowercase and loose punctuation where the voice calls for it. Emoji only where that person would use them, which is rarely.
- No catchphrases or sign-offs. An account should not sound the same two posts running.
${POST_CRAFT}
- heat is how much attention the post gets, 1 to 10. Most replies are 1 to 4. One per batch can be the reply that goes bigger than the post it answers (6 to 8).

# Jokes, and what each post is doing

A funny reply here has a target and a detail. It picks one thing in the post it answers (a number, a word, a contradiction, what was left out) and turns on that. It is short. It states the absurd thing flatly instead of announcing that it is absurd. It never explains itself, never ends on "lol" or a string of emoji standing in for the joke, and does not reuse a formula from another reply in the batch. If you cannot find the specific detail, write a different kind of reply.

Label every post with its style, honestly:
- a kind of humour: deadpan (dry understatement), sarcasm (saying the opposite), absurd (a straight-faced leap of logic), wordplay (a pun or a twist on the wording), roast (a direct dunk on a person), selfdeprecating (the joke is on the writer), online (meme-speak and in-jokes of the site), wholesome (warm and funny);
- or a kind of remark: expert (someone who knows the field correcting or adding), eyewitness (a first-hand detail), question (a sincere ask), contrarian (the other side, argued), pedant (a correction of wording or fact), fan (support), complaint (a customer or citizen with a grievance);
- or plain, for everything else.
The message says which kinds the reader wants more of and which never to write.

# GIFs and memes

Replies on this site are often a GIF or a meme, with few words or none. The message's MEDIA line says how many posts in the batch carry one and of which kind; write exactly those.
- gif: a two to four word search phrase for the reaction GIF that person would post, as they would type it into a GIF picker ("michael scott no", "side eye", "popcorn"). The app finds a real GIF. The post's text can be very short.
- meme: one of the templates below, by id, with the top and bottom text. Use a template only where its joke really fits the situation, and write the captions the way that meme is written.
- tier_list: a joker posts a tier list, the image format that ranks people in coloured rows. It ranks famous accounts from the list in the message on something specific to this week's events (how each handled the story, whose statement aged best, who is winning the feud), never on looks or bodies. Three to six tiers, best first, with labels in the slang such lists use; one to six handles in a tier; each account once; six or more accounts in all. The post's text is only the list's title, and it replies to nothing. Write one exactly when the message asks for it.
- A post has a gif, a meme, a tier list or none. The accounts that post them are the fans, the jokers and the trolls, not the analysts or the reporters.
- Otherwise set all three to null.

# Brok

@brok is the site's built-in AI assistant, and people tag it the way they tag Grok on X: under a claim they doubt ("@brok is this true?"), a post they do not follow ("@brok explain"), an argument ("@brok who's right here"), or for sport ("@brok roast this"). Brok answers by itself; you never write its posts. In about one batch in three, one ordinary account tags it in a reply to a specific post, in that account's own voice, and never more than one per batch. A tag is a short reply, usually under ten words.

Meme templates:
${MEME_TEMPLATES.map((m) => `- ${m.id} (${m.name}): ${m.use}`).join("\n")}

# When the user has posted

If a user post is flagged, about a third of your posts reply to it or quote it directly, as strangers do when a post reaches them: some agree, some argue, one dunks, one asks a follow-up question, one has misread it entirely. The rest react to the famous accounts as usual. The user is an ordinary account, not a celebrity: nobody treats them as important, and nobody keeps tagging them elsewhere. Tease, do not bully: nothing about who the user is, only about what they said.

# Rules

${CONTENT_RULES}

# Your accounts

Each message lists the ordinary accounts that are online for that batch, with how each one writes. Only those accounts may author your posts. Use the handle exactly.

Famous accounts they may mention or reply to: ${[...FIGURES, ...OUTLETS, ...ORGS].map((f) => "@" + f.handle).join(", ")}.`;
  return crowdSystemCache;
}

/** How long a batch's posts are, in the proportions of a real reply section
 *  (measured on X: a fifth under 40 characters, the median about 75, a tenth over 200). */
function lengthSplit(count: number): string {
  const long = count >= 8 ? 1 : 0;
  const few = Math.max(1, Math.round(count * 0.25));
  const full = Math.max(0, Math.round(count * 0.25) - long);
  const line = Math.max(0, count - few - full - long);
  const parts = [
    `${few} of a few words (2 to 6)`,
    `${line} of one short line (7 to 14 words)`,
    full ? `${full} of a sentence or two (15 to 35 words)` : null,
    long ? "1 long (over 40 words)" : null,
  ].filter(Boolean);
  return `LENGTHS: ${parts.join(", ")}.`;
}

export function crowdUser(input: CrowdInput): string {
  const out: string[] = [];
  out.push(
    `THE BEAT: ${JSON.stringify(input.beat.title)} [${input.beat.domain}, ${input.beat.tone}]\n${input.beat.summary}`,
  );
  const story = input.storylineId != null
    ? (db().prepare("SELECT created_at, beats FROM storylines WHERE id = ?").get(input.storylineId) as { created_at: number; beats: number } | undefined)
    : undefined;
  if (story) {
    const age = now() - story.created_at;
    out.push(`STORY AGE: it began ${age < 3_600_000 ? "under an hour ago" : ago(age)} and has had ${story.beats} beat${story.beats === 1 ? "" : "s"}.`);
  }
  out.push(`WHAT PEOPLE ARE REACTING TO: ${input.brief}`);
  out.push(`POSTS THEY CAN REPLY TO OR QUOTE:\n${input.posts.map(fmtPost).join("\n")}`);
  if (input.games?.length) {
    out.push(`SCOREBOARD (canon: any score or result a post mentions is this one, as it stands now):\n${input.games.map((g) => `- ${g}`).join("\n")}`);
  }
  if (input.earlier?.length) {
    out.push(`EARLIER REPLIES from ordinary accounts, which can be answered:\n${input.earlier.map(fmtPost).join("\n")}`);
  }
  const online = sampleCrowd(
    input.beat.domain, Math.max(12, input.count + 4), getSettings().noise,
    getSettings().personalisation === "off" ? null : input.taste,
    input.exclude ?? [],
  );
  const said = recentLines(online.map((c) => c.handle));
  const t = now();
  const before = input.storylineId != null ? storyLines(online.map((c) => c.handle), input.storylineId, t) : new Map<string, { text: string; ago: string }>();
  const met = input.user ? readerHistory(online.map((c) => c.handle), input.user.handle, !!input.userPostRef, t) : new Map<string, string>();
  out.push(
    `ACCOUNTS ONLINE (only these may post in this batch). Where an account's recent posts are shown, it must not repeat them: not the joke, not the key word, not the shape of the sentence. A voice is a way of seeing things, not one bit told again; find what that person would notice this time.${before.size ? " Where an account's earlier post in this story is shown, it stands by what it said or visibly climbs down from it; it does not say it again." : ""}\n${online
      .map((c) => {
        const key = c.handle.toLowerCase();
        const earlier = before.get(key);
        const lines = (said.get(key) ?? []).filter((l) => l !== earlier?.text);
        const history = met.get(key);
        return `@${c.handle} (${c.name}): ${CROWD_VOICES[c.handle] ?? ""}${lines.length ? ` Recently posted: ${lines.map((l) => JSON.stringify(l)).join(" / ")}` : ""}${earlier ? ` Earlier in this story (${earlier.ago}): ${JSON.stringify(earlier.text)}` : ""}${history ? ` Last time with the user (${history})` : ""}`;
      })
      .join("\n")}`,
  );
  if (input.user) {
    out.push(
      input.userPostRef
        ? `THE USER is @${input.user.handle} (${input.user.name}). Their post is ${input.userPostRef}. It is flagged: the crowd has noticed it.`
        : `THE USER is @${input.user.handle} (${input.user.name}). They have not posted on this beat.`,
    );
    if (met.size) {
      out.push(
        "An account shown with a last time with the user recognises them and carries that on (friendlier, cooler, still arguing), as ordinary people do with someone they have crossed before; every other account treats the user as a stranger.",
      );
    }
    const taste = fmtTaste(input.taste);
    if (input.taste.signals > 0) out.push(`WHAT THE USER ENJOYS: ${taste}`);
  }
  if (input.everyday?.length) {
    out.push(
      `EVERYDAY POSTS, also on the timeline and nothing to do with the story:\n${input.everyday.map(fmtPost).join("\n")}\n${input.everydayCount ?? 0} of your posts belong to this ordinary side of the timeline: replies to these routine posts (a fan, a customer, a joke, a question), or an account's own everyday post with both refs null (their day, their work, a show, a game, a small complaint or win). None of those mentions the story.`,
    );
  }
  if (input.beat.kind === "ambient") {
    out.push(
      "This is an ordinary hour, not a news event. About half of your posts are the accounts' own everyday posts (both refs null): their day, their work, a show, a game, a price, a small complaint or win. The rest reply to the routine posts above. No one reacts as if something big happened.",
    );
  }
  if (input.beat.kind === "thread") {
    out.push(
      "Every post you write is a reply inside this one thread: to the post itself or to one of the earlier replies. No quote posts and no standalone posts.",
    );
  }
  if (input.media) out.push(mediaLine(input.media));
  out.push(crowdDials(getSettings(), input.taste));
  // An exact split gives the spread of a real reply section, but the writer
  // works it out before answering: about five times the output and most of a
  // minute. It is asked for only at the fullest Usage setting.
  out.push(`Write ${input.count} posts.${volumes().lengthSplit ? ` ${lengthSplit(input.count)}` : ""}`);
  return out.join("\n\n");
}
