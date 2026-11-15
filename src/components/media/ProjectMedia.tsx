"use client";
// A project's drawn card on the post that announced it: a film's or series'
// title card or poster, an album cover, a tour poster or a game's key art.
// Everything is type, colour and geometry in HTML and CSS: no photographs and
// no likenesses. The layout and palette come from the project's stored look
// (projectLooks.ts), and every size is in cqw so the card reads the same in the
// feed and on the post's own page.
import type { CSSProperties, ReactNode } from "react";
import type { ProjectCard } from "@/lib/types";
import { MediaFrame } from "./MediaFrame";
import {
  ASPECT, FACE, KIND_LABEL, artistOf, billingBlock, dateLine, fitText, lookOf, topBilled, type Fit, type Palette,
} from "./projectLooks";

/** The tallest X shows a portrait image in the feed, in px. */
const FEED_MAX_HEIGHT = 510;
// On the post's own page a tall card may be larger, but still has to fit on a screen.
const DETAIL_MAX_HEIGHT = 680;

type Draw = (props: { card: ProjectCard; p: Palette }) => ReactNode;

// ---------------------------------------------------------------- pieces

const abs = (style: CSSProperties): CSSProperties => ({ position: "absolute", ...style });

/** A title set in lines already fitted, one block per line so nothing rewraps. */
function Title({ fit, style }: { fit: Fit; style: CSSProperties }) {
  return (
    <div style={{ fontSize: `${fit.size}cqw`, ...style }}>
      {fit.lines.map((line, i) => (
        <div key={i} style={{ whiteSpace: "nowrap" }}>
          {line}
        </div>
      ))}
    </div>
  );
}

/** Small set type: a credit, a date, a maker's name. Never wraps; long text is cut. */
function Small({ children, size, style }: { children: ReactNode; size: number; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontFamily: FACE.narrow, fontWeight: 600, fontSize: `${size}cqw`, lineHeight: 1.2, letterSpacing: "0.22em",
        textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", ...style,
      }}
    >
      {children}
    </div>
  );
}

/** The cast across the top of a poster. */
function Names({ card, color, size = 2.5 }: { card: ProjectCard; color: string; size?: number }) {
  const names = topBilled(card, 4);
  if (!names.length) return null;
  return (
    <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", columnGap: "5cqw", rowGap: "0.6cqw", padding: "0 6cqw" }}>
      {names.map((n) => (
        <Small key={n} size={size} style={{ color, letterSpacing: "0.18em", maxWidth: "42cqw" }}>
          {n}
        </Small>
      ))}
    </div>
  );
}

/** The billing block: small condensed credits at the foot of a poster. */
function Billing({ card, color }: { card: ProjectCard; color: string }) {
  return (
    <div
      style={{
        fontFamily: FACE.narrow, fontWeight: 500, fontSize: "1.7cqw", lineHeight: 1.35, letterSpacing: "0.06em",
        textTransform: "uppercase", color, opacity: 0.72, textAlign: "center", padding: "0 7cqw",
        display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
      }}
    >
      {billingBlock(card).map((b, i) => (
        <span key={i} style={{ display: "inline-block", marginRight: "0.9em", whiteSpace: "nowrap" }}>
          {b.lead && <span style={{ fontSize: "0.72em", marginRight: b.name ? "0.4em" : 0 }}>{b.lead}</span>}
          {b.name}
        </span>
      ))}
    </div>
  );
}

function Tagline({ text, color, size = 2.9 }: { text: string | null; color: string; size?: number }) {
  if (!text) return null;
  return (
    <div
      style={{
        fontFamily: FACE.baskerville, fontStyle: "italic", fontSize: `${size}cqw`, lineHeight: 1.25, color,
        textAlign: "center", padding: "0 10cqw", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
      }}
    >
      {text}
    </div>
  );
}

/** Text filled with a gradient: chrome on a blockbuster title, neon on a game's. */
const gradientText = (gradient: string): CSSProperties => ({
  backgroundImage: gradient, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
});

const column = (style: CSSProperties): CSSProperties => ({
  ...abs({ left: 0, right: 0 }), display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", ...style,
});

// ------------------------------------------------------------ title cards

const eclipse: Draw = ({ card, p }) => {
  const fit = fitText(card.title.toUpperCase(), { width: 80, max: 8.5, min: 3.2, em: 0.84, maxLines: 2 });
  return (
    <>
      <div style={abs({ inset: 0, background: `radial-gradient(ellipse 75% 70% at 50% 118%, ${p.glow} 0%, transparent 70%), linear-gradient(180deg, ${p.bg}, ${p.deep})` })} />
      {/* The eclipse: a dark disc rising behind the title, its corona the only light. */}
      <div
        style={abs({
          left: "21cqw", width: "58cqw", height: "58cqw", top: "35cqw", borderRadius: "50%", background: p.deep,
          boxShadow: `0 0 0 0.25cqw ${p.accent}, 0 -0.6cqw 5cqw 0.8cqw ${p.glow}, 0 -1cqw 14cqw 2cqw ${p.accent}55`,
        })}
      />
      <div style={column({ top: "7.5cqw" })}>
        <Small size={1.5} style={{ color: p.ink, opacity: 0.75, letterSpacing: "0.45em", maxWidth: "70cqw" }}>{card.maker}</Small>
      </div>
      <div style={column({ top: 0, bottom: "8cqw", justifyContent: "center" })}>
        <Title fit={fit} style={{ fontFamily: FACE.didone, fontWeight: 400, letterSpacing: "0.1em", lineHeight: 1.05, color: p.ink, textShadow: `0 0 3cqw ${p.deep}` }} />
        <div style={{ width: "6cqw", height: "0.18cqw", background: p.accent, margin: "2.2cqw 0 1.8cqw" }} />
        <Small size={1.55} style={{ color: p.accent, letterSpacing: "0.4em" }}>{dateLine(card)}</Small>
      </div>
    </>
  );
};

