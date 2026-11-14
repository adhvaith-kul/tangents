"use client";
// Newspaper of record: centred masthead over ruled section links, a serif
// headline, byline and date between rules, one measured serif column.
import { FONTS, sectionFor } from "@/lib/sites";
import {
  Inert, PageLink, apDate, bylineText, clock, fullDate, isReported, paragraphs, updatedNote, type TemplateProps,
} from "../parts";

export function BroadsheetPage({ site, page, more, now, open }: TemplateProps) {
  const p = site.palette;
  const z = site.zone;
  const section = sectionFor(site, page.headline);
  const paras = paragraphs(page.body);
  const stamp = (t: number) => `${apDate(t, z)}, ${clock(t, z, true)} ${z}`;
  const updated = updatedNote(page, stamp);
  const blackletter = site.mastheadFont === FONTS.blackletter;
  const long = site.name.length > 18;

  return (
    <div className="min-h-full" style={{ background: p.bg, color: p.text, fontFamily: site.bodyFont }}>
      <header className="mx-auto max-w-[1040px] px-6" style={{ fontFamily: FONTS.sans }}>
        <div className="flex h-10 items-center justify-between text-[12px]" style={{ color: p.muted }}>
          <span className="font-semibold" style={{ color: p.text }}>
            {fullDate(now, z)}
          </span>
          <Inert>Today’s Paper</Inert>
        </div>
        <div className="pb-3 pt-1 text-center">
          <span
            className={`inline-block leading-none ${blackletter ? "text-[50px]" : long ? "text-[34px] font-bold tracking-[0.04em]" : "text-[44px] font-black tracking-[-0.01em]"}`}
            style={{ fontFamily: site.mastheadFont }}
          >
            {site.name}
          </span>
        </div>
        <nav
          className="flex justify-center gap-6 overflow-hidden py-2.5 text-[13px]"
          style={{ borderTop: `1px solid ${p.rule}`, borderBottom: `3px double ${p.text}` }}
        >
          {site.nav.map((n) => (
            <Inert key={n}>{n}</Inert>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-[680px] px-6 pb-12 pt-10">
        <Inert className="text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ fontFamily: FONTS.sans, color: p.accent }}>
          {section.label}
        </Inert>
        <h1 className="mt-2 text-[40px] font-bold leading-[1.12] tracking-[-0.005em]" style={{ fontFamily: site.headlineFont }}>
          {page.headline}
        </h1>
        {page.dek ? (
          <p className="mt-4 text-[20px] leading-[1.45]" style={{ color: p.muted }}>
            {page.dek}
          </p>
        ) : null}
        <div
          className="mt-7 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3 text-[14px]"
          style={{ fontFamily: FONTS.sans, borderTop: `1px solid ${p.rule}`, borderBottom: `1px solid ${p.rule}` }}
        >
          <span>
            {isReported(page) ? "By " : null}
            <span className="font-bold">{bylineText(site, page)}</span>
          </span>
          <span className="text-right text-[13px]" style={{ color: p.muted }}>
            Published {stamp(page.createdAt)}
            {updated ? <span className="block">{updated}</span> : null}
          </span>
        </div>
        <div className="mt-8 text-[19px] leading-[1.62]">
          {paras.map((t, i) => (
            <p key={i} className="mb-[1.1em]">
              {t}
            </p>
          ))}
        </div>
      </main>

      {more.length ? (
        <section className="mx-auto max-w-[1040px] px-6 pb-14">
          <div className="pt-3" style={{ borderTop: `2px solid ${p.text}` }}>
            <h2 className="text-[13px] font-bold uppercase tracking-[0.08em]" style={{ fontFamily: FONTS.sans }}>
              More from {site.title}
            </h2>
          </div>
          <ul className="mt-5 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((c) => (
              <li key={c.id}>
                <PageLink card={c} open={open} className="block hover:underline">
                  <span className="block text-[19px] font-bold leading-[1.25]" style={{ fontFamily: site.headlineFont }}>
                    {c.headline}
                  </span>
                </PageLink>
                {c.dek ? (
                  <p className="mt-2 line-clamp-3 text-[15px] leading-[1.45]" style={{ color: p.muted }}>
                    {c.dek}
                  </p>
                ) : null}
                <div className="mt-2 text-[12px]" style={{ fontFamily: FONTS.sans, color: p.muted }}>
                  {apDate(c.createdAt, z)}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="mx-auto max-w-[1040px] px-6 pb-10">
        <div className="pt-6 text-center" style={{ borderTop: `1px solid ${p.rule}` }}>
          <span className={`text-[24px] ${blackletter ? "" : "font-bold"}`} style={{ fontFamily: site.mastheadFont }}>
            {site.name}
          </span>
        </div>
      </footer>
    </div>
  );
}
