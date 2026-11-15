"use client";
// The Arc's front page as a post's picture: a broadsheet drawn in HTML. Every
// size is in container units (cqw: a hundredth of the page's width), so it
// reads the same at feed width and in the detail view. Clicking it opens the
// edition in the in-app browser.
import type { CSSProperties, ReactNode } from "react";
import { openFromClick } from "@/components/browser/open";
import { reporters } from "@/components/browser/parts";
import { NAMEPLATE_FONT, PAPER_SANS, PAPER_SERIF, editionDate, type FrontPage } from "@/lib/arc";
import { MediaFrame } from "./MediaFrame";

const PAPER = "#f3efe6";
const INK = "#171615";
const FADED = "rgba(23, 22, 21, 0.62)";
/** Width over height: portrait, the shape X shows a tall picture in. */
const RATIO = 4 / 5;
/** The feed caps a tall picture's height, as it does a GIF's or a meme's. */
const MAX_FEED_HEIGHT = 510;

const rule = (w: number, gap = 0): CSSProperties => ({ borderTop: `${w}cqw solid ${INK}`, marginTop: `${gap}cqw` });

/** Lead headline size by length, so a long one still fits in three lines. */
function leadSize(h: string): number {
  const n = h.length;
  return n <= 44 ? 7.6 : n <= 70 ? 6.4 : n <= 100 ? 5.4 : n <= 130 ? 4.7 : 4.1;
}

/** Body size by length, so the lead's columns run to the foot of the space, or
 *  just past it into "Continued on Page 4", as a real front page's do. */
function bodySize(text: string): number {
  return Math.min(1.95, Math.max(1.45, 1.6 * Math.sqrt(1990 / Math.max(1, text.length))));
}

function Clamp({ lines, style, children }: { lines: number; style?: CSSProperties; children: ReactNode }) {
  return (
    <div style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: lines, overflow: "hidden", ...style }}>
      {children}
    </div>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontFamily: PAPER_SANS, fontSize: "1.3cqw", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
      {children}
    </div>
  );
}

