"use client";
// Client-side state shared across every card and screen: optimistic like /
// repost / bookmark flags, hidden posts, reply counts bumped by the user's own
// replies, follow state, the compose dialog, and the "a post was created"
// signal that carries the new post (the shared bus carries no payload).
import { useSyncExternalStore } from "react";
import { bus, postJson, refreshMe, track } from "@/lib/client";
import type { InteractionEvent, PostView, ViewerState } from "@/lib/types";

// A minimal external store: a value replaced on every change, plus listeners.
function createStore<T>(initial: T) {
  let value = initial;
  const subs = new Set<() => void>();
  return {
    get: () => value,
    set(next: T) {
      value = next;
      subs.forEach((fn) => fn());
    },
    subscribe(fn: () => void) {
      subs.add(fn);
      return () => {
        subs.delete(fn);
      };
    },
  };
}

// ------------------------------------------------------------ post state

const viewerOverrides = createStore(new Map<number, ViewerState>());
const hiddenPosts = createStore(new Set<number>());
// Replies the user added this session: count at the time plus how many since.
const replyBumps = createStore(new Map<number, { base: number; added: number }>());

export function usePostState(post: PostView) {
  const override = useSyncExternalStore(
    viewerOverrides.subscribe,
    () => viewerOverrides.get().get(post.id),
    () => undefined,
  );
  const hidden = useSyncExternalStore(
    hiddenPosts.subscribe,
    () => hiddenPosts.get().has(post.id),
    () => false,
  );
  const bump = useSyncExternalStore(
    replyBumps.subscribe,
    () => replyBumps.get().get(post.id),
    () => undefined,
  );
  const viewer = override ?? post.viewer;
  // Server counts already include the user's own like / repost; adjust only
  // by the difference between the optimistic flag and the server's flag.
  const diff = (a: boolean, b: boolean) => (a === b ? 0 : a ? 1 : -1);
  const counts = {
    ...post.counts,
    likes: Math.max(0, post.counts.likes + diff(viewer.liked, post.viewer.liked)),
    reposts: Math.max(0, post.counts.reposts + diff(viewer.reposted, post.viewer.reposted)),
    replies: bump ? Math.max(post.counts.replies, bump.base + bump.added) : post.counts.replies,
  };
  return { viewer, counts, hidden };
}

type Flag = keyof ViewerState;
const EVENTS: Record<Flag, [InteractionEvent["type"], InteractionEvent["type"]]> = {
  liked: ["like", "unlike"],
  reposted: ["repost", "unrepost"],
  bookmarked: ["bookmark", "unbookmark"],
};

/** Flip like / repost / bookmark optimistically and record the signal. */
export function toggleFlag(post: PostView, current: ViewerState, flag: Flag) {
  const next = { ...current, [flag]: !current[flag] };
  const map = new Map(viewerOverrides.get());
  map.set(post.id, next);
  viewerOverrides.set(map);
  track({ type: next[flag] ? EVENTS[flag][0] : EVENTS[flag][1], postId: post.id });
}

export function hidePost(id: number) {
  const set = new Set(hiddenPosts.get());
  set.add(id);
  hiddenPosts.set(set);
  track({ type: "not_interested", postId: id });
}

function bumpReplies(parentId: number, base: number) {
  const map = new Map(replyBumps.get());
  const prev = map.get(parentId);
  map.set(parentId, { base: prev?.base ?? base, added: (prev?.added ?? 0) + 1 });
  replyBumps.set(map);
}

// ---------------------------------------------------------- follow state

const followServer = createStore(new Map<string, boolean>()); // what the API last said
const followOverrides = createStore(new Map<string, boolean>()); // what the user just did

const key = (handle: string) => handle.toLowerCase();

/** Remember follow state reported by the API (profiles, who to follow). */
export function noteFollowState(handle: string, following: boolean) {
  const map = followServer.get();
  if (map.get(key(handle)) === following) return;
  const next = new Map(map);
  next.set(key(handle), following);
  followServer.set(next);
}

/** The user's follow state for an account; undefined when not known yet. */
export function useFollowing(handle: string, fromServer?: boolean): boolean | undefined {
  const override = useSyncExternalStore(
    followOverrides.subscribe,
    () => followOverrides.get().get(key(handle)),
    () => undefined,
  );
  const known = useSyncExternalStore(
    followServer.subscribe,
    () => followServer.get().get(key(handle)),
    () => undefined,
  );
  return override ?? fromServer ?? known;
}

/** Follow or unfollow, record it, then tell every screen. */
export async function setFollow(handle: string, follow: boolean, postId?: number) {
  const map = new Map(followOverrides.get());
  map.set(key(handle), follow);
  followOverrides.set(map);
  const event: InteractionEvent = { type: follow ? "follow" : "unfollow", handle };
  if (postId != null) event.postId = postId;
  // Sent directly rather than through the batched track() so the reloads
  // triggered by the bus see the new state.
  try {
    await postJson("/api/interact", { events: [event] });
  } catch {
    // keep the optimistic state; the next poll reconciles it
  }
  bus.emit("follow");
  void refreshMe();
}

// A restore or reset rewinds the world: drop every optimistic override.
if (typeof window !== "undefined") {
  bus.on("sim", () => {
    viewerOverrides.set(new Map());
    replyBumps.set(new Map());
    followOverrides.set(new Map());
    followServer.set(new Map());
  });
}

// -------------------------------------------------------- created posts

const createdListeners = new Set<(post: PostView) => void>();

/** Listen for posts the user creates, with the post itself. */
export function onPostCreated(fn: (post: PostView) => void): () => void {
  createdListeners.add(fn);
  return () => {
    createdListeners.delete(fn);
  };
}

export function announcePost(post: PostView, parent?: PostView) {
  if (parent && post.replyTo?.id === parent.id) bumpReplies(parent.id, parent.counts.replies);
  createdListeners.forEach((fn) => fn(post));
  bus.emit("posted");
}

// ------------------------------------------------------- compose dialog

export interface ComposeTarget {
  replyTo?: PostView;
  quote?: PostView;
}

const composer = createStore<ComposeTarget | null>(null);

export function openComposer(target: ComposeTarget = {}) {
  composer.set(target);
}

export function closeComposer() {
  composer.set(null);
}

export function useComposerTarget(): ComposeTarget | null {
  return useSyncExternalStore(composer.subscribe, composer.get, () => null);
}
