"use client";
// Fashion magazine: a towering light Didone masthead, airy letterspaced nav,
// a centred light serif headline, generous whitespace and a drop cap.
import type { CSSProperties } from "react";
import { FONTS, sectionFor } from "@/lib/sites";
import {
  Inert, PageLink, bylineText, isReported, longDate, paragraphs, updatedNote, type TemplateProps,
} from "../parts";

export function GlossyPage({ site, page, more, open }: TemplateProps) {
  const p = site.palette;
  const z = site.zone;
  const section = sectionFor(site, page.headline);
  const paras = paragraphs(page.body);
  const updated = updatedNote(page, (t) => longDate(t, z));
  const caps = "uppercase tracking-[0.22em]";

  return (
    <div
      className="min-h-full"
      style={{ background: p.bg, color: p.text, fontFamily: site.bodyFont, "--display": site.headlineFont } as CSSProperties}
    >
      <header className="pt-9 text-center">
        <span className="text-[88px] font-normal leading-none tracking-[0.08em]" style={{ fontFamily: site.mastheadFont }}>
          {site.name}
        </span>
        <nav
          className={`mx-auto mt-7 flex max-w-[1040px] justify-center gap-9 overflow-hidden px-6 py-3.5 text-[11px] ${caps}`}
          style={{ fontFamily: FONTS.sans, borderTop: `1px solid ${p.rule}`, borderBottom: `1px solid ${p.rule}` }}
        >
          {site.nav.map((n) => (
            <Inert key={n}>{n}</Inert>
          ))}
        </nav>
      </header>

      <main className="pb-24 pt-20">
        <div className="text-center">
          <Inert className={`text-[11px] font-semibold ${caps}`} style={{ fontFamily: FONTS.sans }}>
            {section.label}
          </Inert>
        </div>
        <h1
          className="mx-auto mt-6 max-w-[860px] px-8 text-center text-[54px] font-light leading-[1.1] tracking-[-0.005em]"
          style={{ fontFamily: site.headlineFont }}
        >
          {page.headline}
        </h1>
        {page.dek ? (
          <p className="mx-auto mt-7 max-w-[600px] px-6 text-center text-[20px] leading-[1.55]" style={{ color: p.muted }}>
            {page.dek}
          </p>
        ) : null}
        <div className={`mt-10 text-center text-[11px] ${caps}`} style={{ fontFamily: FONTS.sans }}>
          <div className="font-semibold">
            {isReported(page) ? "By " : null}
            {bylineText(site, page)}
          </div>
          <div className="mt-2" style={{ color: p.muted }}>
            {longDate(page.createdAt, z)}
            {updated ? <span> · {updated}</span> : null}
          </div>
        </div>
        <div className="mx-auto mt-16 max-w-[648px] space-y-[1.4em] px-6 text-[19px] leading-[1.8]">
          {paras.map((t, i) => (
            <p
              key={i}
              className={
                i === 0
                  ? "first-letter:float-left first-letter:mr-3 first-letter:mt-[6px] first-letter:text-[76px] first-letter:leading-[0.78] first-letter:[font-family:var(--display)]"
                  : undefined
              }
            >
              {t}
            </p>
          ))}
        </div>
      </main>

      {more.length ? (
        <section className="px-8 pb-24 pt-16 text-center" style={{ borderTop: `1px solid ${p.rule}` }}>
          <h2 className="text-[34px] font-light" style={{ fontFamily: site.headlineFont }}>
            More from {site.title}
          </h2>
          <ul className="mx-auto mt-12 grid max-w-[960px] gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((c) => (
              <li key={c.id}>
                <div className={`text-[10px] font-semibold ${caps}`} style={{ fontFamily: FONTS.sans, color: p.muted }}>
                  {sectionFor(site, c.headline).label}
                </div>
                <PageLink
                  card={c}
                  open={open}
                  className="mt-3 block text-[22px] font-light leading-[1.25] hover:underline"
                  style={{ fontFamily: site.headlineFont }}
                >
                  {c.headline}
                </PageLink>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
