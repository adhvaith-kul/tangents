"use client";
// The post composer: inline on Home, inline under a focused post (collapsed
// to one row until focused), and inside the compose dialog. Auto-growing
// textarea, the poll and emoji tools, the character ring and the Post / Reply
// button. 280-character limit, counted as X counts it (postLength).
import { useCallback, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/icons";
import { postJson, useMe } from "@/lib/client";
import { postLength } from "@/lib/emoji";
import type { CreatePostRequest, CreatePostResponse, PostView } from "@/lib/types";
import { EmojiPicker } from "./EmojiPicker";
import { Glyph } from "./glyphs";
import { NEW_POLL, PollEditor, pollMinutes, type PollDraftState } from "./PollEditor";
import { QuoteCard } from "./PostEmbeds";
import { announcePost } from "./state";

const LIMIT = 280;

/** A toolbar icon. X draws them grey, 23px in a 36px circle; a disabled one is faded. */
function ToolButton({
  label,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full text-[#878e96] transition-colors hover:bg-x-hover disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

const TOOL = 23;

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
  const [poll, setPoll] = useState<PollDraftState | null>(null);
  const [emojiAt, setEmojiAt] = useState<DOMRect | null>(null);

  const isReply = replyTo != null;
  // As on X, a poll is for a new post only: replies and quotes have no poll tool.
  const canPoll = !isReply && !quote;
  const placeholder = isReply ? "Post your reply" : quote ? "Add a comment" : poll ? "Ask a question" : "What’s happening?";
  const buttonLabel = isReply ? "Reply" : "Post";
  const length = postLength(text);
  const pollReady = !poll || poll.choices.filter((c) => c.trim()).length >= 2;
  const canPost = text.trim().length > 0 && length <= LIMIT && pollReady && !sending;
  const closeEmoji = useCallback(() => setEmojiAt(null), []);

  const grow = () => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  /** Put an emoji where the caret is (or over the selection), and the caret after it. */
  const insertEmoji = (char: string) => {
    const el = area.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    setText(text.slice(0, start) + char + text.slice(end));
    setExpanded(true);
    requestAnimationFrame(() => {
      const at = start + char.length;
      el?.setSelectionRange(at, at);
      grow();
    });
  };

  const submit = async () => {
    if (!canPost) return;
    setSending(true);
    const body: CreatePostRequest = { text };
    if (replyTo) body.replyTo = replyTo.id;
    if (quote) body.quoteOf = quote.id;
    if (poll && canPoll) {
      body.poll = { choices: poll.choices.map((c) => c.trim()).filter(Boolean), minutes: pollMinutes(poll) };
    }
    try {
      const res = await postJson<CreatePostResponse>("/api/post", body);
      setText("");
      setPoll(null);
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
      className="h-9 min-w-[67px] shrink-0 rounded-full bg-x-button px-4 text-[15px] font-bold leading-5 text-[#0f1419] transition-colors hover:bg-x-button-hover disabled:cursor-default disabled:opacity-25 disabled:hover:bg-x-button"
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
        {/* Collapsed under a post, X's row is 68px: avatar at 14, text and button centred at 32. */}
        <div className={`mr-2 shrink-0 ${collapsed ? "pt-3.5" : "pt-3"}`}>
          {me ? (
            <Avatar account={me} size={40} />
          ) : (
            <div className="h-10 w-10 rounded-full bg-x-search" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className={`flex items-center ${collapsed ? "pt-2" : ""}`}>
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
              className={`block w-full resize-none overflow-hidden bg-transparent pl-0.5 text-xl leading-6 text-x-text outline-none placeholder:text-x-dim ${variant === "home" ? "pb-1 pt-5" : "py-3"} ${variant === "dialog" ? "min-h-[96px]" : ""}`}
            />
            {collapsed ? <div className="ml-3 mr-0.5">{postButton}</div> : null}
          </div>
          {poll && canPoll ? (
            <PollEditor poll={poll} onChange={setPoll} onRemove={() => setPoll(null)} />
          ) : null}
          {quote ? (
            <div className="mb-3">
              <QuoteCard
                quote={{ id: quote.id, author: quote.author, text: quote.text, createdAt: quote.createdAt }}
                isStatic
              />
            </div>
          ) : null}
          {collapsed ? (
            <div className="pb-3" />
          ) : (
            <div
              className={`flex h-12 items-center justify-between ${variant === "dialog" ? "mt-1 border-t border-x-border" : variant === "home" ? "mb-2 mt-3 pt-2" : "mb-2 mt-3"}`}
            >
              <div className="-ml-1.5 flex items-center gap-1">
                {canPoll ? (
                  <ToolButton label="Poll" disabled={poll != null} onClick={() => setPoll(NEW_POLL)}>
                    <Glyph name="poll" size={TOOL} />
                  </ToolButton>
                ) : null}
                <ToolButton
                  label="Emoji"
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    setEmojiAt((open) => (open ? null : r));
                  }}
                >
                  <Icon name="emoji" size={TOOL} />
                </ToolButton>
                {emojiAt ? <EmojiPicker anchor={emojiAt} onPick={insertEmoji} onClose={closeEmoji} /> : null}
              </div>
              <div className="flex items-center gap-3">
                <CharRing length={length} />
                {postButton}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
