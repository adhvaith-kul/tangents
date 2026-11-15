"use client";
// The Arc's site: the day's edition laid out as a modern newspaper front page.
// A centred nameplate over ruled section links, the lead and the secondary
// stories in the main column, In brief and the comment piece beside them, the
// tables printed from the ledgers, and the back issues at the foot. Each
// story's kicker is its storyline, linking to what has been posted about it.
// A page from The Arc that is not an edition reads as a broadsheet article.
import type { MouseEvent, ReactNode } from "react";
import { Spinner } from "@/components/core/Spinner";
import { useApi } from "@/lib/client";
import { editionDate, type Edition, type EditionResponse, type EditionStory } from "@/lib/arc";
import { FONTS, topicOf, type SiteConfig } from "@/lib/sites";
import { Inert, PageLink, fullDate, reporters, type TemplateProps } from "../parts";
import { close, getSession } from "../store";
import { BroadsheetPage } from "./Broadsheet";

const UP = "#1a7f37";
const DOWN = "#b3261e";

/** Leave the in-app browser for one of the app's own screens. The window lives
 *  in its own React root, outside Next's router context, so this uses the
 *  router instance Next keeps on `window`, once the window has handed back the
 *  history entry it pushed. Without it, a plain navigation. */
function goTo(href: string) {
  const router = (window as { next?: { router?: { push: (href: string) => void } } }).next?.router;
  if (!router) {
    window.location.assign(href);
    return;
  }
  const pushed = (window.history.state as Record<string, unknown> | null)?.tangentsBrowser != null;
  if (!getSession()?.onExit && pushed) {
    window.addEventListener("popstate", () => router.push(href), { once: true });
    close();
    return;
  }
  // On the /news/[id] route, leaving the route closes the window.
  router.push(href);
}

function StoryLink({ title, children, className = "", color }: { title: string; children: ReactNode; className?: string; color: string }) {
  const href = `/explore?q=${encodeURIComponent(title)}`;
  return (
    <a
      href={href}
      className={`hover:underline ${className}`}
      style={{ color }}
      onClick={(e: MouseEvent) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        goTo(href);
      }}
    >
      {children}
    </a>
  );
}

/** The small label over a headline: the story's storyline (a link), or its section. */
function Kicker({ site, story, titles }: { site: SiteConfig; story: Pick<EditionStory, "headline" | "storylineId">; titles: Record<number, string> }) {
  const title = story.storylineId != null ? titles[story.storylineId] : undefined;
  return (
    <div className="line-clamp-2 text-[13px] font-semibold leading-[1.35]" style={{ fontFamily: FONTS.sans }}>
      {title ? (
        <StoryLink title={title} color={site.palette.accent}>
          {title} ›
        </StoryLink>
      ) : (
        <Inert style={{ color: site.palette.accent }}>{site.sections[topicOf(story.headline)].label}</Inert>
      )}
    </div>
  );
}

function BoxTitle({ children, site }: { children: ReactNode; site: SiteConfig }) {
  return (
    <h2
      className="pb-2 text-[13px] font-bold uppercase tracking-[0.1em]"
      style={{ fontFamily: FONTS.sans, borderBottom: `2px solid ${site.palette.text}` }}
    >
      {children}
    </h2>
  );
}

function fmtClose(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return p >= 1 ? p.toFixed(2) : p.toPrecision(3);
}

