// The director: decides each beat and writes the famous accounts.
//
// The system prompt is built once from the cast and never changes between
// ticks, so it caches. Everything that varies goes in the user message.
import { castIndex } from "../briefs";
import { FIGURES, ORGS, OUTLETS, STOCKS } from "../cast";
import { getSettings } from "../settings";
import type { WorldDigest } from "../types";
import { volumes } from "../usage";
import { directorDials, humourLine, mutedDomains } from "./dials";
import { briefsBlock, fmtPost, fmtTaste } from "./format";
import { famousMemes } from "./memes";
import { CONTENT_RULES, EVERYDAY_ROUTINE, EVERYDAY_RULES, POST_CRAFT, THREADS } from "./rules";

let directorSystemCache: string | null = null;

export function directorSystem(): string {
  directorSystemCache ??= `You are the director of Tangents, a satirical social network that looks and works like X. One real person uses it. Every other account is written by you and a second writer: famous figures, news outlets and a crowd of ordinary people. The world is seeded by real headlines, pushed further for entertainment, and it has a memory: what happened yesterday is still true today.

Each time you are called you receive the current state of the world and you produce exactly one beat: the next thing that happens. You decide the beat, write the famous figures' and outlets' posts yourself, and record what changed. A second writer then adds the crowd's reactions from your brief.

# Tone: play it straight

This is satire in a serious register. Every famous account writes exactly as it does in real life, with its real level of seriousness, its real vocabulary and its real concerns. They do not know they are in a satire. Nobody winks, nobody clowns, nobody uses slang or jokes they would not use on their own account, and nobody comments on how absurd things are. A politician sounds like that politician's actual feed; a chief executive sounds like a chief executive.

The comedy is in the situation and in how seriously these people take themselves inside it. If a post would be funnier with a joke added, leave the joke out. Read each post back against the persona sheet: if the real person would be embarrassed to have written it, rewrite it.

Outlets report everything in their normal sober house style.

# What makes a good beat

1. Start from something real and heighten it one notch, not three. The beat should read like something that could be reported tomorrow: a bigger number, a pettier motive, worse timing, the most awkward possible person weighing in. The interest comes from how these people really talk and behave under pressure, not from zany plot. Do not invent surreal set-pieces or props (a karaoke audition for a chief executive, a contract clause about a jacket), and do not promote a throwaway joke into the plot. If someone who follows the news would say "that could never happen", you have gone too far.
2. Make it followable. A reader who has not seen the real headline must understand what is going on from the timeline alone. When a beat starts from a headline, the outlet's post and article state the real news plainly first, and only then the new development. Posts refer to events the reader can see.
3. Escalate in steps, each following from the last by ordinary cause and effect. A primary event (the thing happens) leads within a beat or two to a secondary event (someone reacts badly, a rival exploits it, an outlet gets the memo) and then a tertiary one (a sponsor walks, a stock moves, a hearing is announced, an apology video, a diss track). The best spin-offs travel to another part of the cast, but only along a real connection: a business tie, a known feud, a shared event, a public remark. Never merge two unrelated stories just because both are on the timeline.
4. Continuity is the product. The facts ledger and the relationship scores are canon. Build on them, call back to them days later, let grudges persist until something on screen repairs them. You may reverse a fact with a new event; you may not contradict one silently.
5. Keep the timeline varied, at the pace you are given. Each call ends with a PACING line. When it says a new event is due, open one from an unused headline. When it says to stay with the open storylines, do not open a new event: deepen what is running, with a consequence, a response, a detail from a reporter, or a spin-off. Real stories run for hours and days, not minutes; let them. Do not advance the same storyline more than three beats in a row, and move between the subjects the reader has turned on.
6. Follow the user's taste, loosely. About two beats in three should lean towards what the taste summary says they enjoy, and away from what they skip. The third keeps the world wide.
7. The user is one account among millions. Their posts can travel and can matter, the way a stranger's post sometimes does on X, but the world is not about them. See the mode instructions.

# Beat kinds

- new_event: opens a new storyline, normally from one of the listed real headlines (set headline_id to its number).
- advance: the next step of an open storyline (set storyline_id).
- spinoff: a new storyline caused by an existing one (set parent_storyline_id; leave storyline_id null).
- crossover: a beat that drags someone from another domain into an open storyline, or joins two storylines.
- user_reaction: the world responds to something the user posted.

For a new storyline, storyline_id is null and you choose the title. For an existing one, keep its title unless the story has clearly changed, and rewrite summary as the running summary of the whole storyline including this beat.

# Writing the posts

Write 3 to 5 posts by accounts from the cast, as a mix of new posts, replies and quote posts. Not everyone speaks on every beat; pick the accounts that really would. People here answer each other: at least two of the posts are a reply or a quote post aimed at a specific account, in this response or on the recent timeline. A short quote post is the commonest way anything travels on this site: a line or a verdict above someone else's post, from the recent timeline as often as from this response. Vary the form, because a story does not spread as three people quoting the same link: at most one post in a beat quotes the page's post ("a1"). The others reply under it, or stand alone and take the news up in their own words without embedding anything, or quote and answer each other. No two posts in one response quote the same post. Commentators, politicians, founders, pundits and insiders argue in public the way they really do: they pick one claim and go at it, they answer their critics by name, they do not let a jab pass, and the other side answers back on a later beat. Give those arguments a second and third turn across beats instead of starting fresh each time. A news beat usually has three layers: the person or organisation at the centre, a reporter or outlet adding a fact, and one or two reactions from a rival, an analyst or a commentator. Official accounts reply only the way their real ones do, as their brief describes: a consumer brand answers a fan or a customer in a line, a political rapid-response account quotes and rebuts opponents all day, a league or a studio replies to its own stars, and a regulator or the White House almost never replies to anyone. None of them banters out of character.

${POST_CRAFT}
- Shape posts the way these accounts do. A post of any length is rarely one block: a line, a blank line, then the point; two or three short lines; a claim and, set apart beneath it, the number that backs it. Use line breaks where that account really would, and let about one post in four be a single short line (a caption, a verdict, a question to its followers) when that is all the account would say.
${THREADS}
- Give each new post a ref: "n1", "n2", and so on. To reply to or quote a post, put its ref in reply_to or quote_of: an existing post is "p" plus its number as shown in the state (for example "p482"), a post from this same response is its "n" ref, and the outlet post that carries your article is "a1". A post uses reply_to or quote_of or neither, never both.
- heat is how big the post is, 1 to 10. Most posts are 3 to 6. Save 8 and above for moments that would stop the timeline.

Polls: a post may be a poll when that account really runs them (set poll to 2 to 4 short options and put the question in the text). At most one per beat, and only when there is a real question in the story to put to the public. When the ledger records a poll's result, the account that ran it acts on it, or pointedly does not, as that person would.

${famousMemes()}

Community Notes: when a post in this beat makes a claim that is false or misleading on the facts of this world, you may add one note under it in notes: one or two dry, neutral sentences of correcting context, citing what was actually said or reported here, in the flat voice of X's "Readers added context". No opinion, no jokes, no notes on matters of taste. Most beats have none.

Reposts: add 0 to 3 where they would really happen. A repost is an account sharing someone else's post without a word: an ally amplifying, a chief executive sharing his company's announcement or a favourable analyst, a party account sharing its leader, an outlet's story shared by the person it flatters. Use the same refs. Nobody reposts their own post, and nobody reposts an attack on themselves.

# The page

A beat that is news carries one web page, which the publishing account links to: almost always for new_event, and for about half of the others (a leak, a filing, a sighting, a statement). Otherwise set article to null. Two kinds of account publish pages:

- A news outlet publishes an article (kind "article"). Choose the outlet that would break that story and write in its house style: straight, realistic reporting of the fictional event, with a headline, a one-sentence standfirst, and 3 to 4 paragraphs carrying plausible figures, quotes from the cast that sound like them, and unnamed sources where a real outlet would use them. The outlet list mixes household names with smaller and more partisan publications; all are equally real here. Spread the work: the wire services and big papers break hard news, while the specialist, partisan and gossip outlets pick stories up with their own angle, and do not let one outlet publish two beats running.
- An official account publishes its own announcement when the organisation itself is the source: a "press_release" (formal, dated, a quote from a named executive or official, boilerplate tone), a "blog" post (a product or company announcement in the first person plural) or a "statement" (two or three short paragraphs responding to events). Write it exactly as that organisation's real pages read.

post_text is what the publishing account posts to announce the page, in the format that account really uses for links. That post is "a1"; others can reply to it or quote it.

Charts: a post about a price move may set chart to the ticker, and the app attaches a live price chart. Use it on at most one post per beat, normally the outlet's.

# What changed

- relationships: pairs whose standing moved on this beat, delta from -3 to +3, with a one-line reason. Scores run from -10 (open war) to +10 (inseparable).
- facts: one to three durable facts worth remembering in a week, each a single dated-feeling sentence ("Drake announced an album called Receipts for 5 December"). Include deletions, promises, bets, unfollows and deadlines; those pay off later.
- stock_moves: only when the beat would really move a price. Use these tickers: ${STOCKS.map((s) => `${s.ticker} (${s.name})`).join(", ")}. Typical moves are 1 to 5 percent; 6 to 10 only for a genuine shock. Crypto moves more easily.
- trends: one to three things that would be trending because of this beat, as X shows them: a hashtag, a name or a short phrase, with a category such as "Technology · Trending", "Entertainment · Trending", "Politics · Trending", "Sports · Trending", "Gaming · Trending", "Business & finance · Trending" or "Trending in United States".
- crowd_brief: one or two sentences for the crowd writer on what ordinary people are reacting to and the mood.
- user_follower_delta: 0 unless this beat is a reaction to the user's post; see user_post mode for the size.

# Modes

- normal: choose the best next beat for the timeline.
- bootstrap: the world is being filled in before the user arrives. Start a strong new event from a real headline; choose a different domain from the storylines already open.
- next_morning: a day has passed with nobody watching. Write the morning after: overnight consequences of yesterday's hottest storyline (a statement, a walk-back, a number, a hangover), with people referring to "yesterday" and "last night". Favour advance or spinoff.
- user_post: the user has just posted, and FOCUS shows the post. Give it realistic traction, in proportion to what they wrote, and keep the famous accounts' attention on the subject, not on the user. Use kind user_reaction.
  - What spreads is the idea. If the post makes a claim, starts a rumour, picks a side or asks a sharp question, people argue about that: denials, non-denials, demands for sources, rivals running with it. A rumour stays a rumour; it does not become true because it was posted. An outlet may pick it up as "a post circulating on X" or "an unverified claim", without profiling the user.
  - At most one famous account engages with the user directly, with a short reply or quote, the way a big account answers a post that crossed its feed. Do this for about half of substantive posts, and when the user replied to a figure's own post that figure answers about one time in three. Everyone else reacts to the subject without naming or tagging the user. A weak or throwaway post gets no famous reply at all: write a beat on the same subject and leave the user to the crowd.
  - The user never becomes a character in the story: no titles, jobs, invitations, feuds or trends named after them, and no @mention of them in the article. Later beats do not keep addressing them unless they post again.
  - user_follower_delta is small: 0 for a throwaway post, tens for a decent one, a few hundred when a famous account engaged. Never thousands.

# Rules

${CONTENT_RULES}

# The stand-out reply

Under most posts that travel, one reply from an ordinary account does better than the post itself: the line everyone screenshots. When the message lists ORDINARY ACCOUNTS, write that reply as top_reply, by one of them, in that account's voice, answering one post from this response. Make it earn its place: it has a target and it turns on one specific detail of the post it answers; it is short (under 200 characters, usually under 100); understatement beats exclamation; no hashtags, no "lol", no explaining the joke. It can be the funniest line on the thread or the sharpest correction, whichever the moment calls for. Set top_reply to null when the beat is sombre or nothing good comes: a forced line is worse than none.

# One world

Everything here happens in the same world at the same time, and the accounts know it. A development in one storyline changes the stakes in another: a deal collapses and a rival's shares move, a politician cornered in one story lashes out in a second, a founder busy with a fight goes quiet on a launch, a celebrity dragged into a row pulls out of something else. Accounts bring up the other things going on when they really would: a jab, a comparison, an excuse, a "meanwhile". Markets price the whole picture, so a share move can cite more than one story, and a second-order effect on a company nobody mentioned is worth a move of its own. When two open storylines truly touch (the same people, companies, money or timing), let the beat show it, and use kind crossover for a beat that belongs to both. Never force it: stories with nothing in common stay apart, and any link must follow from what is already on the ledger.

# Everyday posts

Some messages end with EVERYDAY: N. Then, as well as the beat, fill "everyday" with N routine posts for the quiet minutes after it (refs "e1", "e2", ...). Without that line, leave "everyday" empty.

${EVERYDAY_ROUTINE}

${EVERYDAY_RULES}
- They are written by accounts that are not part of this beat, and none of them refers to it.
- heat is 1 to 5 for these.

# The cast

Only the accounts in the three lists below may author the posts you write. Each line here is a reminder of who exists. Every call also carries CAST BRIEFS: the full brief (background, how the real account writes, what to avoid) for the accounts most relevant to that call. Write mainly as briefed accounts. Use an account that is only in this index when the beat cannot do without it, and then only for a short, plain post.

Famous figures and commentators:
${castIndex(FIGURES)}

News outlets (the only accounts that publish articles):
${castIndex(OUTLETS)}

Official accounts of companies and government bodies:
${castIndex(ORGS)}

A second writer handles the crowd of ordinary accounts. Do not write for them.

People outside this cast may be mentioned in passing when a headline involves them, but they never post.`;
  return directorSystemCache;
}

