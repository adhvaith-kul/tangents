"use client";
// Entertainment trade paper: black header with a big centred wordmark, a
// serif story with an italic deck, and a right rail of the paper's latest.
import { FONTS, sectionFor } from "@/lib/sites";
import {
  Inert, PageLink, ago, bylineText, clock, isReported, longDate, paragraphs, updatedNote, type TemplateProps,
} from "../parts";

export function TradePage({ site, page, more, now, open }: TemplateProps) {
  const p = site.palette;
  const z = site.zone;
  const section = sectionFor(site, page.headline);
  const paras = paragraphs(page.body);
  // Trade style: "November 14, 2026 9:41am PT".
  const stamp = (t: number) => `${longDate(t, z)} ${clock(t, z).replace(" ", "").toLowerCase()} ${z}`;
  const updated = updatedNote(page, stamp);

  return (
    <div className="min-h-full" style={{ background: p.bg, color: p.text, fontFamily: site.bodyFont }}>
      <header style={{ background: p.bar, color: p.onBar }}>
        <div className="py-5 text-center">
          <span className="text-[60px] font-bold leading-none tracking-[0.02em]" style={{ fontFamily: site.mastheadFont }}>
            {site.name}
          </span>
        </div>
        <nav
          className="mx-auto flex h-11 max-w-[1040px] items-center justify-center gap-6 overflow-hidden px-6 text-[12px] font-bold uppercase tracking-[0.1em]"
          style={{ fontFamily: FONTS.sans, borderTop: "1px solid rgba(255,255,255,0.18)" }}
        >
          {site.nav.map((n) => (
            <Inert key={n}>{n}</Inert>
          ))}
        </nav>
      </header>

      <main className="mx-auto grid max-w-[1040px] gap-12 px-6 pb-16 pt-9 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article className="min-w-0">
          <Inert className="text-[12px] font-bold uppercase tracking-[0.14em]" style={{ fontFamily: FONTS.sans, color: p.accent }}>
            {section.label}
          </Inert>
          <h1 className="mt-3 text-[42px] font-bold leading-[1.1] tracking-[-0.01em]" style={{ fontFamily: site.headlineFont }}>
            {page.headline}
          </h1>
          {page.dek ? (
            <p className="mt-4 text-[21px] italic leading-[1.4]" style={{ color: p.muted }}>
              {page.dek}
            </p>
          ) : null}
          <div
            className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-3 text-[13px]"
            style={{ fontFamily: FONTS.sans, borderTop: `1px solid ${p.rule}`, borderBottom: `1px solid ${p.rule}` }}
          >
            <span>
              {isReported(page) ? "By " : null}
              <span className="font-bold uppercase tracking-[0.06em]">{bylineText(site, page)}</span>
            </span>
            <span style={{ color: p.muted }}>
              {stamp(page.createdAt)}
              {updated ? <span> · {updated}</span> : null}
            </span>
          </div>
          <div className="mt-8 max-w-[640px] space-y-[1.15em] text-[19px] leading-[1.68]">
            {paras.map((t, i) => (
              <p key={i}>{t}</p>
            ))}
          </div>
        </article>

        {more.length ? (
          <aside className="self-start" style={{ fontFamily: FONTS.sans }}>
            <div className="pt-3" style={{ borderTop: `4px solid ${p.accent}` }}>
              <h2 className="text-[13px] font-black uppercase tracking-[0.1em]">More from {site.title}</h2>
            </div>
            <ol className="mt-1">
              {more.map((c, i) => (
                <li key={c.id} className="flex gap-3 py-4" style={{ borderBottom: `1px solid ${p.rule}` }}>
                  <span className="text-[13px] font-black" style={{ color: p.accent }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <PageLink
                      card={c}
                      open={open}
                      className="block text-[16px] font-bold leading-snug hover:underline"
                      style={{ fontFamily: site.headlineFont }}
                    >
                      {c.headline}
                    </PageLink>
                    <div className="mt-1 text-[12px]" style={{ color: p.muted }}>
                      {ago(c.createdAt, now, z)}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        ) : null}
      </main>
    </div>
  );
}
