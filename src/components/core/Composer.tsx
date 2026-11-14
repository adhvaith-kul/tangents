"use client";
// The post composer: inline on Home, inline under a focused post (collapsed
// to one row until focused), and inside the compose dialog. Auto-growing
// textarea, decorative media and emoji buttons, the character ring and the
// Post / Reply button. 280-character limit.
import { useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon, type IconName } from "@/components/icons";
import { postJson, useMe } from "@/lib/client";
import type { CreatePostRequest, CreatePostResponse, PostView } from "@/lib/types";
import { QuoteCard } from "./PostEmbeds";
import { announcePost } from "./state";

const LIMIT = 280;

function ToolButton({ icon, label }: { icon: IconName; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-x-blue transition-colors hover:bg-x-blue/10"
    >
      <Icon name={icon} size={20} />
    </button>
  );
}

/** X's progress ring. Shown once 20 characters remain; red and counting below zero. */
function CharRing({ length }: { length: number }) {
  const remaining = LIMIT - length;
  if (remaining > 20) return null;
  if (remaining < -9) {
    return <span className="text-[13px] leading-4 text-x-red">{remaining}</span>;
  }
  const r = 13;
  const c = 2 * Math.PI * r;
  const progress = Math.min(length / LIMIT, 1);
  const colour = remaining <= 0 ? "#f4212e" : "#ffd400";
  return (
    <div className="relative flex h-[30px] w-[30px] items-center justify-center">
      <svg width="30" height="30" viewBox="0 0 30 30" className="absolute inset-0 -rotate-90">
        <circle cx="15" cy="15" r={r} fill="none" stroke="#2f3336" strokeWidth="2" />
        <circle
          cx="15"
          cy="15"
          r={r}
          fill="none"
          stroke={colour}
          strokeWidth="2"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          strokeLinecap="round"
        />
      </svg>
      <span className={`relative text-[13px] leading-4 ${remaining <= 0 ? "text-x-red" : "text-x-dim"}`}>
        {remaining}
      </span>
    </div>
  );
}

export function Composer({
  variant,
  replyTo,
  quote,
  autoFocus = false,
  onDone,
}: {
  /** home: inline on Home. reply: inline under a focused post. dialog: in the compose dialog. */
  variant: "home" | "reply" | "dialog";
  replyTo?: PostView;
  quote?: PostView;
  autoFocus?: boolean;
  onDone?: () => void;
}) {
  const me = useMe();
  const area = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [expanded, setExpanded] = useState(variant !== "reply");
  const [sending, setSending] = useState(false);

  const isReply = replyTo != null;
  const placeholder = isReply ? "Post your reply" : quote ? "Add a comment" : "What’s happening?";
  const buttonLabel = isReply ? "Reply" : "Post";
  const canPost = text.trim().length > 0 && text.length <= LIMIT && !sending;

  const grow = () => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  const submit = async () => {
    if (!canPost) return;
    setSending(true);
    const body: CreatePostRequest = { text };
    if (replyTo) body.replyTo = replyTo.id;
    if (quote) body.quoteOf = quote.id;
    try {
      const res = await postJson<CreatePostResponse>("/api/post", body);
      setText("");
      requestAnimationFrame(grow);
      if (variant === "reply") setExpanded(false);
      announcePost(res.post, replyTo);
      onDone?.();
    } catch {
      // Leave the text in place so nothing is lost; the button re-enables.
    } finally {
      setSending(false);
    }
  };

  const postButton = (
    <button
      type="button"
      disabled={!canPost}
      onClick={() => void submit()}
      className="h-9 shrink-0 rounded-full bg-x-button px-4 text-[15px] font-bold leading-5 text-black transition-colors hover:bg-x-button-hover disabled:cursor-default disabled:opacity-50 disabled:hover:bg-x-button"
    >
      {buttonLabel}
    </button>
  );

  const collapsed = !expanded;

  return (
    <div className={`px-4 ${variant === "dialog" ? "" : "border-b border-x-border"} ${variant === "home" ? "pt-1" : ""}`}>
      {variant === "reply" && expanded && replyTo ? (
        <div className="pl-12 pt-3 text-[15px] leading-5 text-x-dim">
          Replying to <span className="text-x-blue">@{replyTo.author.handle}</span>
        </div>
      ) : null}
      <div className="flex">
        <div className="mr-2 shrink-0 pt-3">
          {me ? (
            <Avatar account={me} size={40} />
          ) : (
            <div className="h-10 w-10 rounded-full bg-x-search" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center">
            <textarea
              ref={area}
              rows={1}
              value={text}
              autoFocus={autoFocus}
              placeholder={placeholder}
              onFocus={() => setExpanded(true)}
              onChange={(e) => {
                setText(e.target.value);
                grow();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void submit();
                }
              }}
              className={`block w-full resize-none overflow-hidden bg-transparent py-3 text-xl leading-6 text-x-text outline-none placeholder:text-x-dim ${variant === "dialog" ? "min-h-[96px]" : ""}`}
            />
            {collapsed ? <div className="ml-3">{postButton}</div> : null}
          </div>
          {quote ? (
            <div className="mb-3">
              <QuoteCard
                quote={{ id: quote.id, author: quote.author, text: quote.text, createdAt: quote.createdAt }}
                isStatic
              />
            </div>
          ) : null}
          {collapsed ? (
            <div className="pb-2" />
          ) : (
            <div
              className={`flex items-center justify-between ${variant === "dialog" ? "mt-1 border-t border-x-border py-2" : "pb-2"}`}
            >
              <div className="-ml-2 flex items-center">
                <ToolButton icon="media" label="Media" />
                <ToolButton icon="emoji" label="Emoji" />
              </div>
              <div className="flex items-center gap-3">
                <CharRing length={text.length} />
                {postButton}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