const marquee: Draw = ({ card, p }) => {
  const fit = fitText(card.title.toUpperCase(), { width: 88, max: 13, min: 4.5, em: 0.56, maxLines: 2 });
  return (
    <>
      <div style={abs({ inset: 0, background: `linear-gradient(180deg, ${p.deep} 0%, ${p.bg} 55%, ${p.accent} 80%, ${p.deep} 80.4%)` })} />
      {/* Light fanning up from the horizon. */}
      <div
        style={abs({
          inset: 0,
          background: `repeating-conic-gradient(from -90deg at 50% 80%, ${p.glow}22 0deg 3deg, transparent 3deg 11deg)`,
          WebkitMaskImage: "radial-gradient(ellipse 80% 90% at 50% 80%, #000 20%, transparent 75%)",
          maskImage: "radial-gradient(ellipse 80% 90% at 50% 80%, #000 20%, transparent 75%)",
        })}
      />
      {/* The sun, half set behind the ground. */}
      <div style={abs({ left: "30cqw", width: "40cqw", height: "40cqw", top: "25cqw", borderRadius: "50%", clipPath: "inset(0 0 50% 0)", background: `radial-gradient(circle, ${p.glow} 0%, ${p.accent}aa 35%, transparent 70%)` })} />
      <div style={column({ top: "6cqw" })}>
        <Small size={1.6} style={{ color: p.ink, opacity: 0.8, letterSpacing: "0.5em", maxWidth: "70cqw" }}>{card.maker}</Small>
      </div>
      <div style={column({ top: 0, bottom: "14cqw", justifyContent: "center" })}>
        <Title
          fit={fit}
          style={{
            fontFamily: FACE.impact, letterSpacing: "0.02em", lineHeight: 0.92,
            ...gradientText(`linear-gradient(180deg, #ffffff 0%, ${p.ink} 48%, ${p.glow} 52%, ${p.accent} 100%)`),
            filter: `drop-shadow(0 0.5cqw 1.2cqw ${p.deep})`,
          }}
        />
      </div>
      <div style={column({ bottom: "4.2cqw" })}>
        <Small size={1.8} style={{ color: p.ink, letterSpacing: "0.45em" }}>{dateLine(card)}</Small>
      </div>
    </>
  );
};

const field: Draw = ({ card, p }) => {
  const fit = fitText(card.title.toLowerCase(), { width: 84, max: 12, min: 3.6, em: 0.56, maxLines: 3 });
  return (
    <>
      <div style={abs({ inset: 0, background: `radial-gradient(ellipse 90% 80% at 20% 10%, ${p.glow}, ${p.bg} 55%, ${p.deep} 120%)` })} />
      <div style={abs({ right: "7cqw", top: "6.5cqw", width: "3.2cqw", height: "3.2cqw", borderRadius: "50%", background: p.accent })} />
      <div style={abs({ left: "7cqw", top: "6.5cqw", fontFamily: FACE.sans, fontSize: "1.8cqw", fontWeight: 500, color: p.ink, maxWidth: "70cqw", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })}>
        {card.maker}
      </div>
      <div style={abs({ left: "7cqw", bottom: "6cqw", right: "7cqw" })}>
        <Title fit={fit} style={{ fontFamily: FACE.sans, fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 0.95, color: p.ink }} />
        <div style={{ marginTop: "2cqw", fontFamily: FACE.sans, fontSize: "1.8cqw", fontWeight: 500, color: p.ink, opacity: 0.8 }}>{dateLine(card).toLowerCase()}</div>
      </div>
    </>
  );
};

const blinds: Draw = ({ card, p }) => {
  const fit = fitText(card.title, { width: 62, max: 9.5, min: 3.4, em: 0.5, maxLines: 2 });
  return (
    <>
      <div style={abs({ inset: 0, background: `linear-gradient(110deg, ${p.deep} 0%, ${p.bg} 60%, ${p.deep} 100%)` })} />
      {/* Light through venetian blinds, falling across the right of the frame. */}
      <div
        style={abs({
          inset: "-10cqw",
          background: `repeating-linear-gradient(-24deg, transparent 0 2.4cqw, ${p.glow}30 2.4cqw 4.6cqw)`,
          WebkitMaskImage: "linear-gradient(105deg, transparent 38%, #000 58%, #000 82%, transparent 98%)",
          maskImage: "linear-gradient(105deg, transparent 38%, #000 58%, #000 82%, transparent 98%)",
        })}
      />
      <div style={abs({ left: "8cqw", top: 0, bottom: 0, right: "28cqw", display: "flex", flexDirection: "column", justifyContent: "center" })}>
        <Small size={1.5} style={{ color: p.ink, opacity: 0.7, letterSpacing: "0.35em" }}>{card.maker}</Small>
        <div style={{ width: "9cqw", height: "0.45cqw", background: p.accent, margin: "2cqw 0 2.4cqw" }} />
        <Title fit={fit} style={{ fontFamily: FACE.baskerville, fontStyle: "italic", lineHeight: 1.02, color: p.ink }} />
        <Small size={1.5} style={{ color: p.accent, marginTop: "3cqw", letterSpacing: "0.3em" }}>{dateLine(card)}</Small>
      </div>
    </>
  );
};

