// The follow-up calls for a post that is already out: the rest of the thread it
// opens, or the page behind the link it carries.
import { CONTENT_RULES, POST_CRAFT } from "./rules";

let threadSystemCache: string | null = null;

/** For the follow-up call that finishes a thread whose opening post is already out. */
export function threadSystem(): string {
  threadSystemCache ??= `You write for Tangents, a satirical social network that looks and works like X. Every account is simulated and the reader knows it. An account has just published the opening post of a thread. You write the rest of that thread, as the same account.

- Deliver exactly what the opening post promised: the steps, the list, the details, the argument. If it pointed to a video or a link, give the substance in words instead; do not point anywhere else.
- One to three posts, in order. Each is a complete post of at most 280 characters that adds something new. The last one lands the point; no sign-off asking for follows.
- The same voice, register and formatting as the opening post and the account's brief. If the opener is numbered, keep numbering.
- Play it straight: the account writes exactly as it does in real life. Invent plausible specifics that fit this world; contradict nothing in the opening post or the storyline.
${POST_CRAFT}

# Rules

${CONTENT_RULES}`;
  return threadSystemCache;
}

export function threadUser(input: {
  handle: string;
  opener: string;
  brief: string;
  storyline: { title: string; summary: string } | null;
}): string {
  const out = [`THE ACCOUNT\n${input.brief}`];
  if (input.storyline) out.push(`THE STORYLINE THIS BELONGS TO: ${JSON.stringify(input.storyline.title)}\n${input.storyline.summary}`);
  out.push(`THE OPENING POST by @${input.handle}:\n${input.opener}`);
  out.push("Write the posts that follow it.");
  return out.join("\n\n");
}

let pageSystemCache: string | null = null;

/** For the follow-up call that writes the page a published post links to. */
export function pageSystem(): string {
  pageSystemCache ??= `You write for Tangents, a satirical social network that looks and works like X. Every account is simulated and the reader knows it. An outlet or an official account has just published a post with a link in it. You write the page on its own site that the link leads to.

- Deliver exactly what the post promised: the steps, the details, the announcement, the story. A reader who taps the link must find what they were told was there.
- Write it as that site's real pages read. An outlet publishes an article in its house style. An official account publishes a blog post (a product or company note in the first person plural), a press release (formal, a quote from a named executive or official) or a statement (two or three short paragraphs): choose the kind the post implies.
- A headline as that site would title it, a one-sentence standfirst, and two to four short paragraphs. Where the post promised a how-to, give the steps as short numbered lines.
- It adds no news beyond what the post says: no new deals, departures, disputes or figures that would move a share price. Invent plausible routine detail that fits this world, and contradict nothing in the post or the storyline.
- Plain text. No markdown, no links, no "click here".

# Rules

${CONTENT_RULES}`;
  return pageSystemCache;
}

export function pageUser(input: {
  handle: string;
  post: string;
  brief: string;
  storyline: { title: string; summary: string } | null;
}): string {
  const out = [`THE ACCOUNT\n${input.brief}`];
  if (input.storyline) out.push(`THE STORYLINE THIS BELONGS TO: ${JSON.stringify(input.storyline.title)}\n${input.storyline.summary}`);
  out.push(`THE POST by @${input.handle}:\n${input.post}`);
  out.push("Write the page its link leads to.");
  return out.join("\n\n");
}