function Tables({ site, e }: { site: SiteConfig; e: Edition }) {
  const p = site.palette;
  const boxes: ReactNode[] = [];
  if (e.scores.length) {
    boxes.push(
      <section key="scores">
        <BoxTitle site={site}>Scores</BoxTitle>
        <ul className="text-[14px]" style={{ fontFamily: FONTS.sans }}>
          {e.scores.map((s, i) => (
            <li key={i} className="py-2" style={{ borderBottom: `1px solid ${p.rule}` }}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: p.muted }}>
                {s.competition}
                {s.score.startsWith("1.") ? ` · ${s.title}` : ""}
              </div>
              <div className="mt-0.5 font-semibold tabular-nums">{s.score}</div>
            </li>
          ))}
        </ul>
      </section>,
    );
  }
  if (e.markets.length) {
    boxes.push(
      <section key="markets">
        <BoxTitle site={site}>Markets</BoxTitle>
        <table className="w-full text-[14px] tabular-nums" style={{ fontFamily: FONTS.sans }}>
          <tbody>
            {e.markets.map((m) => (
              <tr key={m.ticker} style={{ borderBottom: `1px solid ${p.rule}` }}>
                <td className="py-1.5 font-bold">{m.ticker}</td>
                <td className="py-1.5 text-right">{fmtClose(m.close)}</td>
                <td className="py-1.5 text-right font-semibold" style={{ color: m.changePct < 0 ? DOWN : UP }}>
                  {m.changePct < 0 ? "−" : "+"}
                  {Math.abs(m.changePct).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[12px]" style={{ color: p.muted, fontFamily: FONTS.sans }}>
          Closing prices on {editionDate(e.covers).split(",")[0]}, with the day’s change.
        </p>
      </section>,
    );
  }
  if (e.coming.length) {
    boxes.push(
      <section key="coming">
        <BoxTitle site={site}>Coming soon</BoxTitle>
        <ul className="text-[14px]">
          {e.coming.map((c, i) => (
            <li key={i} className="py-2" style={{ borderBottom: `1px solid ${p.rule}` }}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: p.muted, fontFamily: FONTS.sans }}>
                {c.kind}
                {c.release ? ` · ${c.release}` : ""}
              </div>
              <div className="mt-0.5 font-bold leading-snug" style={{ fontFamily: site.headlineFont }}>
                {c.title}
              </div>
              <div className="text-[13px]" style={{ color: p.muted }}>
                {c.maker}
              </div>
            </li>
          ))}
        </ul>
      </section>,
    );
  }
  if (e.corrections.length) {
    boxes.push(
      <section key="corrections">
        <BoxTitle site={site}>Corrections</BoxTitle>
        <div className="space-y-3 pt-2 text-[14px] leading-[1.5]">
          {e.corrections.map((c, i) => (
            <p key={i}>{c}</p>
          ))}
        </div>
      </section>,
    );
  }
  if (!boxes.length) return null;
  return (
    <div className="mt-12 grid gap-x-8 gap-y-10 pt-8 sm:grid-cols-2 lg:grid-cols-4" style={{ borderTop: `1px solid ${p.rule}` }}>
      {boxes}
    </div>
  );
}

export function ArcEdition({ site, page, data, now, open }: Omit<TemplateProps, "more"> & { data: EditionResponse }) {
  const p = site.palette;
  const e = data.edition;
  const titles = data.storylines;
  const byline = reporters(page.id).join(" and ");

  return (
    <div className="min-h-full" style={{ background: p.bg, color: p.text, fontFamily: site.bodyFont }}>
      <header className="mx-auto max-w-[1080px] px-6" style={{ fontFamily: FONTS.sans }}>
        <div className="flex h-10 items-center justify-between text-[12px]" style={{ color: p.muted }}>
          <span className="font-semibold" style={{ color: p.text }}>
            {fullDate(now, site.zone)}
          </span>
          <span className="flex gap-5">
            <Inert>Today’s Paper</Inert>
            <Inert>Back issues</Inert>
          </span>
        </div>
        <div className="pb-2 pt-1 text-center">
          <span className="inline-block text-[64px] leading-none tracking-[-0.01em]" style={{ fontFamily: site.mastheadFont }}>
            {site.name}
          </span>
        </div>
        <nav
          className="flex justify-center gap-6 overflow-hidden py-2.5 text-[13px] font-medium"
          style={{ borderTop: `1px solid ${p.rule}`, borderBottom: `3px double ${p.text}` }}
        >
          {site.nav.map((n) => (
            <Inert key={n}>{n}</Inert>
          ))}
        </nav>
        <div className="py-2 text-center text-[12px] uppercase tracking-[0.12em]" style={{ color: p.muted, borderBottom: `1px solid ${p.rule}` }}>
          Print edition · No. {e.number} · {editionDate(e.date)}
        </div>
      </header>

      <main className="mx-auto max-w-[1080px] px-6 pb-12 pt-8">
        <div className="grid gap-x-10 gap-y-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <article>
              <Kicker site={site} story={e.lead} titles={titles} />
              <h1 className="mt-2 text-[42px] font-bold leading-[1.08] tracking-[-0.01em]" style={{ fontFamily: site.headlineFont }}>
                {e.lead.headline}
              </h1>
              <p className="mt-3 text-[20px] leading-[1.45]" style={{ color: p.muted }}>
                {e.lead.standfirst}
              </p>
              <div className="mt-5 text-[13px]" style={{ fontFamily: FONTS.sans, color: p.muted }}>
                By <span className="font-bold" style={{ color: p.text }}>{byline}</span>
              </div>
              <div className="mt-5 text-[18px] leading-[1.62] sm:columns-2 sm:gap-8">
                {e.lead.paragraphs.map((t, i) => (
                  <p key={i} className="mb-[1em] break-inside-avoid-column">
                    {t}
                  </p>
                ))}
              </div>
            </article>

            {e.stories.length ? (
              <div className="mt-8 grid gap-x-8 sm:grid-cols-2" style={{ borderTop: `2px solid ${p.text}` }}>
                {e.stories.map((s, i) => (
                  <article key={i} className="py-6" style={{ borderBottom: `1px solid ${p.rule}` }}>
                    <Kicker site={site} story={s} titles={titles} />
                    <h2 className="mt-1.5 text-[23px] font-bold leading-[1.18]" style={{ fontFamily: site.headlineFont }}>
                      {s.headline}
                    </h2>
                    <p className="mt-2 text-[16px] leading-[1.55]">{s.text}</p>
                  </article>
                ))}
              </div>
            ) : null}
          </div>

          <aside className="min-w-0 lg:pl-8" style={{ borderLeft: `1px solid ${p.rule}` }}>
            {e.briefs.length ? (
              <section>
                <BoxTitle site={site}>In brief</BoxTitle>
                <ul>
                  {e.briefs.map((b, i) => (
                    <li key={i} className="py-3 text-[15px] leading-[1.5]" style={{ borderBottom: `1px solid ${p.rule}` }}>
                      {b}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            <section className={e.briefs.length ? "mt-10" : ""}>
              <BoxTitle site={site}>Comment</BoxTitle>
              <h2 className="mt-3 text-[24px] font-bold leading-[1.15]" style={{ fontFamily: site.headlineFont }}>
                {e.comment.headline}
              </h2>
              {e.comment.columnist ? (
                <div className="mt-2 text-[14px] italic" style={{ color: p.muted }}>
                  {e.comment.columnist}
                </div>
              ) : null}
              <div className="mt-3 space-y-[0.9em] text-[16px] leading-[1.55]">
                {e.comment.paragraphs.map((t, i) => (
                  <p key={i}>{t}</p>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <Tables site={site} e={e} />

        {data.backIssues.length ? (
          <section className="mt-14">
            <BoxTitle site={site}>Back issues</BoxTitle>
            <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
              {data.backIssues.map((b) => (
                <li key={b.card.id} className="py-4" style={{ borderBottom: `1px solid ${p.rule}` }}>
                  <div className="text-[12px] uppercase tracking-[0.08em]" style={{ color: p.muted, fontFamily: FONTS.sans }}>
                    No. {b.number} · {editionDate(b.date)}
                  </div>
                  <PageLink card={b.card} open={open} className="mt-1 block text-[18px] font-bold leading-[1.25] hover:underline">
                    <span style={{ fontFamily: site.headlineFont }}>{b.lead}</span>
                  </PageLink>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>

      <footer className="mx-auto max-w-[1080px] px-6 pb-10">
        <div className="pt-6 text-center" style={{ borderTop: `1px solid ${p.rule}` }}>
          <span className="text-[28px]" style={{ fontFamily: site.mastheadFont }}>
            {site.name}
          </span>
        </div>
      </footer>
    </div>
  );
}

export function ArcPage(props: TemplateProps) {
  const edition = props.page.kind === "edition";
  const { data, error } = useApi<EditionResponse>(edition ? `/api/edition/${props.page.id}` : null);
  if (!edition || error) return <BroadsheetPage {...props} />;
  if (!data) return <Spinner className="pt-10" />;
  return <ArcEdition site={props.site} page={props.page} data={data} now={props.now} open={props.open} />;
}