const split: Draw = ({ card, p }) => {
  const fit = fitText(card.title.toUpperCase(), { width: 82, max: 9, min: 3.2, em: 0.78, maxLines: 2 });
  return (
    <>
      <div style={abs({ inset: 0, background: `radial-gradient(ellipse 60% 90% at 80% 20%, ${p.accent}33, transparent 60%), ${p.bg}` })} />
      {/* The band the title rides on, tilted across the frame. */}
      <div
        style={abs({
          left: "-8cqw", right: "-8cqw", top: "50%", transform: "translateY(-50%) rotate(-5deg)", background: p.accent,
          padding: "2.6cqw 0 2.2cqw", display: "flex", justifyContent: "center", boxShadow: `0 1.5cqw 4cqw ${p.deep}`,
        })}
      >
        <Title fit={fit} style={{ fontFamily: FACE.futura, fontWeight: 800, letterSpacing: "0.06em", lineHeight: 1, color: p.ink, textAlign: "center" }} />
      </div>
      <Small size={1.6} style={{ ...abs({ left: "6cqw", top: "5.5cqw", maxWidth: "60cqw" }), color: p.glow, letterSpacing: "0.3em" }}>{card.maker}</Small>
      <Small size={1.6} style={{ ...abs({ right: "6cqw", bottom: "5cqw", maxWidth: "60cqw" }), color: p.glow, letterSpacing: "0.3em" }}>{dateLine(card)}</Small>
    </>
  );
};

// ---------------------------------------------------------------- posters

/** What every poster has around its art: the cast across the top, and at the
 *  foot the tagline, the billing block and the date. A title passed as `title`
 *  sits directly above them, so however long the credits run the two never meet. */
function PosterFrame({ card, p, children, title }: { card: ProjectCard; p: Palette; children: ReactNode; title?: ReactNode }) {
  const ink = p.ink;
  return (
    <>
      {children}
      <div style={column({ top: "6cqw" })}>
        <Names card={card} color={ink} />
      </div>
      <div style={column({ bottom: "6cqw", gap: "2.6cqw" })}>
        {title && <div style={{ marginBottom: "1.4cqw" }}>{title}</div>}
        <Tagline text={card.tagline} color={ink} />
        <Billing card={card} color={ink} />
        <Small size={3} style={{ color: p.accent, letterSpacing: "0.3em", maxWidth: "88cqw" }}>{dateLine(card)}</Small>
      </div>
    </>
  );
}

const monolith: Draw = ({ card, p }) => {
  const fit = fitText(card.title.toUpperCase(), { width: 84, max: 11, min: 4.2, em: 0.84, maxLines: 2 });
  return (
    <PosterFrame card={card} p={p} title={<Title fit={fit} style={{ fontFamily: FACE.didone, letterSpacing: "0.1em", lineHeight: 1.05, color: p.ink }} />}>
      <div style={abs({ inset: 0, background: `radial-gradient(ellipse 60% 40% at 50% 62%, ${p.accent}30, transparent 70%), linear-gradient(180deg, ${p.deep}, ${p.bg} 70%, ${p.deep})` })} />
      {/* A door of light standing in the dark, and its reflection. */}
      <div style={abs({ left: "45.5cqw", width: "9cqw", top: "22cqw", height: "56cqw", background: `linear-gradient(180deg, ${p.glow}00, ${p.glow} 30%, ${p.accent} 100%)`, boxShadow: `0 0 10cqw 2cqw ${p.accent}66` })} />
      <div style={abs({ left: "30cqw", width: "40cqw", top: "77cqw", height: "6cqw", borderRadius: "50%", background: `radial-gradient(ellipse, ${p.accent}88, transparent 70%)` })} />
    </PosterFrame>
  );
};

/** A sky of fixed stars; the same on every card. */
const STARS = [
  [8, 14], [22, 30], [37, 9], [61, 18], [79, 11], [91, 27], [14, 46], [70, 38], [88, 52], [5, 63], [48, 25], [95, 70],
].map(([x, y]) => `radial-gradient(circle at ${x}% ${y}%, #ffffffcc 0.12cqw, transparent 0.3cqw)`).join(", ");

