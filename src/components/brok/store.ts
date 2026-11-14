"use client";
// Brok conversations. They live in this module, not in the screen, so an
// answer that arrives after the reader has moved to another page is still
// there when they come back. Settled exchanges are also kept in
// sessionStorage for the life of the tab. Nothing is stored on the server:
// each question is sent on its own.
import { useSyncExternalStore } from "react";
import { errorText } from "@/components/extras/errorText";
import { postJson } from "@/lib/client";

export interface Exchange {
  id: number;
  /** What the reader's bubble shows. */
  label: string;
  /** What is sent; empty with a post means "explain this post". */
  ask: string;
  postId: number | null;
  answer: string | null;
  error: string | null;
  pending: boolean;
}

const EMPTY: Exchange[] = [];
const conversations = new Map<string, Exchange[]>();
const listeners = new Set<() => void>();
let nextId = 1;

/** "general", or one conversation per post that was asked about. */
export const keyFor = (postId: number | null) => (postId == null ? "general" : `post:${postId}`);
const storageKey = (key: string) => `brok:${key}`;

function load(key: string): Exchange[] {
  const have = conversations.get(key);
  if (have) return have;
  let list: Exchange[] = EMPTY;
  try {
    const raw = window.sessionStorage.getItem(storageKey(key));
    const parsed = raw ? (JSON.parse(raw) as Exchange[]) : [];
    if (Array.isArray(parsed) && parsed.length) {
      list = parsed.filter((x) => x && typeof x.label === "string");
      nextId = Math.max(nextId, ...list.map((x) => x.id + 1));
    }
  } catch {
    // no storage, or a corrupt value: start empty
  }
  conversations.set(key, list);
  return list;
}

function save(key: string, list: Exchange[]) {
  conversations.set(key, list);
  try {
    // A question still in flight would be stranded by a reload, so only settled ones are kept.
    const settled = list.filter((x) => !x.pending);
    if (settled.length) window.sessionStorage.setItem(storageKey(key), JSON.stringify(settled.slice(-40)));
    else window.sessionStorage.removeItem(storageKey(key));
  } catch {
    // storage is a convenience
  }
  listeners.forEach((l) => l());
}

const patch = (key: string, id: number, change: Partial<Exchange>) =>
  save(key, load(key).map((x) => (x.id === id ? { ...x, ...change } : x)));

async function send(key: string, x: Exchange) {
  try {
    const body = x.postId == null ? { ask: x.ask } : { ask: x.ask, postId: x.postId };
    const res = await postJson<{ answer?: unknown }>("/api/brok", body);
    if (typeof res.answer !== "string" || !res.answer.trim()) throw new Error("empty");
    patch(key, x.id, { answer: res.answer.trim(), pending: false });
  } catch (e) {
    patch(key, x.id, { error: errorText(e), pending: false });
  }
}

/** Ask a question in a conversation. One at a time: ignored while another is in flight. */
export function ask(key: string, label: string, question: string, postId: number | null): void {
  const list = load(key);
  if (list.some((x) => x.pending)) return;
  const x: Exchange = { id: nextId++, label, ask: question, postId, answer: null, error: null, pending: true };
  save(key, [...list, x]);
  void send(key, x);
}

/** Send a failed question again. */
export function retry(key: string, id: number): void {
  const list = load(key);
  const x = list.find((e) => e.id === id);
  if (!x || x.pending || list.some((e) => e.pending)) return;
  patch(key, id, { error: null, pending: true });
  void send(key, x);
}

export function clear(key: string): void {
  save(key, EMPTY);
}

export function useConversation(key: string): Exchange[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => load(key),
    () => EMPTY,
  );
}
