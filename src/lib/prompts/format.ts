// How posts, the reader's taste and the cast briefs are laid out in a message.
import { fullBrief, selectCast } from "../briefs";
import type { DigestPost, Settings, TasteSummary } from "../types";
import { leanDomains, mutedDomains } from "./dials";

export function fmtPost(p: DigestPost): string {
  const reply = p.replyToRef ? ` (reply to ${p.replyToRef})` : "";
  const age = p.minutesAgo < 1 ? "just now" : p.minutesAgo < 90 ? `${Math.round(p.minutesAgo)}m ago` : `${Math.round(p.minutesAgo / 60)}h ago`;
  return `[${p.ref}] @${p.author}, ${age}${reply}: ${JSON.stringify(p.text)}`;
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

export function briefsBlock(handles: string[], text: string, s: Settings, taste: TasteSummary, limit: number): string {
  const muted = mutedDomains(s);
  const cast = selectCast(handles, text, leanDomains(s, taste), limit + 6).filter((c) => !muted.includes(c.domain));
  return `CAST BRIEFS (the accounts most relevant to this call):\n\n${cast.slice(0, limit).map(fullBrief).join("\n\n")}`;
}
