"use client";
// Government page or regulator press release: the official-site banner, a
// plain seal-less header, a breadcrumb, "FOR IMMEDIATE RELEASE" with a release
// number on press releases, and a dated list of the office's other releases.
import { FONTS, zoneParts } from "@/lib/sites";
import { KIND_LABEL, Inert, PageLink, apDate, bylineText, longDate, paragraphs, updatedNote, type TemplateProps } from "../parts";

export function GovernmentPage({ site, page, more, open }: TemplateProps) {
  const p = site.palette;
  const z = site.zone;
  const paras = paragraphs(page.body);
  const updated = updatedNote(page, (t) => longDate(t, z));
  const release = page.kind === "press_release";
  const number = `${zoneParts(page.createdAt, z).year}-${page.id}`;
  const lead = release && site.city ? `${site.city}, ${apDate(page.createdAt, z)} — ` : "";
  const label = page.kind === "statement" ? "Statements & Releases" : KIND_LABEL[page.kind];
  const caps = site.name === site.name.toUpperCase();

  return (
    <div className="min-h-full" style={{ background: p.bg, color: p.text, fontFamily: site.bodyFont }}>
      {site.govBanner ? (
        <div className="text-[12px]" style={{ background: "#f0f0f0", color: "#1b1b1b", fontFamily: FONTS.sans }}>
          <div className="mx-auto max-w-[1040px] px-6 py-1.5">{site.govBanner}</div>
        </div>
      ) : null}
      <header style={{ background: p.bar, color: p.onBar }}>
        <div className="mx-auto max-w-[1040px] px-6">
          <div className="py-5">
            <span
              className={`text-[26px] font-bold leading-none ${caps ? "tracking-[0.14em]" : "tracking-[0.005em]"}`}
              style={{ fontFamily: site.mastheadFont }}
            >
              {site.name}
            </span>
          </div>
          <nav
            className="flex h-11 items-center gap-7 overflow-hidden text-[14px]"
            style={{ fontFamily: FONTS.sans, borderTop: "1px solid rgba(255,255,255,0.16)" }}
          >
            {site.nav.map((n) => (
              <Inert key={n}>{n}</Inert>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-6 pb-14 pt-7" style={{ fontFamily: site.bodyFont }}>
        <div className="flex gap-2 text-[13px]" style={{ fontFamily: FONTS.sans, color: p.muted }}>
          <Inert>Home</Inert>
          <span>›</span>
          <Inert>Newsroom</Inert>
          <span>›</span>
          <Inert>{label}</Inert>
        </div>

        {release ? (
          <div
            className="mt-7 flex flex-wrap items-center justify-between gap-2 py-2 text-[13px] font-bold uppercase tracking-[0.08em]"
            style={{ fontFamily: FONTS.sans, borderTop: `2px solid ${p.text}`, borderBottom: `1px solid ${p.rule}` }}
          >
            <span>For Immediate Release</span>
            <span style={{ color: p.muted }}>Release No. {number}</span>
          </div>
        ) : null}

        <div className="mt-7 text-[13px] font-bold uppercase tracking-[0.08em]" style={{ fontFamily: FONTS.sans, color: p.accent }}>
          {label}
        </div>
        <h1 className="mt-3 text-[38px] font-bold leading-[1.15]" style={{ fontFamily: site.headlineFont }}>
          {page.headline}
        </h1>
        {page.dek ? (
          <p className="mt-4 text-[19px] leading-[1.5]" style={{ color: p.muted }}>
            {page.dek}
          </p>
        ) : null}
        <div className="mt-5 text-[14px]" style={{ fontFamily: FONTS.sans, color: p.muted }}>
          <span className="font-semibold" style={{ color: p.text }}>
            {bylineText(site, page)}
          </span>
          <span> · {longDate(page.createdAt, z)}</span>
          {updated ? <span> · {updated}</span> : null}
        </div>
        <div className="mt-8 max-w-[660px] space-y-[1.15em] text-[18px] leading-[1.7]">
          {paras.map((t, i) => (
            <p key={i}>
              {i === 0 && lead ? <span className="font-bold">{lead}</span> : null}
              {t}
            </p>
          ))}
        </div>
        {release ? (
          <div className="mt-10 text-center text-[16px] tracking-[0.3em]" style={{ color: p.muted }}>
            ###
          </div>
        ) : null}
      </main>

      {more.length ? (
        <section className="mx-auto max-w-[760px] px-6 pb-16">
          <h2
            className="pb-2 text-[22px] font-bold"
            style={{ fontFamily: site.headlineFont, borderBottom: `2px solid ${p.accent}` }}
          >
            More from {site.title}
          </h2>
          <ul style={{ fontFamily: FONTS.sans }}>
            {more.map((c) => (
              <li key={c.id} className="grid gap-1 py-4 sm:grid-cols-[140px_1fr] sm:gap-6" style={{ borderBottom: `1px solid ${p.rule}` }}>
                <span className="text-[14px]" style={{ color: p.muted }}>
                  {apDate(c.createdAt, z)}
                </span>
                <span>
                  <PageLink card={c} open={open} className="text-[17px] font-semibold leading-snug hover:underline" style={{ color: p.accent }}>
                    {c.headline}
                  </PageLink>
                  <span className="mt-1 block text-[12px] uppercase tracking-[0.06em]" style={{ color: p.muted }}>
                    {KIND_LABEL[c.kind]}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer style={{ background: p.bar, color: p.onBar, fontFamily: FONTS.sans }}>
        <div className="mx-auto max-w-[1040px] px-6 py-6 text-[14px] font-semibold">{site.name}</div>
      </footer>
    </div>
  );
}
