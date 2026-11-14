"use client";
// Business terminal: heavy sans headline in black and white, a boxed bullet
// summary above the story, and a numbered rail of the publisher's other stories.
import { FONTS, sectionFor } from "@/lib/sites";
import {
  Inert, PageLink, ago, bylineText, clock, isReported, longDate, paragraphs, sentences, updatedNote,
  type TemplateProps,
} from "../parts";

/** Up to three summary bullets: the lead sentence of each opening paragraph. */
function bullets(body: string[]): string[] {
  const firsts = body.slice(0, 3).map((p) => sentences(p)[0]).filter(Boolean);
  if (firsts.length >= 2) return firsts;
  return sentences(body.join(" ")).slice(0, 3);
}

export function BusinessPage({ site, page, more, now, open }: TemplateProps) {
  const p = site.palette;
  const z = site.zone;
  const section = sectionFor(site, page.headline);
  const paras = paragraphs(page.body);
  const stamp = (t: number) => `${longDate(t, z)} at ${clock(t, z)} ${z}`;
  const updated = updatedNote(page, stamp);
  const points = bullets(paras);
  const lined = p.bar === p.bg;

  return (
    <div className="min-h-full" style={{ background: p.bg, color: p.text, fontFamily: site.bodyFont }}>
      <header style={{ background: p.bar, color: p.onBar, borderBottom: lined ? `1px solid ${p.rule}` : undefined }}>
        <div className="mx-auto flex h-14 max-w-[1040px] items-center gap-9 px-6" style={{ fontFamily: site.headlineFont }}>
          <span className="shrink-0 text-[26px] font-extrabold tracking-[-0.03em]">{site.name}</span>
          <nav className="flex min-w-0 gap-5 overflow-hidden text-[14px] font-semibold opacity-90">
            {site.nav.map((n) => (
              <Inert key={n}>{n}</Inert>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1040px] gap-12 px-6 pb-16 pt-9 lg:grid-cols-[minmax(0,680px)_minmax(0,1fr)]">
        <article>
          <Inert className="text-[15px] font-bold" style={{ fontFamily: site.headlineFont, color: p.accent }}>
            {section.label}
          </Inert>
          <h1
            className="mt-2 text-[44px] font-extrabold leading-[1.04] tracking-[-0.025em]"
            style={{ fontFamily: site.headlineFont }}
          >
            {page.headline}
          </h1>
          {page.dek ? (
            <p className="mt-4 text-[20px] leading-[1.4]" style={{ fontFamily: site.headlineFont, color: p.muted }}>
              {page.dek}
            </p>
          ) : null}
          {points.length ? (
            <ul className="mt-6 space-y-3 px-5 py-4" style={{ border: `1px solid ${p.rule}`, fontFamily: site.headlineFont }}>
              {points.map((b, i) => (
                <li key={i} className="flex gap-3 text-[16px] font-medium leading-[1.45]">
                  <span className="mt-[8px] h-[7px] w-[7px] shrink-0" style={{ background: p.text }} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-6 text-[14px] leading-5" style={{ fontFamily: site.headlineFont }}>
            <div>
              {isReported(page) ? "By " : null}
              <span className="font-bold">{bylineText(site, page)}</span>
            </div>
            <div className="mt-0.5" style={{ color: p.muted }}>
              {stamp(page.createdAt)}
            </div>
            {updated ? <div style={{ color: p.muted }}>{updated}</div> : null}
          </div>
          <div className="mt-8 space-y-[1.05em] text-[19px] leading-[1.62]">
            {paras.map((t, i) => (
              <p key={i}>{t}</p>
            ))}
          </div>
        </article>

        {more.length ? (
          <aside className="self-start" style={{ fontFamily: site.headlineFont }}>
            <div className="pt-3" style={{ borderTop: `4px solid ${p.text}` }}>
              <h2 className="text-[13px] font-extrabold uppercase tracking-[0.06em]">More from {site.title}</h2>
            </div>
            <ol className="mt-2">
              {more.map((c, i) => (
                <li key={c.id} className="flex gap-4 py-4" style={{ borderBottom: `1px solid ${p.rule}` }}>
                  <span className="w-6 shrink-0 text-[26px] font-black leading-none" style={{ color: p.muted, fontFamily: FONTS.sans }}>
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <PageLink card={c} open={open} className="block text-[16px] font-bold leading-snug hover:underline">
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
