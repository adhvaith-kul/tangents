"use client";
// The in-app browser: a dark window over the dimmed app with close, back,
// forward, an address field and reload, showing a publisher's page rendered
// by that site's template. Back and forward walk the window's own history.
import { useEffect, useRef, useState, useSyncExternalStore, type ComponentType, type ReactNode } from "react";
import { ErrorState } from "@/components/core/ErrorState";
import { Spinner } from "@/components/core/Spinner";
import { Icon } from "@/components/icons";
import { getJson, track, useSimNow } from "@/lib/client";
import { siteFor, splitUrl, type TemplateKey } from "@/lib/sites";
import type { ArticleCard, ArticleResponse } from "@/lib/types";
import type { TemplateProps } from "./parts";
import { close, getSession, hintFor, navigate, step, subscribe, type Session } from "./store";
import { BroadsheetPage } from "./templates/Broadsheet";
import { BusinessPage } from "./templates/Business";
import { CablePage } from "./templates/Cable";
import { GlossyPage } from "./templates/Glossy";
import { GovernmentPage } from "./templates/Government";
import { NewsroomPage } from "./templates/Newsroom";
import { TabloidPage } from "./templates/Tabloid";
import { TechPage } from "./templates/Tech";
import { TradePage } from "./templates/Trade";
import { WirePage } from "./templates/Wire";

const TEMPLATES: Record<TemplateKey, ComponentType<TemplateProps>> = {
  wire: WirePage,
  broadsheet: BroadsheetPage,
  business: BusinessPage,
  cable: CablePage,
  tabloid: TabloidPage,
  trade: TradePage,
  tech: TechPage,
  glossy: GlossyPage,
  newsroom: NewsroomPage,
  government: GovernmentPage,
};

type Result = ArticleResponse | "error";

function ChromeButton({
  label, onClick, disabled = false, children,
}: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-x-text transition-colors hover:bg-x-hover disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function Padlock() {
  return (
    <svg viewBox="0 0 24 24" width={14} height={14} aria-hidden className="shrink-0 fill-current text-x-dim">
      <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 1 1 6 0v3H9z" />
    </svg>
  );
}

function ReloadGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden className="fill-current">
      <path d="M12 4a8 8 0 0 0-7.94 7H2l3 4 3-4H6.07A6 6 0 1 1 12 18a5.96 5.96 0 0 1-4.24-1.76l-1.42 1.42A8 8 0 1 0 12 4z" />
    </svg>
  );
}

function BrowserWindow({ session }: { session: Session }) {
  const id = session.stack[session.index];
  const now = useSimNow(30_000);
  const [nonce, setNonce] = useState(0);
  const [results, setResults] = useState<Record<string, Result>>({});
  const requested = useRef(new Set<string>());
  const tracked = useRef(new Set<number>());
  const scroller = useRef<HTMLDivElement>(null);

  const key = `${id}#${nonce}`;
  const result = results[key];
  const data = result && result !== "error" ? result : null;

  useEffect(() => {
    if (requested.current.has(key)) return;
    requested.current.add(key);
    getJson<ArticleResponse>(`/api/article/${id}`)
      .then((r) => setResults((m) => ({ ...m, [key]: r })))
      .catch(() => setResults((m) => ({ ...m, [key]: "error" })));
  }, [id, key]);

  useEffect(() => {
    if (!data || tracked.current.has(data.article.id)) return;
    tracked.current.add(data.article.id);
    track({ type: "open", articleId: data.article.id });
  }, [data]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, []);

  // Keyboard scrolling (space, arrows) goes to the page.
  useEffect(() => {
    scroller.current?.focus({ preventScroll: true });
  }, [key, data]);

  const card: ArticleCard | undefined = data?.article ?? hintFor(id);
  const site = card ? siteFor(card.outlet) : null;
  const { host, path } = splitUrl(card?.url ?? "");
  const Template = site ? TEMPLATES[site.template] : null;
  const reload = () => setNonce((n) => n + 1);
  const open = (c: ArticleCard) => navigate(c.id, c);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(91,112,131,0.4)] p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={card?.headline ?? "Browser"}
        className="flex h-full max-h-[calc(100vh-32px)] w-full max-w-[1100px] flex-col overflow-hidden rounded-xl bg-x-bg shadow-[0_0_15px_rgba(255,255,255,0.2),0_0_3px_1px_rgba(255,255,255,0.15)]"
      >
        <div className="flex h-[53px] shrink-0 items-center gap-1 border-b border-x-border px-2">
          <ChromeButton label="Close" onClick={close}>
            <Icon name="close" size={20} />
          </ChromeButton>
          <ChromeButton label="Back" onClick={() => step(-1)} disabled={session.index === 0}>
            <Icon name="back" size={20} />
          </ChromeButton>
          <ChromeButton label="Forward" onClick={() => step(1)} disabled={session.index >= session.stack.length - 1}>
            <Icon name="back" size={20} className="-scale-x-100" />
          </ChromeButton>
          <div className="mx-2 flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full bg-x-search px-4 text-[15px] leading-5">
            <Padlock />
            <span className="min-w-0 truncate" title={card?.url}>
              <span className="text-x-text">{host}</span>
              <span className="text-x-dim">{path}</span>
            </span>
          </div>
          <ChromeButton label="Reload" onClick={reload}>
            <ReloadGlyph />
          </ChromeButton>
        </div>

        <div
          key={key}
          ref={scroller}
          tabIndex={-1}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none"
          style={{ background: site?.palette.bg ?? "#ffffff" }}
        >
          {data && site && Template ? (
            <Template site={site} page={data.article} more={data.more} now={now} open={open} />
          ) : result === "error" ? (
            <ErrorState onRetry={reload} />
          ) : (
            <Spinner className="pt-10" />
          )}
        </div>
      </div>
    </div>
  );
}

/** Renders the open window, if any. Mounted once, in its own root, by open.tsx. */
export function BrowserHost() {
  const session = useSyncExternalStore(subscribe, getSession, () => null);
  return session ? <BrowserWindow key={session.key} session={session} /> : null;
}
