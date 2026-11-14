"use client";
// Celebrity tabloid: a loud masthead block, a heavy condensed all-caps
// headline, a bold subhead and short punchy paragraphs.
import { FONTS, sectionFor } from "@/lib/sites";
import {
  Inert, PageLink, ago, bylineText, clock, isReported, numericDate, paragraphs, sentences, updatedNote,
  type TemplateProps,
} from "../parts";

/** Tabloids run one or two sentences to a paragraph. */
function shortParas(body: string): string[] {
  const out: string[] = [];
  for (const para of paragraphs(body)) {
    const s = sentences(para);
    for (let i = 0; i < s.length; i += 2) out.push(s.slice(i, i + 2).join(" "));
  }
  return out;
}

export function TabloidPage({ site, page, more, now, open }: TemplateProps) {
  const p = site.palette;
  const z = site.zone;
  const section = sectionFor(site, page.headline);
  const paras = shortParas(page.body);
  const stamp = (t: number) => `${numericDate(t, z)} ${clock(t, z)} ${z}`;
  const updated = updatedNote(page, stamp);
  const strip = p.bar === p.accent ? "#000000" : p.bar;

  return (
    <div className="min-h-full" style={{ background: p.bg, color: p.text, fontFamily: site.bodyFont }}>
      <header>
        <div style={{ background: p.accent, color: "#ffffff" }}>
          <div className="mx-auto flex h-[88px] max-w-[1040px] items-center px-6">
            <span className="text-[62px] leading-none tracking-[-0.01em]" style={{ fontFamily: site.mastheadFont }}>
              {site.name}
            </span>
          </div>
        </div>
        <div style={{ background: strip, color: "#ffffff" }}>
          <nav
            className="mx-auto flex h-10 max-w-[1040px] items-center gap-6 overflow-hidden px-6 text-[15px] uppercase tracking-[0.06em]"
            style={{ fontFamily: FONTS.condensed }}
          >
            {site.nav.map((n) => (
              <Inert key={n}>{n}</Inert>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-6 pb-16 pt-8">
        <div className="flex items-center gap-3 text-[13px] font-bold uppercase" style={{ fontFamily: FONTS.sans }}>
          <Inert style={{ color: p.accent }}>{section.label}</Inert>
          <span style={{ color: p.muted }}>{stamp(page.createdAt)}</span>
        </div>
        <h1 className="mt-3 text-[54px] uppercase leading-[0.98] tracking-[0.005em]" style={{ fontFamily: site.headlineFont }}>
          {page.headline}
        </h1>
        {page.dek ? <p className="mt-5 text-[23px] font-extrabold leading-[1.2]">{page.dek}</p> : null}
        <div className="mt-4 text-[12px] font-bold uppercase tracking-[0.06em]" style={{ color: p.muted }}>
          {isReported(page) ? "By " : null}
          {bylineText(site, page)}
          {updated ? <span> · {updated}</span> : null}
        </div>
        <div className="mt-6 h-[5px] w-16" style={{ background: p.accent }} />
        <div className="mt-6 max-w-[640px] space-y-5 text-[19px] font-medium leading-[1.5]">
          {paras.map((t, i) => (
            <p key={i}>{t}</p>
          ))}
        </div>

        {more.length ? (
          <section className="mt-16">
            <h2 className="inline-block pb-1 text-[34px] uppercase leading-none" style={{ fontFamily: site.headlineFont, borderBottom: `5px solid ${p.accent}` }}>
              More from {site.title}
            </h2>
            <ul className="mt-4">
              {more.map((c) => (
                <li key={c.id} className="py-4" style={{ borderBottom: `2px solid ${p.rule}` }}>
                  <PageLink
                    card={c}
                    open={open}
                    className="block text-[26px] uppercase leading-[1.02] hover:underline"
                    style={{ fontFamily: site.headlineFont }}
                  >
                    {c.headline}
                  </PageLink>
                  <div className="mt-1.5 text-[12px] font-bold uppercase" style={{ color: p.muted }}>
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
