"use client";
// Technology site: a compact header, a monospaced kicker, a tight heavy
// headline, an author chip and a numbered grid of more stories. Works light
// (TechCrunch) or dark (The Verge) from the palette.
import { FONTS, sectionFor, zoneParts } from "@/lib/sites";
import {
  Inert, PageLink, ago, initials, bylineText, clock, isReported, shortDate, paragraphs, updatedNote, type TemplateProps,
} from "../parts";

export function TechPage({ site, page, more, now, open }: TemplateProps) {
  const p = site.palette;
  const z = site.zone;
  const section = sectionFor(site, page.headline);
  const paras = paragraphs(page.body);
  const stamp = (t: number) => `${shortDate(t, z)}, ${zoneParts(t, z).year}, ${clock(t, z)} ${z}`;
  const updated = updatedNote(page, stamp);
  const byline = bylineText(site, page);

  return (
    <div className="min-h-full" style={{ background: p.bg, color: p.text, fontFamily: site.bodyFont }}>
      <header style={{ borderBottom: `1px solid ${p.rule}` }}>
        <div className="mx-auto flex h-16 max-w-[1040px] items-center gap-8 px-6" style={{ fontFamily: site.headlineFont }}>
          <span className="flex shrink-0 items-center gap-2.5">
            {site.mark ? (
              <span
                className="flex h-8 w-8 items-center justify-center text-[15px] font-black tracking-[-0.04em]"
                style={{ background: p.accent, color: p.bg }}
              >
                {site.mark}
              </span>
            ) : null}
            <span className={`font-black tracking-[-0.03em] ${site.mark ? "text-[22px]" : "text-[26px] uppercase"}`}>{site.name}</span>
          </span>
          <nav className="flex min-w-0 gap-6 overflow-hidden text-[14px] font-semibold" style={{ color: p.muted }}>
            {site.nav.map((n) => (
              <Inert key={n}>{n}</Inert>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-6 pb-16 pt-10">
        <Inert className="text-[12px] font-semibold uppercase tracking-[0.1em]" style={{ fontFamily: FONTS.mono, color: p.accent }}>
          {section.label}
        </Inert>
        <h1
          className="mt-3 text-[46px] font-extrabold leading-[1.04] tracking-[-0.03em]"
          style={{ fontFamily: site.headlineFont }}
        >
          {page.headline}
        </h1>
        {page.dek ? (
          <p className="mt-5 text-[20px] leading-[1.45]" style={{ color: p.muted, fontFamily: site.headlineFont }}>
            {page.dek}
          </p>
        ) : null}
        <div className="mt-7 flex items-center gap-3" style={{ fontFamily: site.headlineFont }}>
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[14px] font-bold"
            style={{ background: p.accent, color: p.bg }}
          >
            {initials(byline)}
          </span>
          <div className="text-[14px] leading-5">
            <div className="font-bold">{isReported(page) ? byline : site.desk}</div>
            <div className="text-[13px]" style={{ color: p.muted, fontFamily: FONTS.mono }}>
              {stamp(page.createdAt)}
            </div>
          </div>
        </div>
        {updated ? (
          <div className="mt-3 text-[13px]" style={{ color: p.muted, fontFamily: FONTS.mono }}>
            {updated}
          </div>
        ) : null}
        <div className="mt-9 max-w-[680px] space-y-[1.2em] text-[19px] leading-[1.7]">
          {paras.map((t, i) => (
            <p key={i}>{t}</p>
          ))}
        </div>

        {more.length ? (
          <section className="mt-16 pt-8" style={{ borderTop: `1px solid ${p.rule}` }}>
            <h2 className="text-[24px] font-extrabold tracking-[-0.02em]" style={{ fontFamily: site.headlineFont }}>
              More from {site.title}
            </h2>
            <ul className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {more.map((c, i) => (
                <li key={c.id} style={{ fontFamily: site.headlineFont }}>
                  <div className="text-[12px] font-semibold" style={{ color: p.accent, fontFamily: FONTS.mono }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <PageLink card={c} open={open} className="mt-1 block text-[18px] font-bold leading-snug hover:underline">
                    {c.headline}
                  </PageLink>
                  <div className="mt-1.5 text-[12px]" style={{ color: p.muted, fontFamily: FONTS.mono }}>
                    {ago(c.createdAt, now, z)}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  );
}
