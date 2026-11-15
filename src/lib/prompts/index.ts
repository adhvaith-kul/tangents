// Prompt text for the model calls, one module per writer:
//   rules.ts     what every writer shares: content rules, post craft, threads, everyday posts
//   dials.ts     the reader's settings as instructions
//   format.ts    how posts, taste and cast briefs are laid out in a message
//   director.ts  the beat and the famous accounts
//   crowd.ts     ordinary accounts' replies
//   ambient.ts   everyday posts, when they get their own call
//   thread.ts    the rest of a thread whose opening post is out, or the page behind a post's link
//   major.ts     a major event: the planning call, and the private ARC section of the director's message
//   paper.ts     The Arc's daily edition
// Changing wording in any of them changes what the product says.
export { ambientSystem, ambientUser, type AmbientInput } from "./ambient";
export { arcRefs, arcSection, arcSystem, arcUser, type ArcPlanInput } from "./major";
export { crowdSystem, crowdUser, type CrowdInput } from "./crowd";
export { directorSystem, directorUser } from "./director";
export { CONTENT_RULES } from "./rules";
export { pageSystem, pageUser, threadSystem, threadUser } from "./thread";
export { paperSystem, paperUser, type PaperInput } from "./paper";
