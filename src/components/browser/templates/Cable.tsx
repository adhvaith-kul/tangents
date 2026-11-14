"use client";
// Cable news site: a coloured top bar, a BREAKING strip while the story is
// under an hour old, a large sans headline and a grid of more stories.
import { sectionFor } from "@/lib/sites";
import {
  Inert, PageLink, ago, initials, bylineText, clock, datelineLead, isReported, longDate, paragraphs, updatedNote,
  weekdayShort, type TemplateProps,
} from "../parts";

const HOUR = 3_600_000;

export function CablePage({ site, page, more, now, open }: TemplateProps) {
  const p = site.palette;
  const z = site.zone;
  const section = sectionFor(site, page.headline);
  const paras = paragraphs(page.body);
  const stamp = (t: number) => `${clock(t, z)} ${z}, ${weekdayShort(t, z)} ${longDate(t, z).replace(",", "")}`;
  const updated = updatedNote(page, stamp);
  const breaking = now - page.createdAt < HOUR && now >= page.createdAt;
  const lead = datelineLead(site, page, false);
  const boxed = site.name.length <= 4 && p.accent !== p.bar;
  const alert = p.accent !== p.bar ? p.accent : "#c8102e";
  const byline = bylineText(site, page);

  return (
    <div className="min-h-full" style={{ background: p.bg, color: p.text, fontFamily: site.bodyFont }}>
      <header style={{ background: p.bar, color: p.onBar }}>
        <div className="mx-auto flex h-14 max-w-[1040px] items-center gap-8 px-6" style={{ fontFamily: site.headlineFont }}>
          <span
            className={`shrink-0 font-black leading-none tracking-[-0.02em] ${boxed ? "px-2 py-1.5 text-[22px]" : "text-[24px]"}`}
            style={boxed ? { background: p.accent } : undefined}
          >
            {site.name}
          </span>
          <nav className="flex min-w-0 gap-5 overflow-hidden text-[14px] font-bold">
            {site.nav.map((n) => (
              <Inert key={n}>{n}</Inert>
            ))}
          </nav>
        </div>
      </header>
      {breaking ? (
        <div style={{ background: alert, color: "#ffffff", fontFamily: site.headlineFont }}>
          <div className="mx-auto flex h-11 max-w-[1040px] items-center gap-3 px-6">
            <span className="shrink-0 bg-white px-2 py-0.5 text-[13px] font-black tracking-[0.08em]" style={{ color: alert }}>
              BREAKING
            </span>
            <span className="truncate text-[15px] font-semibold">{page.headline}</span>
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-[1040px] px-6 pb-16 pt-8">
        <article className="max-w-[760px]">
          <Inert className="text-[14px] font-bold uppercase tracking-[0.04em]" style={{ color: p.accent, fontFamily: site.headlineFont }}>
            {section.label}
          </Inert>
          <h1
            className="mt-2 text-[46px] font-extrabold leading-[1.07] tracking-[-0.02em]"
            style={{ fontFamily: site.headlineFont }}
          >
            {page.headline}
          </h1>
          {page.dek ? (
            <p className="mt-4 text-[20px] leading-[1.4]" style={{ color: p.muted }}>
              {page.dek}
            </p>
          ) : null}
          <div className="mt-6 flex items-center gap-3 pb-5" style={{ borderBottom: `1px solid ${p.rule}` }}>
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[14px] font-bold"
              style={{ background: p.rule, color: p.muted }}
            >
              {initials(byline)}
            </span>
            <div className="text-[14px] leading-5">
              <div>
                {isReported(page) ? "By " : null}
                <span className="font-bold">{byline}</span>
                {isReported(page) ? `, ${site.title}` : null}
              </div>
              <div style={{ color: p.muted }}>{updated ?? `Published ${stamp(page.createdAt)}`}</div>
            </div>
          </div>
          <div className="mt-7 max-w-[660px] space-y-[1.1em] text-[18px] leading-[1.65]">
            {paras.map((t, i) => (
              <p key={i}>
                {i === 0 && lead ? <span className="font-bold">{lead}</span> : null}
                {t}
              </p>
            ))}
          </div>
        </article>

        {more.length ? (
          <section className="mt-14">
            <h2 className="pl-3 text-[22px] font-extrabold" style={{ borderLeft: `5px solid ${p.accent}`, fontFamily: site.headlineFont }}>
              More from {site.title}
            </h2>
            <ul className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {more.map((c) => (
                <li key={c.id} className="pt-3" style={{ borderTop: `3px solid ${p.text}` }}>
                  <PageLink
                    card={c}
                    open={open}
                    className="block text-[17px] font-bold leading-snug hover:underline"
                    style={{ fontFamily: site.headlineFont }}
                  >
                    {c.headline}
                  </PageLink>
                  <div className="mt-2 text-[13px]" style={{ color: p.muted }}>
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
