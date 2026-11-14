"use client";
// Chat: there is nobody to message in a single-player world, so this is X's empty screen.
import { Shell } from "@/components/Shell";
import { EmptyState } from "@/components/core/EmptyState";

export default function ChatPage() {
  return (
    <Shell title="Chat">
      <EmptyState
        title="Welcome to your inbox!"
        body="Drop a line, share posts and more with private conversations between you and others on X."
        action={{ label: "Write a message", href: "/messages" }}
      />
    </Shell>
  );
}
