// Prompt text for the two model calls.
// OWNER: main session (personas and prompts workstream). Signatures are frozen.
import type { DigestPost, Domain, TasteSummary, Tone, WorldDigest } from "./types";

export interface CrowdInput {
  beat: { kind: string; title: string; summary: string; domain: Domain; tone: Tone };
  /** The director's note on what people are reacting to. */
  brief: string;
  /** Posts the crowd may reply to or quote, each with a real "p123" ref. */
  posts: DigestPost[];
  user: { handle: string; name: string } | null;
  /** Set when the crowd should pile onto the user's post (its "p123" ref). */
  userPostRef: string | null;
  taste: TasteSummary;
  /** How many posts to write. */
  count: number;
}

export function directorSystem(): string {
  return "";
}
export function directorUser(digest: WorldDigest): string {
  return JSON.stringify(digest);
}
export function crowdSystem(): string {
  return "";
}
export function crowdUser(input: CrowdInput): string {
  return JSON.stringify(input);
}
