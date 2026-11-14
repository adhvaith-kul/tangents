"use client";
// X's "Translate post" link under a post written in another language, and the
// English text it reveals in place. The translation arrives with the post.
import { useState } from "react";
import type { ArticleCard } from "@/lib/types";
import { RichText } from "./RichText";

export function Translation({
  translation,
  article,
  large = false,
}: {
  translation: { lang: string; text: string };
  article?: ArticleCard | null;
  large?: boolean;
}) {
  const [shown, setShown] = useState(false);
  const size = large ? "text-[15px] leading-5" : "text-[13px] leading-4";
  const body = large ? "text-[17px] leading-6" : "text-[15px] leading-5";
  return (
    <>
      <div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShown((s) => !s);
          }}
          className={`text-x-blue hover:underline ${size}`}
        >
          {shown ? "Show original" : "Translate post"}
        </button>
      </div>
      {shown ? (
        <div className="mt-1">
          <div className={`text-x-dim ${size}`}>Translated from {translation.lang}</div>
          <div className={`whitespace-pre-wrap break-words text-x-text ${body}`}>
            <RichText text={translation.text} article={article} />
          </div>
        </div>
      ) : null}
    </>
  );
}
