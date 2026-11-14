"use client";
// Posts already on screen as part of a conversation. A reply whose parent is in
// this set does not repeat "Replying to @handle", as on X's post page.
import { createContext, useContext } from "react";

export const ThreadContext = createContext<ReadonlySet<number>>(new Set());

export function useParentShown(parentId: number | undefined): boolean {
  const shown = useContext(ThreadContext);
  return parentId != null && shown.has(parentId);
}