const orbit: Draw = ({ card, p }) => {
  const fit = fitText(card.title.toUpperCase(), { width: 90, max: 17, min: 6, em: 0.56, maxLines: 2 });
  const ring: CSSProperties = abs({
    left: "-12cqw", width: "124cqw", top: "50cqw", height: "18cqw", borderRadius: "50%",
    border: `0.5cqw solid ${p.glow}`, transform: "rotate(-14deg)", opacity: 0.85,
  });
  return (
    <PosterFrame
      card={card}
      p={p}
      title={<Title fit={fit} style={{ fontFamily: FACE.impact, letterSpacing: "0.015em", lineHeight: 0.9, color: p.ink, textShadow: `0 1cqw 3cqw ${p.deep}` }} />}
    >
      <div style={abs({ inset: 0, background: `${STARS}, linear-gradient(180deg, ${p.deep}, ${p.bg})` })} />
      <div style={ring} />
      <div style={abs({ left: "14cqw", width: "72cqw", height: "72cqw", top: "23cqw", borderRadius: "50%", background: `radial-gradient(circle at 34% 28%, ${p.glow}, ${p.accent} 38%, ${p.deep} 92%)`, boxShadow: `0 0 12cqw ${p.accent}55` })} />
      {/* The near half of the ring passes in front of the planet. */}
      <div style={{ ...ring, clipPath: "inset(50% 0 0 0)" }} />
    </PosterFrame>
  );
};

const stack: Draw = ({ card, p }) => {
  const fit = fitText(card.title.toUpperCase(), { width: 86, max: 24, min: 6, em: 0.66, maxLines: 4 });
  return (
    <PosterFrame card={card} p={p}>
      <div style={abs({ inset: 0, background: p.bg })} />
      <div style={abs({ right: "-16cqw", bottom: "28cqw", width: "64cqw", height: "64cqw", borderRadius: "50%", background: p.glow })} />
      <div style={abs({ left: "7cqw", right: "7cqw", top: "15cqw", height: "0.9cqw", background: p.ink })} />
      <div style={abs({ left: "7cqw", top: "19cqw", right: "7cqw" })}>
        <Title fit={fit} style={{ fontFamily: FACE.sans, fontWeight: 800, letterSpacing: "-0.045em", lineHeight: 0.86, color: p.ink }} />
      </div>
    </PosterFrame>
  );
};

const horizon: Draw = ({ card, p }) => {
  const fit = fitText(card.title.toUpperCase(), { width: 82, max: 9, min: 3.6, em: 0.9, maxLines: 3 });
  // Three soft fields of colour stacked like a colour-field painting.
  const band = (top: number, height: number, color: string): CSSProperties =>
    abs({ left: "8cqw", right: "8cqw", top: `${top}cqw`, height: `${height}cqw`, background: color, filter: "blur(1.4cqw)", borderRadius: "2cqw" });
  return (
    <PosterFrame card={card} p={p}>
      <div style={abs({ inset: 0, background: p.deep })} />
      <div style={band(17, 30, p.bg)} />
      <div style={band(50, 22, p.accent)} />
      <div style={band(75, 16, p.glow)} />
      <div style={column({ top: "50cqw", height: "22cqw", justifyContent: "center" })}>
        <Title fit={fit} style={{ fontFamily: FACE.futura, fontWeight: 700, letterSpacing: "0.18em", lineHeight: 1.15, color: p.ink, textShadow: `0 0.3cqw 2cqw ${p.deep}aa` }} />
      </div>
    </PosterFrame>
  );
};

const shards: Draw = ({ card, p }) => {
  const fit = fitText(card.title.toUpperCase(), { width: 88, max: 16, min: 5.5, em: 0.56, maxLines: 3 });
  return (
    <PosterFrame
      card={card}
      p={p}
      title={<Title fit={fit} style={{ fontFamily: FACE.impact, letterSpacing: "0.05em", lineHeight: 0.92, color: p.ink, textShadow: `0 0.6cqw 2.4cqw ${p.deep}` }} />}
    >
      <div style={abs({ inset: 0, background: `linear-gradient(160deg, ${p.bg}, ${p.deep})` })} />
      <div style={abs({ inset: 0, background: p.accent, clipPath: "polygon(0 34%, 100% 16%, 100% 30%, 0 58%)" })} />
      <div style={abs({ inset: 0, background: p.glow, clipPath: "polygon(0 60%, 100% 32%, 100% 34%, 0 63.5%)", opacity: 0.9 })} />
      <div style={abs({ inset: 0, background: `${p.accent}55`, clipPath: "polygon(35% 0, 52% 0, 20% 100%, 3% 100%)" })} />
    </PosterFrame>
  );
};

// ------------------------------------------------------------ album covers

