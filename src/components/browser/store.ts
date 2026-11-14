"use client";
// State of the in-app browser: the open session (its own back/forward stack)
// and the address bar route. Opening from a screen pushes /news/<id> onto the
// real history so the browser's back button closes the overlay; moving within
// the overlay replaces that entry. On the /news/[id] route itself the overlay
// is opened in "route" mode and closing hands control back to the page.
import type { ArticleCard } from "@/lib/types";

export interface Session {
  key: number; // a new key per opening, so the window starts fresh
  stack: number[]; // article ids
  index: number;
  /** Set when opened by the /news/[id] page: called on close instead of history.back(). */
  onExit: (() => void) | null;
}

const MARK = "tangentsBrowser";
const NEWS = /^\/news\/(\d+)\/?$/;

let session: Session | null = null;
let seq = 0;
const subs = new Set<() => void>();
const hints = new Map<number, ArticleCard>();

function set(next: Session | null) {
  session = next;
  subs.forEach((fn) => fn());
}

export function subscribe(fn: () => void): () => void {
  subs.add(fn);
  return () => subs.delete(fn);
}

export function getSession(): Session | null {
  return session;
}

/** The card a page was opened from, so the address bar can show its url before the page loads. */
export function hintFor(id: number): ArticleCard | undefined {
  return hints.get(id);
}

function setAddress(id: number, push: boolean) {
  const state = { [MARK]: id };
  if (push) window.history.pushState(state, "", `/news/${id}`);
  else window.history.replaceState(state, "", `/news/${id}`);
}

export function start(id: number, card?: ArticleCard, onExit?: () => void) {
  if (card) hints.set(id, card);
  if (session && session.stack[session.index] === id) return;
  if (session && !session.onExit && !onExit) {
    // Already open over a screen: treat it as moving within the overlay.
    navigate(id, card);
    return;
  }
  if (!onExit) setAddress(id, true);
  set({ key: ++seq, stack: [id], index: 0, onExit: onExit ?? null });
}

export function navigate(id: number, card?: ArticleCard) {
  if (card) hints.set(id, card);
  if (!session) return;
  const stack = [...session.stack.slice(0, session.index + 1), id];
  setAddress(id, false);
  set({ ...session, stack, index: stack.length - 1 });
}

export function step(delta: -1 | 1) {
  if (!session) return;
  const index = session.index + delta;
  if (index < 0 || index >= session.stack.length) return;
  setAddress(session.stack[index], false);
  set({ ...session, index });
}

/** Close button and Escape. */
export function close() {
  const s = session;
  if (!s) return;
  set(null);
  if (s.onExit) s.onExit();
  else if ((window.history.state as Record<string, unknown> | null)?.[MARK] != null) window.history.back();
}

/** Drop a window opened by the /news/[id] route, without touching history. */
export function dismissRoute() {
  if (session?.onExit) set(null);
}

/** Browser back/forward. Returns true when the overlay was reopened (forward
 *  onto an entry it pushed), so the caller can make sure it is mounted. */
export function onPopState(state: unknown): boolean {
  const marked = (state as Record<string, unknown> | null)?.[MARK] != null;
  const m = NEWS.exec(window.location.pathname);
  if (session && !session.onExit && !(m && marked)) set(null);
  else if (!session && m && marked) {
    set({ key: ++seq, stack: [Number(m[1])], index: 0, onExit: null });
    return true;
  }
  return false;
}
