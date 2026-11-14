"use client";
// Brok, this world's assistant, on its own screen. X's Grok page is the
// model: a mark and a few suggestions when the conversation is empty, then the
// reader's questions in bubbles on the right and the answers as plain text on
// the left, with the composer pinned to the bottom of the column. Brok only
// answers; it never changes the world.
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Avatar } from "@/components/Avatar";
import { Glyph } from "@/components/core/glyphs";
import { RichText } from "@/components/core/RichText";
import { GrokMark, Icon } from "@/components/icons";
import { Shell } from "@/components/Shell";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useApi } from "@/lib/client";
import type { PostView, SidebarResponse, ThreadResponse } from "@/lib/types";
import { ask, clear, keyFor, retry, useConversation, type Exchange } from "./store";

const LIMIT = 280;
const EXPLAIN = "Explain this post";

/** Up to four questions about what is on the timeline right now. */
function suggestionsFrom(sidebar: SidebarResponse | undefined): string[] {
  const out: string[] = [];
  const top = sidebar?.news?.[0];
  if (top) out.push(`What is going on with “${top.headline}”?`);
  const mover = [...(sidebar?.stocks ?? [])].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))[0];
  if (mover && Math.abs(mover.changePct) >= 0.5) {
    out.push(`Why is $${mover.ticker} ${mover.changePct < 0 ? "down" : "up"} today?`);
  }
  const trend = sidebar?.trends.find((t) => !top || t.storylineId !== top.storylineId) ?? sidebar?.trends[0];
  if (trend) out.push(`Why is ${trend.label} trending?`);
  out.push("What did I miss today?");
  return out.slice(0, 4);
}

function Mark({ size }: { size: number }) {
  return (
    <span
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full border border-x-border text-x-text"
    >
      <GrokMark size={size * 0.56} />
    </span>
  );
}

/** The post a conversation is about, small, above the conversation. */
function PostContext({ post }: { post: PostView }) {
  return (
    <Link
      href={`/post/${post.id}`}
      className="mx-4 mt-3 block rounded-2xl border border-x-border px-3 py-2.5 transition-colors hover:bg-x-hover-soft"
    >
      <div className="flex min-w-0 items-center text-[15px] leading-5">
        <Avatar account={post.author} size={20} />
        <span className="ml-1.5 truncate font-bold text-x-text">{post.author.name}</span>
        {post.author.badge ? (
          <span className="ml-0.5 flex shrink-0">
            <VerifiedBadge badge={post.author.badge} size={16} />
          </span>
        ) : null}
        <span className="ml-1 truncate text-x-dim">@{post.author.handle}</span>
      </div>
      {post.text ? (
        <div className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-[15px] leading-5 text-x-text">
          {post.text}
        </div>
      ) : null}
    </Link>
  );
}