function CoverArtist({ card, color, style }: { card: ProjectCard; color: string; style?: CSSProperties }) {
  return (
    <div style={{ fontFamily: FACE.sans, fontSize: "3.6cqw", fontWeight: 500, color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", ...style }}>
      {artistOf(card)}
    </div>
  );
}

const record: Draw = ({ card, p }) => {
  const fit = fitText(card.title.toLowerCase(), { width: 38, max: 10, min: 3.4, em: 0.56, maxLines: 4 });
  return (
    <>
      <div style={abs({ inset: 0, background: p.bg })} />
      {/* A record half out of its sleeve: grooves, then the label. */}
      <div style={abs({ left: "44cqw", top: "16cqw", width: "68cqw", height: "68cqw", borderRadius: "50%", background: "conic-gradient(from 20deg, transparent 0 4%, #ffffff16 9%, transparent 16% 50%, #ffffff16 59%, transparent 66%), repeating-radial-gradient(circle, #141414 0 0.45cqw, #262626 0.45cqw 0.8cqw)", boxShadow: "0 1cqw 3cqw #00000055" })} />
      <div style={abs({ left: "68cqw", top: "40cqw", width: "20cqw", height: "20cqw", borderRadius: "50%", background: p.accent, boxShadow: "inset 0 0 0 0.5cqw #00000022" })} />
      <div style={abs({ left: "77cqw", top: "49cqw", width: "2cqw", height: "2cqw", borderRadius: "50%", background: p.bg })} />
      <CoverArtist card={card} color={p.ink} style={abs({ left: "6cqw", top: "6cqw", maxWidth: "80cqw" })} />
      <div style={abs({ left: "6cqw", bottom: "6cqw", width: "40cqw" })}>
        <Title fit={fit} style={{ fontFamily: FACE.sans, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 0.95, color: p.ink }} />
      </div>
    </>
  );
};

const swiss: Draw = ({ card, p }) => {
  const fit = fitText(card.title.toLowerCase(), { width: 86, max: 16, min: 4.5, em: 0.56, maxLines: 3 });
  return (
    <>
      <div style={abs({ inset: 0, background: p.bg })} />
      <div style={abs({ right: "-30cqw", bottom: "-30cqw", width: "88cqw", height: "88cqw", borderRadius: "50%", background: p.glow })} />
      <div style={abs({ right: "6cqw", bottom: "6cqw", width: "12cqw", height: "12cqw", background: p.accent === p.glow ? p.ink : p.accent })} />
      <div style={abs({ left: "6cqw", top: "6cqw", right: "6cqw" })}>
        <Title fit={fit} style={{ fontFamily: FACE.sans, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 0.9, color: p.ink }} />
      </div>
      <CoverArtist card={card} color={p.ink} style={abs({ left: "6cqw", bottom: "6cqw", maxWidth: "52cqw" })} />
    </>
  );
};

const bands: Draw = ({ card, p }) => {
  const fit = fitText(card.title.toUpperCase(), { width: 72, max: 8.5, min: 3.2, em: 0.78, maxLines: 2 });
  const stripes = [p.bg, p.deep, p.accent, p.glow, p.bg];
  const bg = `linear-gradient(180deg, ${stripes.map((c, i) => `${c} ${i * 20}% ${(i + 1) * 20}%`).join(", ")})`;
  return (
    <>
      <div style={abs({ inset: 0, background: bg })} />
      <div style={abs({ left: "8cqw", right: "8cqw", bottom: "8cqw", background: p.ink, padding: "4.5cqw 6cqw 5cqw", display: "flex", flexDirection: "column", alignItems: "flex-start" })}>
        <Small size={2.6} style={{ color: p.bg, letterSpacing: "0.3em", maxWidth: "72cqw" }}>{artistOf(card)}</Small>
        <Title fit={fit} style={{ marginTop: "2cqw", fontFamily: FACE.futura, fontWeight: 700, letterSpacing: "0.04em", lineHeight: 1.02, color: p.bg }} />
      </div>
    </>
  );
};

const echo: Draw = ({ card, p }) => {
  const fit = fitText(card.title.toUpperCase(), { width: 90, max: 17, min: 5, em: 0.56, maxLines: 1 });
  const rows = Math.max(3, Math.min(8, Math.floor(80 / (fit.size * 0.92))));
  return (
    <>
      <div style={abs({ inset: 0, background: p.bg })} />
      <div style={abs({ left: "5cqw", right: "5cqw", top: "6cqw" })}>
        {Array.from({ length: rows }, (_, i) => {
          const last = i === rows - 1;
          return (
            <Title
              key={i}
              fit={fit}
              style={{
                fontFamily: FACE.impact, lineHeight: 0.92, letterSpacing: "0.01em",
                color: last ? p.accent : "transparent", WebkitTextStroke: last ? undefined : `0.16cqw ${p.ink}`,
                opacity: last ? 1 : 0.25 + (0.6 * i) / rows,
              }}
            />
          );
        })}
      </div>
      <CoverArtist card={card} color={p.ink} style={abs({ left: "5cqw", bottom: "5cqw", maxWidth: "90cqw" })} />
    </>
  );
};

// ------------------------------------------------------------ tour posters

/** The dates of a tour: one column, or two once there are more than six. */
function Stops({ card, color, accent, align = "left" }: { card: ProjectCard; color: string; accent: string; align?: "left" | "center" }) {
  const stops = card.stops.slice(0, 12);
  if (!stops.length) {
    return <Small size={3.2} style={{ color: accent, textAlign: "center" }}>{dateLine(card)}</Small>;
  }
  const two = stops.length > 6;
  return (
    <div style={{ display: "grid", gridTemplateColumns: two ? "1fr 1fr" : "1fr", columnGap: "6cqw", rowGap: "1.3cqw", width: "100%", justifyItems: align === "center" && !two ? "center" : "stretch" }}>
      {stops.map((s, i) => (
        <div key={i} style={{ display: "flex", gap: "2.4cqw", alignItems: "baseline", minWidth: 0, fontFamily: FACE.narrow, textTransform: "uppercase", fontSize: two ? "2.7cqw" : "3.2cqw", lineHeight: 1.1 }}>
          <span style={{ color: accent, fontWeight: 700, letterSpacing: "0.06em", flexShrink: 0, minWidth: two ? "10cqw" : "12cqw" }}>{s.date}</span>
          <span style={{ color, fontWeight: 600, letterSpacing: "0.08em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.city}</span>
        </div>
      ))}
    </div>
  );
}

const bill: Draw = ({ card, p }) => {
  const artist = fitText(artistOf(card).toUpperCase(), { width: 86, max: 22, min: 7, em: 0.56, maxLines: 2 });
  const tour = fitText(card.title, { width: 80, max: 7, min: 3.2, em: 0.5, maxLines: 2 });
  return (
    <>
      <div style={abs({ inset: 0, background: `radial-gradient(ellipse at 50% 30%, ${p.bg}, ${p.deep})` })} />
      <div style={abs({ inset: "3cqw", border: `0.5cqw solid ${p.ink}` })} />
      <div style={column({ top: "9cqw", left: "7cqw", right: "7cqw" })}>
        <Title fit={artist} style={{ fontFamily: FACE.impact, lineHeight: 0.9, letterSpacing: "0.02em", color: p.ink }} />
        <Title fit={tour} style={{ marginTop: "2.4cqw", fontFamily: FACE.baskerville, fontStyle: "italic", lineHeight: 1.05, color: p.accent }} />
        <div style={{ width: "100%", height: "0.9cqw", background: p.ink, margin: "4cqw 0 1cqw" }} />
        <div style={{ width: "100%", height: "0.3cqw", background: p.ink, marginBottom: "4cqw" }} />
        <Stops card={card} color={p.ink} accent={p.accent} />
      </div>
      <div style={column({ bottom: "7cqw", left: "7cqw", right: "7cqw" })}>
        <Small size={2.2} style={{ color: p.ink, letterSpacing: "0.3em", maxWidth: "86cqw" }}>{card.maker}</Small>
      </div>
    </>
  );
};

const night: Draw = ({ card, p }) => {
  const artist = fitText(artistOf(card).toUpperCase(), { width: 84, max: 12, min: 4.5, em: 0.84, maxLines: 2 });
  const tour = fitText(card.title, { width: 78, max: 6, min: 3, em: 0.5, maxLines: 2 });
  return (
    <>
      <div style={abs({ inset: 0, background: `${STARS}, radial-gradient(ellipse 90% 50% at 50% 100%, ${p.glow}66, transparent 70%), linear-gradient(180deg, ${p.deep}, ${p.bg})` })} />
      <div style={column({ top: "12cqw", left: "8cqw", right: "8cqw" })}>
        <Title fit={artist} style={{ fontFamily: FACE.didone, letterSpacing: "0.1em", lineHeight: 1.05, color: p.ink }} />
        <Title fit={tour} style={{ marginTop: "2.6cqw", fontFamily: FACE.baskerville, fontStyle: "italic", lineHeight: 1.1, color: p.accent }} />
        <div style={{ display: "flex", alignItems: "center", gap: "2cqw", margin: "5cqw 0" }}>
          <div style={{ width: "10cqw", height: "0.2cqw", background: p.accent }} />
          <div style={{ width: "1.4cqw", height: "1.4cqw", background: p.accent, transform: "rotate(45deg)" }} />
          <div style={{ width: "10cqw", height: "0.2cqw", background: p.accent }} />
        </div>
        <Stops card={card} color={p.ink} accent={p.accent} align="center" />
      </div>
      <div style={column({ bottom: "7cqw" })}>
        <Small size={2} style={{ color: p.ink, opacity: 0.7, letterSpacing: "0.35em", maxWidth: "84cqw" }}>{card.maker}</Small>
      </div>
    </>
  );
};

const sunburst: Draw = ({ card, p }) => {
  const artist = fitText(artistOf(card).toUpperCase(), { width: 86, max: 15, min: 5, em: 0.78, maxLines: 2 });
  const tour = fitText(card.title.toUpperCase(), { width: 80, max: 5, min: 2.6, em: 0.98, maxLines: 2 });
  return (
    <>
      <div style={abs({ inset: 0, background: `repeating-conic-gradient(from -90deg at 50% 52%, ${p.bg} 0deg 7.5deg, ${p.deep} 7.5deg 15deg)` })} />
      <div style={abs({ left: "30cqw", top: "48cqw", width: "40cqw", height: "40cqw", borderRadius: "50%", background: p.glow, transform: "translateY(-50%)" })} />
      <div style={column({ top: "8cqw", left: "6cqw", right: "6cqw" })}>
        <Title fit={artist} style={{ fontFamily: FACE.futura, fontWeight: 800, letterSpacing: "0.03em", lineHeight: 0.95, color: p.ink }} />
        <Title fit={tour} style={{ marginTop: "2cqw", fontFamily: FACE.futura, fontWeight: 600, letterSpacing: "0.25em", lineHeight: 1.15, color: p.ink }} />
      </div>
      <div style={abs({ left: "7cqw", right: "7cqw", bottom: "7cqw", background: p.ink, padding: "4.5cqw 5cqw", display: "flex", flexDirection: "column", gap: "3cqw", alignItems: "center" })}>
        <Stops card={card} color="#ffffff" accent={p.glow} />
        <Small size={1.9} style={{ color: "#ffffff", opacity: 0.7, letterSpacing: "0.3em", maxWidth: "76cqw" }}>{card.maker}</Small>
      </div>
    </>
  );
};

// ---------------------------------------------------------- game key art

/** A game's publisher at the top, its platforms and date along the foot. */
function GameFrame({ card, color, accent, children }: { card: ProjectCard; color: string; accent: string; children: ReactNode }) {
  return (
    <>
      {children}
      <Small size={1.45} style={{ ...abs({ left: "4.5cqw", top: "4cqw", maxWidth: "50cqw" }), color, opacity: 0.85, letterSpacing: "0.3em" }}>{card.maker}</Small>
      <div style={abs({ left: "4.5cqw", right: "4.5cqw", bottom: "3.6cqw", display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "4cqw" })}>
        <Small size={1.45} style={{ color, opacity: 0.85, letterSpacing: "0.16em", minWidth: 0 }}>{card.platforms ?? ""}</Small>
        <Small size={1.6} style={{ color: accent, letterSpacing: "0.24em", flexShrink: 0 }}>{dateLine(card)}</Small>
      </div>
    </>
  );
}

const synth: Draw = ({ card, p }) => {
  const fit = fitText(card.title.toUpperCase(), { width: 84, max: 12, min: 4, em: 0.58, maxLines: 2 });
  return (
    <GameFrame card={card} color={p.ink} accent={p.glow}>
      <div style={abs({ inset: 0, background: `linear-gradient(180deg, ${p.deep} 0%, ${p.bg} 58%, ${p.deep} 58%)` })} />
      {/* A striped sun on the horizon. */}
      <div
        style={abs({
          left: "36cqw", width: "28cqw", height: "28cqw", top: "6.5cqw", borderRadius: "50%",
          background: `linear-gradient(180deg, ${p.glow}, ${p.accent})`,
          WebkitMaskImage: "linear-gradient(180deg, #000 0 50%, transparent 50% 54%, #000 54% 64%, transparent 64% 69%, #000 69% 78%, transparent 78% 84%, #000 84% 91%, transparent 91%)",
          maskImage: "linear-gradient(180deg, #000 0 50%, transparent 50% 54%, #000 54% 64%, transparent 64% 69%, #000 69% 78%, transparent 78% 84%, #000 84% 91%, transparent 91%)",
        })}
      />
      {/* The grid floor, running off to the horizon. */}
      <div style={abs({ left: 0, right: 0, top: "32.6cqw", bottom: 0, overflow: "hidden", perspective: "18cqw" })}>
        <div
          style={abs({
            left: "-60cqw", right: "-60cqw", top: 0, height: "80cqw", transformOrigin: "50% 0", transform: "rotateX(62deg)",
            backgroundImage: `linear-gradient(${p.accent} 0.25cqw, transparent 0.25cqw), linear-gradient(90deg, ${p.accent} 0.25cqw, transparent 0.25cqw)`,
            backgroundSize: "6cqw 6cqw",
            WebkitMaskImage: "linear-gradient(180deg, transparent, #000 30%)",
            maskImage: "linear-gradient(180deg, transparent, #000 30%)",
          })}
        />
      </div>
      <div style={column({ top: 0, bottom: "8cqw", justifyContent: "center" })}>
        <Title
          fit={fit}
          style={{
            fontFamily: FACE.impact, fontStyle: "italic", letterSpacing: "0.03em", lineHeight: 0.92, transform: "skewX(-6deg)",
            ...gradientText(`linear-gradient(180deg, #ffffff 0%, ${p.glow} 46%, ${p.deep} 50%, ${p.accent} 100%)`),
            filter: `drop-shadow(0 0 1.4cqw ${p.accent})`,
          }}
        />
      </div>
    </GameFrame>
  );
};

const peaks: Draw = ({ card, p }) => {
  const fit = fitText(card.title.toUpperCase(), { width: 80, max: 7.5, min: 3, em: 1.02, maxLines: 2 });
  const range = (color: string, points: string, opacity = 1): CSSProperties =>
    abs({ inset: 0, background: color, clipPath: `polygon(${points})`, opacity });
  return (
    <GameFrame card={card} color={p.ink} accent={p.accent}>
      <div style={abs({ inset: 0, background: `radial-gradient(ellipse 50% 45% at 62% 38%, ${p.accent}55, transparent 70%), linear-gradient(180deg, ${p.bg}, ${p.glow})` })} />
      <div style={range(p.glow, "0 70%, 14% 52%, 26% 61%, 44% 34%, 58% 50%, 70% 40%, 86% 56%, 100% 46%, 100% 100%, 0 100%", 0.55)} />
      <div style={range(p.bg, "0 78%, 18% 62%, 32% 72%, 52% 55%, 66% 68%, 82% 58%, 100% 70%, 100% 100%, 0 100%", 0.9)} />
      <div style={range(p.deep, "0 88%, 22% 76%, 40% 86%, 60% 74%, 78% 84%, 100% 78%, 100% 100%, 0 100%")} />
      <div style={abs({ left: 0, right: 0, top: "34cqw", height: "12cqw", background: `linear-gradient(180deg, transparent, ${p.glow}44, transparent)` })} />
      <div style={column({ top: "9cqw" })}>
        <Title fit={fit} style={{ fontFamily: FACE.copperplate, letterSpacing: "0.12em", lineHeight: 1.1, color: p.ink, textShadow: `0 0.3cqw 1.6cqw ${p.deep}` }} />
        <div style={{ display: "flex", alignItems: "center", gap: "1.4cqw", marginTop: "1.6cqw" }}>
          <div style={{ width: "8cqw", height: "0.18cqw", background: p.accent }} />
          <div style={{ width: "1cqw", height: "1cqw", background: p.accent, transform: "rotate(45deg)" }} />
          <div style={{ width: "8cqw", height: "0.18cqw", background: p.accent }} />
        </div>
      </div>
    </GameFrame>
  );
};

const hud: Draw = ({ card, p }) => {
  const fit = fitText(card.title.toUpperCase(), { width: 72, max: 10, min: 3.6, em: 0.6, maxLines: 2 });
  const corner = (pos: CSSProperties, sides: string): CSSProperties => ({
    ...abs({ width: "5cqw", height: "5cqw", ...pos }),
    borderColor: p.accent, borderStyle: "solid", borderWidth: sides,
  });
  return (
    <GameFrame card={card} color={p.ink} accent={p.accent}>
      <div style={abs({ inset: 0, background: `repeating-linear-gradient(180deg, #ffffff06 0 0.3cqw, transparent 0.3cqw 0.9cqw), radial-gradient(ellipse 70% 90% at 75% 50%, ${p.glow}, ${p.bg} 50%, ${p.deep})` })} />
      <div style={abs({ right: "-6cqw", top: "-10cqw", width: "46cqw", height: "80cqw", background: `${p.accent}18`, transform: "rotate(18deg)" })} />
      <div style={corner({ left: "3cqw", top: "3cqw" }, "0.3cqw 0 0 0.3cqw")} />
      <div style={corner({ right: "3cqw", top: "3cqw" }, "0.3cqw 0.3cqw 0 0")} />
      <div style={corner({ left: "3cqw", bottom: "3cqw" }, "0 0 0.3cqw 0.3cqw")} />
      <div style={corner({ right: "3cqw", bottom: "3cqw" }, "0 0.3cqw 0.3cqw 0")} />
      <div style={abs({ left: "8cqw", right: "20cqw", top: 0, bottom: "4cqw", display: "flex", alignItems: "center", gap: "2.4cqw" })}>
        <div style={{ width: "0.8cqw", alignSelf: "stretch", margin: "17cqw 0", background: p.accent }} />
        <Title fit={fit} style={{ fontFamily: FACE.narrow, fontWeight: 800, letterSpacing: "0.06em", lineHeight: 0.95, color: p.ink, fontStretch: "condensed" }} />
      </div>
    </GameFrame>
  );
};

const toybox: Draw = ({ card, p }) => {
  const fit = fitText(card.title, { width: 78, max: 10, min: 3.6, em: 0.62, maxLines: 2 });
  const blob = (left: number, top: number, size: number, color: string): CSSProperties =>
    abs({ left: `${left}cqw`, top: `${top}cqw`, width: `${size}cqw`, height: `${size}cqw`, borderRadius: "50%", background: color });
  return (
    <GameFrame card={card} color={p.ink} accent={p.ink}>
      <div style={abs({ inset: 0, background: `radial-gradient(circle at 50% 45%, ${p.bg}, ${p.deep})` })} />
      <div style={blob(-8, -10, 30, p.accent)} />
      <div style={blob(78, 30, 34, p.glow)} />
      <div style={blob(14, 40, 12, p.glow)} />
      <div style={blob(70, -6, 14, "#ffffff88")} />
      <div style={blob(34, 46, 6, p.accent)} />
      <div style={column({ top: 0, bottom: "4cqw", justifyContent: "center" })}>
        <Title
          fit={fit}
          style={{
            fontFamily: FACE.rounded, fontWeight: 800, lineHeight: 1, color: p.ink,
            WebkitTextStroke: `${(fit.size * 0.14).toFixed(2)}cqw #ffffff`, paintOrder: "stroke fill",
            textShadow: `0 0.6cqw 0 ${p.accent}`,
          }}
        />
      </div>
    </GameFrame>
  );
};

const DRAW: Record<string, Draw> = {
  eclipse, marquee, field, blinds, split,
  monolith, orbit, stack, horizon, shards,
  record, swiss, bands, echo,
  bill, night, sunburst,
  synth, peaks, hud, toybox,
};

export function ProjectMedia({ card, large }: { card: ProjectCard; large: boolean }) {
  const { layout, palette } = lookOf(card);
  const draw = DRAW[layout];
  if (!draw || !card.title) return null;
  const aspect = ASPECT[card.format] ?? 16 / 9;
  // Cap the height in the feed by narrowing the card, the way a portrait image is shown.
  const maxWidth = Math.round((large ? DETAIL_MAX_HEIGHT : FEED_MAX_HEIGHT) * aspect);
  return (
    <MediaFrame className="bg-black">
      <div style={{ background: `radial-gradient(ellipse at 50% 50%, ${palette.bg}66, #000 80%)` }}>
        <div
          role="img"
          aria-label={`${KIND_LABEL[card.kind]}: ${card.title}, ${card.maker}`}
          className="relative mx-auto w-full select-none overflow-hidden"
          style={{ maxWidth, aspectRatio: aspect, containerType: "inline-size" }}
        >
          {draw({ card, p: palette })}
        </div>
      </div>
    </MediaFrame>
  );
}
