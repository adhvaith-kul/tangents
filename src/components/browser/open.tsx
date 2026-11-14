"use client";
// Public entry points of the in-app browser. The window lives in its own React
// root on document.body so it outlives whichever card or row opened it.
import type { MouseEvent } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ArticleCard } from "@/lib/types";
import { BrowserHost } from "./Browser";
import { dismissRoute, onPopState, start } from "./store";

const g = globalThis as typeof globalThis & { __tangentsBrowserRoot?: Root };

function mount() {
  if (typeof document === "undefined") return;
  if (!g.__tangentsBrowserRoot) {
    const el = document.createElement("div");
    el.id = "tangents-browser";
    document.body.appendChild(el);
    g.__tangentsBrowserRoot = createRoot(el);
  }
  // Rendering again is cheap and picks up a hot-reloaded host in development.
  g.__tangentsBrowserRoot.render(<BrowserHost />);
}

/** Open a page over the current screen and put /news/<id> in the address bar. */
export function openBrowser(card: ArticleCard) {
  mount();
  start(card.id, card);
}

/** Click handler for a link to a page: plain clicks open the browser in place;
 *  modified clicks (new tab, new window) keep the link's default. Never lets
 *  the click reach the post row underneath. */
export function openFromClick(e: MouseEvent, card: ArticleCard) {
  e.stopPropagation();
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  openBrowser(card);
}

/** Used by the /news/[id] route: show the page with `onExit` run on close. */
export function openRoute(id: number, onExit: () => void) {
  mount();
  start(id, undefined, onExit);
}

/** The /news/[id] route went away: drop its window. */
export function closeRoute() {
  dismissRoute();
}

if (typeof window !== "undefined") {
  window.addEventListener("popstate", (e) => {
    if (onPopState(e.state)) mount();
  });
}