function Turn({ x, onRetry }: { x: Exchange; onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-3xl rounded-br-md bg-[#202327] px-4 py-2.5 text-[15px] leading-5 text-x-text">
          {x.label}
        </div>
      </div>
      <div className="flex items-start gap-3">
        <Mark size={32} />
        <div className="min-w-0 flex-1 pt-1.5 text-[15px] leading-5">
          {x.pending ? (
            <span className="inline-flex items-center gap-1 text-x-dim" role="status">
              Brok is thinking
              <span className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={{ animationDelay: `${i * 200}ms` }}
                    className="h-1 w-1 animate-pulse rounded-full bg-x-dim"
                  />
                ))}
              </span>
            </span>
          ) : x.error ? (
            <div>
              <div className="text-x-red">{x.error}</div>
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 flex h-8 items-center rounded-full border border-[#536471] px-4 text-[14px] font-bold leading-4 text-x-text transition-colors hover:bg-x-hover"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="whitespace-pre-wrap break-words text-x-text">
              <RichText text={x.answer ?? ""} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AskBox({ busy, onAsk, placeholder }: { busy: boolean; onAsk: (text: string) => void; placeholder: string }) {
  const [text, setText] = useState("");
  const box = useRef<HTMLTextAreaElement>(null);
  const ready = text.trim().length > 0 && !busy;

  // Grow with the text, up to about six lines.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [text]);

  const send = () => {
    if (!ready) return;
    onAsk(text.trim());
    setText("");
  };
  const key = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="sticky bottom-0 bg-x-bg px-4 pb-3 pt-2">
      <div className="flex items-end gap-2 rounded-3xl border border-x-border bg-[#16181c] py-1.5 pl-4 pr-1.5 focus-within:border-x-blue">
        <textarea
          ref={box}
          rows={1}
          value={text}
          maxLength={LIMIT}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={key}
          placeholder={placeholder}
          aria-label="Ask Brok"
          className="max-h-32 min-h-9 flex-1 resize-none bg-transparent py-2 text-[15px] leading-5 text-x-text outline-none placeholder:text-x-dim"
        />
        {text.length >= LIMIT - 40 ? (
          <span
            className={`pb-2.5 text-[13px] leading-4 ${text.length >= LIMIT ? "text-x-red" : "text-x-dim"}`}
            aria-live="polite"
          >
            {LIMIT - text.length}
          </span>
        ) : null}
        <button
          type="button"
          aria-label="Ask"
          disabled={!ready}
          onClick={send}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-x-button text-[#0f1419] transition-colors hover:bg-x-button-hover disabled:opacity-40 disabled:hover:bg-x-button"
        >
          <Icon name="arrowUp" size={18} />
        </button>
      </div>
    </div>
  );
}

export function BrokScreen({ postId }: { postId: number | null }) {
  const key = keyFor(postId);
  const turns = useConversation(key);
  const busy = turns.some((x) => x.pending);
  const { data: sidebar } = useApi<SidebarResponse>("/api/sidebar");
  const { data: thread } = useApi<ThreadResponse>(postId != null ? `/api/post/${postId}` : null);
  const suggestions = useMemo(() => suggestionsFrom(sidebar), [sidebar]);
  const end = useRef<HTMLDivElement>(null);

  // Opened from a post's Brok button: ask for the explanation once. The store
  // adds the question synchronously, so a second run of this effect finds it.
  useEffect(() => {
    if (postId != null && turns.length === 0) ask(key, EXPLAIN, "", postId);
    // Only when the post changes; a cleared conversation stays cleared.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, postId]);

  // Keep the newest turn in view as questions are asked and answers arrive.
  const settled = turns.filter((x) => !x.pending).length;
  useEffect(() => {
    if (turns.length) end.current?.scrollIntoView({ block: "end" });
  }, [turns.length, settled]);

  const send = (text: string) => ask(key, text, text, postId);

  const header = (
    <div className="flex h-[53px] items-center px-4">
      <h2 className="min-w-0 flex-1 truncate text-xl font-bold leading-6 text-x-text">Brok</h2>
      {turns.length > 0 && !busy ? (
        <button
          type="button"
          aria-label="Clear conversation"
          title="Clear conversation"
          onClick={() => clear(key)}
          className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full text-x-text transition-colors hover:bg-x-hover"
        >
          <Glyph name="trash" size={20} />
        </button>
      ) : null}
    </div>
  );

  return (
    <Shell header={header}>
      {thread?.post ? <PostContext post={thread.post} /> : null}
      {turns.length === 0 ? (
        // The column is as tall as the page (the right column sets that), so the
        // empty state is sized to the window: header above, composer below.
        <div className="flex min-h-[calc(100vh-123px)] flex-col items-center justify-center px-8 py-6 text-center">
          <span className="text-x-text">
            <GrokMark size={56} />
          </span>
          <div className="mt-5 text-[31px] font-extrabold leading-9 text-x-text">Brok</div>
          <div className="mt-2 text-[15px] leading-5 text-x-dim">Ask about anything happening on your timeline.</div>
          <div className="mt-7 flex w-full max-w-[440px] flex-col gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-2xl border border-x-border px-4 py-2.5 text-left text-[15px] leading-5 text-x-text transition-colors hover:bg-x-hover-soft"
              >
                <span className="line-clamp-2">{s}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex min-h-[calc(100vh-123px)] flex-col gap-6 px-4 pb-4 pt-5">
          {turns.map((x) => (
            <Turn key={x.id} x={x} onRetry={() => retry(key, x.id)} />
          ))}
          {/* Stops short of the composer when scrolled into view. */}
          <div ref={end} className="scroll-mb-24" />
        </div>
      )}
      <AskBox
        busy={busy}
        onAsk={send}
        placeholder={postId != null ? "Ask about this post" : "Ask anything"}
      />
    </Shell>
  );
}
