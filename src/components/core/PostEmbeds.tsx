"use client";
// What a post can carry below its text: a quoted post and a link card.
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { track, useSimNow } from "@/lib/client";
import { fullTime, timeAgo } from "@/lib/format";
import { openFromClick } from "@/components/browser/open";
import { splitUrl } from "@/lib/sites";
import type { ArticleCard, QuotedPost } from "@/lib/types";
import { RichText, cutText } from "./RichText";

/** A quoted post. Clicking it opens the quoted post unless `static` is set. */
export function QuoteCard({ quote, isStatic = false }: { quote: QuotedPost; isStatic?: boolean }) {
  const router = useRouter();
  const now = useSimNow();
  const { text, cut } = cutText(quote.text);
  const open = () => {
    track({ type: "open", postId: quote.id });
    router.push(`/post/${quote.id}`);
  };
  return (
    <div
      role={isStatic ? undefined : "link"}
      onClick={
        isStatic
          ? undefined
          : (e) => {
              e.stopPropagation();
              if (window.getSelection()?.toString()) return;
              open();
            }
      }
      className={`mt-3 overflow-hidden rounded-2xl border border-x-border transition-colors ${isStatic ? "" : "cursor-pointer hover:bg-x-hover-soft"}`}
    >
      <div className="p-3">
        <div className="flex min-w-0 items-center text-[15px] leading-5">
          <Avatar account={quote.author} size={24} className="mr-1" />
          <span className="truncate font-bold text-x-text">{quote.author.name}</span>
          {quote.author.badge ? (
            <span className="ml-0.5 flex shrink-0">
              <VerifiedBadge badge={quote.author.badge} size={18.75} />
            </span>
          ) : null}
          <span className="ml-1 truncate text-x-dim">@{quote.author.handle}</span>
          <span className="shrink-0 px-1 text-x-dim">·</span>
          <span className="shrink-0 text-x-dim" title={fullTime(quote.createdAt)}>
            {timeAgo(quote.createdAt, now)}
          </span>
        </div>
        <div className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-5 text-x-text">
          {isStatic ? text : <RichText text={text} />}
          {cut && !isStatic ? <span className="block text-x-blue hover:underline">Show more</span> : null}
        </div>
      </div>
    </div>
  );
}

/** X's summary card for a linked page, without an image: the site's domain,
 *  the headline and the standfirst. Opens the page in the in-app browser. */
export function ArticleCardView({ article }: { article: ArticleCard }) {
  const { host } = splitUrl(article.url);
  return (
    <a
      href={`/news/${article.id}`}
      onClick={(e) => openFromClick(e, article)}
      className="mt-3 block overflow-hidden rounded-2xl border border-x-border p-3 text-[15px] leading-5 transition-colors hover:bg-x-hover-soft"
    >
      <div className="flex items-center justify-between gap-2 text-x-dim">
        <span className="truncate text-[13px]">{host}</span>
        <span className="shrink-0 rounded border border-x-border bg-x-search px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-x-dim">
          Simulated News
        </span>
      </div>
      <div className="mt-1 font-bold text-x-text">{article.headline}</div>
      {article.dek ? <div className="mt-0.5 line-clamp-2 text-x-dim">{article.dek}</div> : null}
    </a>
  );
}
