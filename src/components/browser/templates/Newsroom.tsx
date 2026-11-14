"use client";
// A company's newsroom or blog: brand wordmark set in type, a centred
// announcement header (kind, date, headline, deck), the organisation as the
// byline, and cards of the company's other posts.
import { KIND_LABEL, Inert, PageLink, bylineText, longDate, paragraphs, updatedNote, type TemplateProps } from "../parts";

export function NewsroomPage({ site, page, more, open }: TemplateProps) {
  const p = site.palette;
  const z = site.zone;
  const paras = paragraphs(page.body);
  const updated = updatedNote(page, (t) => longDate(t, z));
  // All-caps wordmarks (TESLA, SPACEX) are set wide; mixed-case ones tight.
  const spaced = site.name === site.name.toUpperCase() && site.name.length > 3;
  const barred = p.bar !== p.bg;

  return (
    <div className="min-h-full" style={{ background: p.bg, color: p.text, fontFamily: site.bodyFont }}>
      <header style={{ background: p.bar, color: p.onBar, borderBottom: barred ? undefined : `1px solid ${p.rule}` }}>
        <div className="mx-auto flex h-14 max-w-[1040px] items-center justify-between gap-8 px-6">
          <span className="flex shrink-0 items-center gap-3">
            <span
              className={spaced ? "text-[17px] font-semibold tracking-[0.32em]" : "text-[22px] font-bold tracking-[-0.02em]"}
              style={{ fontFamily: site.mastheadFont }}
            >
              {site.name}
            </span>
            {site.sub ? (
              <>
                <span className="h-5 w-px" style={{ background: barred ? p.onBar : p.rule, opacity: barred ? 0.35 : 1 }} />
                <span className="text-[16px] font-medium" style={{ fontFamily: site.headlineFont }}>
                  {site.sub}
                </span>
              </>
            ) : null}
          </span>
          <nav className="flex min-w-0 gap-5 overflow-hidden text-[13px]" style={{ fontFamily: site.headlineFont, opacity: 0.85 }}>
            {site.nav.map((n) => (
              <Inert key={n}>{n}</Inert>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-6 pb-16 pt-16" style={{ fontFamily: site.headlineFont }}>
        <div className="flex flex-col items-center text-center">
          <span
            className="rounded-full px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.08em]"
            style={{ border: `1px solid ${p.rule}`, color: p.muted }}
          >
            {KIND_LABEL[page.kind]}
          </span>
          <span className="mt-4 text-[14px]" style={{ color: p.muted }}>
            {longDate(page.createdAt, z)}
            {updated ? <span> · {updated}</span> : null}
          </span>
          <h1 className="mt-5 text-[46px] font-bold leading-[1.08] tracking-[-0.025em]">{page.headline}</h1>
          {page.dek ? (
            <p className="mt-5 max-w-[640px] text-[21px] leading-[1.4]" style={{ color: p.muted }}>
              {page.dek}
            </p>
          ) : null}
          <span className="mt-6 text-[14px] font-semibold">{bylineText(site, page)}</span>
          <span className="mt-10 h-[3px] w-12 rounded-full" style={{ background: p.accent }} />
        </div>
        <div className="mx-auto mt-10 max-w-[660px] space-y-[1.25em] text-[18px] leading-[1.7]" style={{ fontFamily: site.bodyFont }}>
          {paras.map((t, i) => (
            <p key={i}>{t}</p>
          ))}
        </div>
      </main>

      {more.length ? (
        <section className="pb-16 pt-12" style={{ borderTop: `1px solid ${p.rule}`, fontFamily: site.headlineFont }}>
          <div className="mx-auto max-w-[1040px] px-6">
            <h2 className="text-[24px] font-bold tracking-[-0.02em]">More from {site.title}</h2>
            <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {more.map((c) => (
                <li key={c.id}>
                  <PageLink
                    card={c}
                    open={open}
                    className="flex h-full flex-col rounded-xl p-5 transition-opacity hover:opacity-80"
                    style={{ border: `1px solid ${p.rule}` }}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: p.muted }}>
                      {KIND_LABEL[c.kind]} · {longDate(c.createdAt, z)}
                    </span>
                    <span className="mt-3 text-[17px] font-semibold leading-snug">{c.headline}</span>
                  </PageLink>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}