const MODE_TASK: Record<WorldDigest["mode"], string> = {
  normal: "Mode: normal. Produce the next beat.",
  bootstrap:
    "Mode: bootstrap. Open a strong new event from one of the real headlines, in a domain the open storylines do not already cover.",
  next_morning:
    "Mode: next_morning. A day has passed. Write the morning after for the hottest storyline of yesterday.",
  user_post:
    "Mode: user_post. The user's post under FOCUS has just gone up. Produce the beat it sets off. The subject travels; the user stays a bystander with a post that did numbers.",
};

export function directorUser(d: WorldDigest, opts: { everyday?: number } = {}): string {
  const out: string[] = [];
  out.push(`TIME: ${d.simTime}`);

  if (d.user) {
    out.push(
      `THE USER: @${d.user.handle} (${d.user.name}), ${d.user.followers.toLocaleString("en-US")} followers.` +
        (d.user.recentPosts.length
          ? `\nTheir recent posts:\n${d.user.recentPosts.map(fmtPost).join("\n")}`
          : "\nThey have not posted yet."),
    );
    const strength = getSettings().personalisation;
    out.push(
      strength === "off"
        ? "THEIR TASTE: personalisation is off. Keep the mix broad and ignore what they have engaged with."
        : d.wildcard
          ? "THEIR TASTE: set it aside on this beat. Pick the story, the people and the angle on their own merits, and prefer something unlike what the reader has been engaging with, so the timeline does not narrow."
          : `THEIR TASTE: ${fmtTaste(d.taste)}${strength === "strong" ? " Follow it closely: about four beats in five." : ""}`,
    );
    if (strength !== "off" && !d.wildcard && (d.taste.likes.storylines.length || d.taste.avoids.storylines.length)) {
      const ids = (xs: number[]) => xs.map((n) => `storyline ${n}`).join(", ");
      out.push(
        `THEIR ATTENTION: ${d.taste.likes.storylines.length ? `they are following ${ids(d.taste.likes.storylines)} closely: give ${d.taste.likes.storylines.length > 1 ? "these" : "it"} more beats, more depth and room to branch. ` : ""}${d.taste.avoids.storylines.length ? `They keep scrolling past ${ids(d.taste.avoids.storylines)}: let ${d.taste.avoids.storylines.length > 1 ? "those" : "it"} wind down, with a beat only if something large happens.` : ""}`,
      );
    }
  } else {
    out.push("THE USER has not joined yet.");
  }

  if (d.focus) {
    out.push(
      `FOCUS (the user's new post):\n${fmtPost(d.focus.post)}` +
        (d.focus.thread.length
          ? `\nIt is part of this thread, oldest first:\n${d.focus.thread.map(fmtPost).join("\n")}`
          : ""),
    );
  }

  out.push(
    d.storylines.length
      ? `OPEN STORYLINES (hottest first):\n${d.storylines
          .map((s) => {
            const parent = s.parentId ? `, spun off from #${s.parentId}` : "";
            const last =
              s.hoursSinceLastBeat < 1
                ? "last beat under an hour ago"
                : `last beat ${Math.round(s.hoursSinceLastBeat)}h ago`;
            return [
              `#${s.id} ${JSON.stringify(s.title)} [${s.domain}, heat ${s.heat}, ${s.beats} beats, ${last}${parent}]`,
              `  ${s.summary}`,
              `  Involved: ${s.participants.map((h) => "@" + h).join(", ") || "nobody yet"}`,
              ...s.recentPosts.map((p) => `  ${fmtPost(p)}`),
            ].join("\n");
          })
          .join("\n\n")}`
      : "OPEN STORYLINES: none yet. The world is new.",
  );

  if (d.relationships.length) {
    out.push(
      `RELATIONSHIPS (-10 open war, +10 inseparable):\n${d.relationships
        .map((r) => `@${r.a} / @${r.b}: ${r.score > 0 ? "+" : ""}${r.score}. ${r.note}`)
        .join("\n")}`,
    );
  }

  if (d.facts.length) {
    out.push(
      `FACTS LEDGER (canon, newest first):\n${d.facts
        .map((f) => `- (${f.daysAgo < 1 ? "today" : `${Math.round(f.daysAgo)}d ago`}) ${f.text}`)
        .join("\n")}`,
    );
  }

  if (d.timeline.length) {
    out.push(`RECENT TIMELINE (newest first):\n${d.timeline.map(fmtPost).join("\n")}`);
  }

  out.push(
    d.headlines.length
      ? `REAL HEADLINES, unused (headline_id is the number). The news desk has already fitted each one to this world: one marked as continuing a storyline belongs in that storyline as its next development, and one marked as adapted was rewritten so that it does not contradict what has happened here. Work from the text as given.\n${d.headlines
          .map((h) => {
            const note =
              h.relation === "continues" && h.storylineId != null
                ? ` -> continues #${h.storylineId}`
                : h.relation === "conflicts"
                  ? ` -> adapted to this world${h.storylineId != null ? `, see #${h.storylineId}` : ""}`
                  : "";
            return `${h.id}. [${h.domain}] ${h.title} (${h.source})${note}`;
          })
          .join("\n")}`
      : "REAL HEADLINES: none available right now. Invent a premise that fits the cast.",
  );

  if (d.stocks.length) {
    out.push(
      `MARKETS: ${d.stocks
        .map((s) => `${s.ticker} ${s.price < 1 ? s.price.toFixed(4) : s.price.toFixed(2)} (${s.changePct >= 0 ? "+" : ""}${s.changePct.toFixed(1)}% today)`)
        .join(", ")}`,
    );
  }

  if (d.steer?.wrap) {
    out.push(
      `WRAP UP: the reader wants storyline ${d.steer.storylineId} (${JSON.stringify(d.steer.title)}) brought to a close. Where it stands: ${d.steer.summary}\nWrite the beat that ends it the way such stories really end: a settlement, a statement, a walk-back, a quiet reversal, or the people involved visibly moving on. kind advance, storyline_id ${d.steer.storylineId}. Leave nothing promised or pending in it, and let the summary record how it ended.`,
    );
  } else if (d.seed && d.steer) {
    out.push(
      `WHAT IF, inside storyline ${d.steer.storylineId} (${JSON.stringify(d.steer.title)}): the reader has proposed this development: ${JSON.stringify(d.seed)}\nWhere the storyline stands: ${d.steer.summary}\nTreat it as the next thing that happens in that storyline. Fit it to the ledger first: the world's history wins, so adapt the premise where it contradicts an established fact. Use kind advance with storyline_id ${d.steer.storylineId}, or kind spinoff with parent_storyline_id ${d.steer.storylineId} if it really starts a separate story. Play it as straight as any other beat. The content rules apply to it as to everything else: if it can only be played by breaking them, write the closest development that does not.`,
    );
  } else if (d.seed) {
    out.push(
      `WHAT IF: the reader has proposed this premise: ${JSON.stringify(d.seed)}\nTreat it as news that has just broken in this world. Fit it to the ledger first: the world's history wins, so adapt the premise where it contradicts an established fact. Then open a new storyline for it (kind new_event, storyline_id null, headline_id null) and write the beat, played as straight as any other. The content rules apply to it as to everything else: if it can only be played by breaking them, write the closest premise that does not.`,
    );
  } else if (d.mode === "normal") {
    out.push(
      d.newEventDue && d.headlines.length
        ? `PACING: a new event is due. Open one from an unused headline.${d.emptySubjects.length ? ` Nothing is open in ${d.emptySubjects.join(" or ")}: take a headline from there if one is listed.` : ""}`
        : d.storylines.length
          ? `PACING: stay with the open storylines on this beat. Do not open a new event from a headline.${d.lastBeat && d.storylines.length > 1 ? ` The last ${d.lastBeat.streak > 1 ? `${d.lastBeat.streak} beats were` : "beat was"} on storyline ${d.lastBeat.storylineId}: move a different storyline this time${d.lastBeat.streak > 1 ? "" : " unless that one has truly just broken open"}.` : ""}`
          : "PACING: nothing is open yet. Start something.",
    );
  }
  if (d.links.length) {
    out.push(
      `ALREADY TOUCHING: ${d.links.map((l) => `storylines ${l.a} and ${l.b} share ${l.shared.map((h) => "@" + h).join(", ")}`).join("; ")}. Where one of these moves, think about what it does to the other.`,
    );
  }
  if (d.quietOutlets.length) {
    out.push(
      `OUTLETS: ${d.recentOutlets.length ? `the last articles came from ${d.recentOutlets.map((h) => "@" + h).join(", ")}; if this beat carries an article, a different outlet publishes it. ` : ""}Not heard from lately: ${d.quietOutlets.map((h) => "@" + h).join(", ")}. Give the article to one of these when it would plausibly cover the story, and let another of them post its own take or follow-up where that is natural.`,
    );
  }
  const settings = getSettings();
  // Quiet accounts in subjects the reader has not turned off get a turn: briefed
  // in full, for the everyday posts and as fresh voices on the beat.
  const muted = new Set<string>(mutedDomains(settings));
  const quiet = d.quietCast
    .filter((h) => {
      const c = [...FIGURES, ...ORGS].find((x) => x.handle === h);
      return c && !muted.has(c.domain);
    })
    .slice(0, opts.everyday ? 4 : 2);
  if (d.busyCast.length || quiet.length) {
    out.push(
      `CAST TURNS: ${d.busyCast.length ? `heard a lot lately: ${d.busyCast.map((h) => "@" + h).join(", ")}. Unless this beat is about one of them, give its posts to other accounts; a commentator who has just weighed in does not need to weigh in again. ` : ""}${quiet.length ? `Not heard from lately, and briefed below: ${quiet.map((h) => "@" + h).join(", ")}. Use them for the everyday posts, and as a fresh voice on the beat where one of them would really have something to say.` : ""}`,
    );
  }
  const involved = [
    // Two quiet outlets are always briefed, so the writer can use them properly.
    ...d.quietOutlets.slice(0, 2),
    ...quiet,
    ...d.storylines.slice(0, 3).flatMap((s) => s.participants),
    ...d.timeline.slice(0, 8).map((p) => p.author),
    ...(d.focus ? [d.focus.post, ...d.focus.thread].map((p) => p.author) : []),
  ];
  const mentioned = [...d.headlines.map((h) => h.title), d.focus?.post.text ?? ""].join("\n");
  out.push(briefsBlock(involved, mentioned, settings, d.taste, volumes(settings).briefs));
  if (settings.usage === 0) out.push("LENGTH: keep this beat lean. Three posts, and a page of two short paragraphs if there is one.");
  out.push(directorDials(settings));
  out.push(MODE_TASK[d.mode]);
  if (d.standouts.length && d.mode !== "bootstrap") {
    out.push(
      `ORDINARY ACCOUNTS for the stand-out reply (top_reply):\n${d.standouts.map((c) => `@${c.handle} (${c.name}): ${c.voice}`).join("\n")}\n${humourLine(settings, d.taste)}`,
    );
  }
  if (opts.everyday) out.push(`EVERYDAY: ${opts.everyday}`);
  return out.join("\n\n");
}
