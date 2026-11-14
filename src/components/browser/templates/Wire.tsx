"use client";
// Wire service: plain white page, dense sans text, the dateline leads the story.
import { sectionFor } from "@/lib/sites";
import {
  Inert, PageLink, ago, bylineText, clock, credits, datelineLead, isReported, longDate, paragraphs,
  updatedNote, type TemplateProps,
} from "../parts";

export function WirePage({ site, page, more, now, open }: TemplateProps) {
  const p = site.palette;
  const z = site.zone;
  const section = sectionFor(site, page.headline);
  const paras = paragraphs(page.body);
  const lead = datelineLead(site, page);
  const ap = site.dateline?.style === "plain";
  const stamp = (t: number) => (ap ? `${clock(t, z)} ${z}, ${longDate(t, z)}` : `${longDate(t, z)} ${clock(t, z)} ${z}`);
  const updated = updatedNote(page, stamp);
  const [editor] = credits(page.id, 1);

  return (
    <div className="min-h-full" style={{ background: p.bg, color: p.text, fontFamily: site.bodyFont }}>
      <header style={{ borderBottom: `1px solid ${p.rule}` }}>
        <div className="mx-auto flex h-16 max-w-[1040px] items-center gap-8 px-6">
          {site.mark ? (
            <span className="flex shrink-0 items-baseline gap-2">
              <span
                className="px-1.5 py-0.5 text-[24px] font-black leading-none tracking-tight"
                style={{ background: p.text, color: p.bg, fontFamily: site.headlineFont }}
              >
                {site.mark}
              </span>
              <span className="text-[15px] font-bold uppercase tracking-[0.08em]">News</span>
            </span>
          ) : (
            <span className="flex shrink-0 items-center gap-2 text-[26px] font-bold tracking-[-0.02em]" style={{ fontFamily: site.headlineFont }}>
              <span className="h-3.5 w-3.5 rounded-full" style={{ background: p.accent }} />
              {site.name}
            </span>
          )}
          <nav className="flex min-w-0 gap-5 overflow-hidden text-[14px] font-medium">
            {site.nav.map((n) => (
              <Inert key={n}>{n}</Inert>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1040px] px-6 pb-16 pt-7">
        <article className="max-w-[640px]">
          <Inert className="text-[13px] font-bold" style={{ color: p.accent }}>
            {section.label}
          </Inert>
          <h1 className="mt-2 text-[34px] font-bold leading-[1.15] tracking-[-0.01em]" style={{ fontFamily: site.headlineFont }}>
            {page.headline}
          </h1>
          {page.dek ? (
            <p className="mt-3 text-[18px] leading-[1.45]" style={{ color: p.muted }}>
              {page.dek}
            </p>
          ) : null}
          <div className="mt-5 pt-3 text-[14px] leading-5" style={{ borderTop: `1px solid ${p.rule}` }}>
            <div>
              By <span className={`font-bold ${ap ? "uppercase" : ""}`}>{bylineText(site, page)}</span>
            </div>
            <div className="mt-0.5" style={{ color: p.muted }}>
              {stamp(page.createdAt)}
              {updated ? <span> · {updated}</span> : null}
            </div>
          </div>
          <div className="mt-5 space-y-[0.85em] text-[17px] leading-[1.6]">
            {paras.map((t, i) => (
              <p key={i}>
                {i === 0 && lead ? <span className="font-semibold">{lead}</span> : null}
                {t}
              </p>
            ))}
          </div>
          {isReported(page) && !ap ? (
            <p className="mt-6 text-[14px] italic" style={{ color: p.muted }}>
              Reporting by {bylineText(site, page)}; Editing by {editor}
            </p>
          ) : null}
        </article>

        {more.length ? (
          <section className="mt-14 pt-4" style={{ borderTop: `3px solid ${p.text}` }}>
            <h2 className="text-[20px] font-bold" style={{ fontFamily: site.headlineFont }}>
              More from {site.title}
            </h2>
            <ul className="mt-2 grid gap-x-10 sm:grid-cols-2">
              {more.map((c) => (
                <li key={c.id} className="py-4" style={{ borderBottom: `1px solid ${p.rule}` }}>
                  <div className="text-[12px] font-semibold uppercase tracking-[0.04em]" style={{ color: p.muted }}>
                    {sectionFor(site, c.headline).label} · {ago(c.createdAt, now, z)}
                  </div>
                  <PageLink card={c} open={open} className="mt-1 block text-[17px] font-bold leading-snug hover:underline">
                    {c.headline}
                  </PageLink>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  );
}