function Chart({ chart }: { chart: NonNullable<FrontPage["chart"]> }) {
  const pts = chart.points;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const path = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${((i / (pts.length - 1)) * 100).toFixed(2)} ${(4 + (1 - (p - min) / span) * 48).toFixed(2)}`)
    .join("");
  const down = chart.changePct < 0;
  return (
    <div>
      <Kicker>Markets</Kicker>
      <div style={{ border: `0.15cqw solid ${INK}`, marginTop: "0.8cqw", padding: "1cqw 1.2cqw 0.8cqw" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: PAPER_SANS, fontSize: "1.45cqw", fontWeight: 700 }}>
          <span>{chart.ticker}</span>
          <span>
            {down ? "▼" : "▲"} {Math.abs(chart.changePct).toFixed(1)}%
          </span>
        </div>
        <svg viewBox="0 0 100 56" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: "11cqw", marginTop: "0.6cqw" }} aria-hidden>
          {[4, 20, 36, 52].map((y) => (
            <line key={y} x1="0" x2="100" y1={y} y2={y} stroke={INK} strokeOpacity="0.25" strokeWidth="0.4" strokeDasharray="1 1.4" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={`${path}L100 56L0 56Z`} fill={INK} fillOpacity="0.1" />
          <path d={path} fill="none" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div style={{ fontFamily: PAPER_SERIF, fontStyle: "italic", fontSize: "1.45cqw", lineHeight: 1.25, marginTop: "0.7cqw", color: FADED }}>
        {chart.name} {down ? "fell" : "rose"} {Math.abs(chart.changePct).toFixed(1)} percent on the day.
      </div>
    </div>
  );
}

function Story({ s, size }: { s: { headline: string; text: string }; size: number }) {
  return (
    <div style={{ minWidth: 0 }}>
      <Clamp lines={4} style={{ fontFamily: PAPER_SERIF, fontWeight: 700, fontSize: `${size}cqw`, lineHeight: 1.08 }}>
        {s.headline}
      </Clamp>
      <Clamp lines={7} style={{ fontFamily: PAPER_SERIF, fontSize: "1.55cqw", lineHeight: 1.3, marginTop: "0.9cqw", textAlign: "justify", hyphens: "auto" }}>
        {s.text}
      </Clamp>
    </div>
  );
}

/** The page itself, at whatever width its container gives it. */
export function FrontPageSheet({ fp }: { fp: FrontPage }) {
  const byline = reporters(fp.page.id).join(" and ");
  const ear: CSSProperties = {
    border: `0.15cqw solid ${INK}`, padding: "0.8cqw 1cqw", fontFamily: PAPER_SANS, fontSize: "1.25cqw", lineHeight: 1.3,
    letterSpacing: "0.06em", textTransform: "uppercase", textAlign: "center", alignSelf: "center",
  };
  return (
    <div
      style={{
        position: "relative", width: "100%", aspectRatio: `${RATIO}`, containerType: "inline-size", overflow: "hidden",
        background: PAPER, color: INK,
      }}
    >
      <div
        style={{
          position: "absolute", inset: 0, padding: "3cqw 3.4cqw 2.6cqw", display: "flex", flexDirection: "column",
          // The faint darkening towards the edges of a sheet of newsprint.
          boxShadow: "inset 0 0 7cqw rgba(110, 90, 50, 0.16)",
        }}
      >
        {/* nameplate between its ears */}
        <div style={{ display: "grid", gridTemplateColumns: "17cqw 1fr 17cqw", alignItems: "center", gap: "1.5cqw" }}>
          <div style={ear}>{fp.ears[0]}</div>
          <div style={{ fontFamily: NAMEPLATE_FONT, fontSize: "13.2cqw", lineHeight: 0.95, textAlign: "center", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
            The Arc
          </div>
          <div style={ear}>{fp.ears[1]}</div>
        </div>
        <div style={rule(0.6, 1.4)} />
        <div style={rule(0.15, 0.35)} />
        <div
          style={{
            display: "flex", justifyContent: "space-between", padding: "0.75cqw 0.2cqw", fontFamily: PAPER_SERIF,
            fontSize: "1.45cqw", letterSpacing: "0.1em", textTransform: "uppercase",
          }}
        >
          <span>Vol. I . . . No. {fp.number}</span>
          <span style={{ fontWeight: 700 }}>{editionDate(fp.date)}</span>
          <span>thearc.com</span>
        </div>
        <div style={rule(0.15)} />

        {/* the lead, across the top */}
        <Clamp
          lines={3}
          style={{ fontFamily: PAPER_SERIF, fontWeight: 700, fontSize: `${leadSize(fp.lead.headline)}cqw`, lineHeight: 1.02, letterSpacing: "-0.012em", marginTop: "1.8cqw" }}
        >
          {fp.lead.headline}
        </Clamp>
        <div style={{ ...rule(0.15, 1.6), opacity: 0.5 }} />

        <div style={{ flex: "1 1 0", minHeight: 0, display: "grid", gridTemplateColumns: "1.75fr 1fr", gap: "2.4cqw", marginTop: "1.5cqw" }}>
          <div style={{ minHeight: 0, display: "flex", flexDirection: "column" }}>
            <Clamp lines={3} style={{ fontFamily: PAPER_SERIF, fontStyle: "italic", fontSize: "2.3cqw", lineHeight: 1.22 }}>
              {fp.lead.standfirst}
            </Clamp>
            <div style={{ fontFamily: PAPER_SANS, fontSize: "1.2cqw", letterSpacing: "0.1em", textTransform: "uppercase", margin: "1.1cqw 0 0.9cqw" }}>
              By {byline}
            </div>
            <div
              style={{
                flex: "1 1 0", minHeight: 0, overflow: "hidden", columnCount: 2, columnGap: "2.2cqw", columnRule: `0.12cqw solid rgba(23,22,21,0.35)`,
                columnFill: "auto", fontFamily: PAPER_SERIF, fontSize: `${bodySize(fp.lead.text)}cqw`, lineHeight: 1.3, textAlign: "justify", hyphens: "auto",
              }}
            >
              <span style={{ float: "left", fontSize: "4.5cqw", lineHeight: 0.84, fontWeight: 700, padding: "0.25cqw 0.5cqw 0 0" }}>
                {fp.lead.text.slice(0, 1)}
              </span>
              {fp.lead.text.slice(1)}
            </div>
            <div style={{ textAlign: "right", fontFamily: PAPER_SERIF, fontStyle: "italic", fontSize: "1.3cqw", lineHeight: 1.6, paddingTop: "0.3cqw" }}>
              Continued on Page 4
            </div>
          </div>

          <div style={{ minHeight: 0, overflow: "hidden", borderLeft: `0.12cqw solid rgba(23,22,21,0.35)`, paddingLeft: "2.2cqw" }}>
            {fp.chart ? <Chart chart={fp.chart} /> : null}
            <div style={{ marginTop: fp.chart ? "1.8cqw" : 0 }}>
              <Kicker>Comment</Kicker>
              <Clamp lines={3} style={{ fontFamily: PAPER_SERIF, fontWeight: 700, fontSize: "2.35cqw", lineHeight: 1.1, marginTop: "0.6cqw" }}>
                {fp.comment.headline}
              </Clamp>
              <div style={{ fontFamily: PAPER_SANS, fontSize: "1.15cqw", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: "0.7cqw" }}>
                {fp.comment.columnist}
              </div>
              <Clamp lines={fp.chart ? 8 : 22} style={{ fontFamily: PAPER_SERIF, fontSize: "1.55cqw", lineHeight: 1.3, marginTop: "0.7cqw", textAlign: "justify", hyphens: "auto" }}>
                {fp.comment.text}
              </Clamp>
            </div>
          </div>
        </div>

        {/* secondary stories in narrower columns */}
        {fp.stories.length ? (
          <div style={{ ...rule(0.15, 1.6), paddingTop: "0.35cqw" }}>
            <div style={{ borderTop: `0.15cqw solid ${INK}`, paddingTop: "1.4cqw", display: "grid", gridTemplateColumns: `repeat(${fp.stories.length}, 1fr)`, height: "23cqw" }}>
              {fp.stories.map((s, i) => (
                <div
                  key={i}
                  style={{ overflow: "hidden", padding: `0 ${i < fp.stories.length - 1 ? 1.4 : 0}cqw 0 ${i ? 1.4 : 0}cqw`, borderLeft: i ? `0.12cqw solid rgba(23,22,21,0.35)` : undefined }}
                >
                  <Story s={s} size={fp.stories.length > 2 ? 2.25 : 2.6} />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* the results or the markets along the foot */}
        {fp.strip ? (
          <div
            style={{
              marginTop: "1.6cqw", background: INK, color: PAPER, display: "flex", alignItems: "center", gap: "1.6cqw",
              padding: "1cqw 1.4cqw", fontFamily: PAPER_SANS, fontSize: "1.35cqw", whiteSpace: "nowrap", overflow: "hidden",
            }}
          >
            <span style={{ fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>{fp.strip.label}</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{fp.strip.items.join("   ·   ")}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function FrontPageMedia({ page, large }: { page: FrontPage; large: boolean }) {
  return (
    <div style={{ maxWidth: large ? undefined : Math.round(MAX_FEED_HEIGHT * RATIO) }}>
      <MediaFrame>
        <a
          href={`/news/${page.page.id}`}
          onClick={(e) => openFromClick(e, page.page)}
          aria-label={`The Arc, front page for ${editionDate(page.date)}: ${page.lead.headline}`}
          className="block"
        >
          <FrontPageSheet fp={page} />
        </a>
      </MediaFrame>
    </div>
  );
}
