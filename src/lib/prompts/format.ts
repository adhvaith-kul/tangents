// How posts, the reader's taste and the cast briefs are laid out in a message.
import { fullBrief, selectCast } from "../briefs";
import type { DigestPost, Settings, TasteSummary } from "../types";
import { leanDomains, mutedDomains } from "./dials";

export function fmtPost(p: DigestPost): string {
  const reply = p.replyToRef ? ` (reply to ${p.replyToRef})` : "";
  const age = p.minutesAgo < 1 ? "just now" : p.minutesAgo < 90 ? `${Math.round(p.minutesAgo)}m ago` : `${Math.round(p.minutesAgo / 60)}h ago`;
  return `[${p.ref}] @${p.author}, ${age}${reply}: ${JSON.stringify(p.text)}`;
}

/** A stretch of simulation time as the writers read it: "40m ago", "5h ago", "3d ago". */
export function ago(ms: number): string {
  const m = Math.max(0, Math.round(ms / 60_000));
  if (m < 60) return `${m}m ago`;
  if (m < 48 * 60) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / (24 * 60))}d ago`;
}

export function fmtTaste(t: TasteSummary): string {
  if (t.signals === 0) return "No signals yet. Keep the mix broad.";
  const part = (label: string, xs: string[], at = "") =>
    xs.length ? `${label} ${xs.map((x) => at + x).join(", ")}` : null;
  const likes = [
    part("accounts", t.likes.authors, "@"),
    part("topics", t.likes.topics),
    part("tones", t.likes.tones),
    part("domains", t.likes.domains),
    part("kinds of reply", t.likes.styles),
    part("kinds of post", t.likes.formats),
  ].filter(Boolean);
  const avoids = [
    part("accounts", t.avoids.authors, "@"),
    part("topics", t.avoids.topics),
    part("tones", t.avoids.tones),
    part("domains", t.avoids.domains),
    part("kinds of reply", t.avoids.styles),
    part("kinds of post", t.avoids.formats),
  ].filter(Boolean);
  return [
    `From ${t.signals} signals (likes, replies, time spent, skips).`,
    likes.length ? `Enjoys: ${likes.join("; ")}.` : null,
    avoids.length ? `Skips: ${avoids.join("; ")}.` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

export function briefsBlock(
  handles: string[], text: string, s: Settings, taste: TasteSummary, limit: number,
  stands: { handle: string; note: string; msAgo: number }[] = [],
): string {
  const muted = mutedDomains(s);
  const cast = selectCast(handles, text, leanDomains(s, taste), limit + 6).filter((c) => !muted.includes(c.domain));
  // A briefed account's living note goes after its brief; nobody else's is shown.
  const stand = new Map(stands.map((x) => [x.handle.toLowerCase(), x]));
  const brief = (c: (typeof cast)[number]) => {
    const x = stand.get(c.handle.toLowerCase());
    return x ? `${fullBrief(c)}\nWhere they stand now (${ago(x.msAgo)}): ${x.note}` : fullBrief(c);
  };
  return `CAST BRIEFS (the accounts most relevant to this call):\n\n${cast.slice(0, limit).map(brief).join("\n\n")}`;
}
