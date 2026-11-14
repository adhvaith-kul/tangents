"use client";
// Post text with X's entity styling: @mentions, #hashtags, $CASHTAGS and URLs
// in blue. Links stop the click from reaching the surrounding post row.
import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

// Built from a string: the tsconfig targets ES2017, which rejects lookbehind
// in regex literals, while every browser this runs in supports it.
const ENTITY = new RegExp(
  [
    String.raw`(https?:\/\/[^\s]+)`,
    String.raw`(?<![\w@])@(\w{1,15})(?!\w)`,
    String.raw`(?<![\p{L}\p{N}_&#])#([\p{L}\p{N}_]*[\p{L}_][\p{L}\p{N}_]*)`,
    String.raw`(?<![\w$])\$([A-Za-z]{1,6})(?![A-Za-z])`,
  ].join("|"),
  "gu",
);

const TRAILING = /[.,:;!?'")\]]+$/;
const stop = (e: MouseEvent) => e.stopPropagation();
const linkClass = "text-x-blue hover:underline";

/** X shows URLs without the scheme or "www." and cuts long ones with an ellipsis. */
function displayUrl(url: string): string {
  const bare = url.replace(/^https?:\/\//, "").replace(/^www\./, "");
  return bare.length > 26 ? bare.slice(0, 26) + "…" : bare;
}

export function RichText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(ENTITY)) {
    const start = m.index;
    let token = m[0];
    let tail = "";
    if (m[1]) {
      const trail = TRAILING.exec(token);
      if (trail) {
        tail = trail[0];
        token = token.slice(0, -tail.length);
      }
    }
    if (start > last) parts.push(text.slice(last, start));
    if (m[1]) {
      parts.push(
        <a key={start} href={token} target="_blank" rel="noopener noreferrer" onClick={stop} className={linkClass}>
          {displayUrl(token)}
        </a>,
      );
    } else if (m[2]) {
      parts.push(
        <Link key={start} href={`/${m[2]}`} onClick={stop} className={linkClass}>
          {token}
        </Link>,
      );
    } else if (m[3]) {
      parts.push(
        <Link key={start} href={`/explore?q=${encodeURIComponent("#" + m[3])}`} onClick={stop} className={linkClass}>
          {token}
        </Link>,
      );
    } else {
      parts.push(
        <Link key={start} href="/markets" onClick={stop} className={linkClass}>
          {token}
        </Link>,
      );
    }
    if (tail) parts.push(tail);
    last = start + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/** Cut text longer than `limit` characters, preferring a word boundary. */
export function cutText(text: string, limit = 280): { text: string; cut: boolean } {
  if (text.length <= limit) return { text, cut: false };
  const slice = text.slice(0, limit);
  const space = slice.search(/\s\S*$/);
  const at = space > limit - 40 ? space : limit;
  return { text: slice.slice(0, at).trimEnd(), cut: true };
}
