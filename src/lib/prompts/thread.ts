// The follow-up call that writes the rest of a thread whose opening post is out.
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
