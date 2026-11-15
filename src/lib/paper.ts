// The Arc's back issues: storing an edition with its page and the post that
// carries its front page, and the reads behind the edition page and the
// director's memory. Writing an edition is sim/edition.ts. Server-only.
import { ARC_HANDLE, editionDate, type Edition, type EditionResponse, type FrontPage } from "./arc";
import { db, now, type ArticleRow } from "./db";
import type { ArticleCard, WorldDigest } from "./types";
import { articleCards, qs } from "./views";
import { insertPost } from "./write";

interface EditionRow {
  id: number;
  date: string;
  edition: string;
  article_id: number;
  post_id: number | null;
  created_at: number;
}

function parse(raw: string): Edition | null {
  try {
    const e = JSON.parse(raw) as Edition;
    return e && typeof e === "object" && e.lead ? e : null;
  } catch {
    return null;
  }
}

/** Published editions (their page is visible), newest first. */
function published(limit: number, exceptArticle: number | null = null): EditionRow[] {
  return db()
    .prepare(
      `SELECT e.* FROM editions e JOIN articles a ON a.id = e.article_id
       WHERE a.created_at <= ? AND e.article_id != ? ORDER BY e.date DESC LIMIT ?`,
    )
    .all(now(), exceptArticle ?? -1, limit) as unknown as EditionRow[];
}

export function hasEdition(date: string): boolean {
  return !!db().prepare("SELECT 1 FROM editions WHERE date = ?").get(date);
}

export function editionCount(): number {
  return (db().prepare("SELECT COUNT(*) AS n FROM editions").get() as { n: number }).n;
}

/** The newest edition, published or not. */
export function latestEdition(): Edition | null {
  const row = db().prepare("SELECT edition FROM editions ORDER BY date DESC LIMIT 1").get() as
    | { edition: string } | undefined;
  return row ? parse(row.edition) : null;
}

/** How the post carrying an edition reads: the morning form. */
export function frontPagePost(e: Edition): string {
  return `Today's front page, ${editionDate(e.date)}.`;
}

/** What the front page shows in the feed. */
export function frontPage(e: Edition, page: ArticleCard): FrontPage {
  const strip = e.scores.length
    ? {
        label: "Scores",
        // A race's result is a podium, which needs the race's name in front of it.
        items: e.scores.slice(0, 6).map((s) => (s.score.startsWith("1.") ? `${s.title}: ${s.score}` : s.score)),
      }
    : e.markets.length
      ? {
          label: "Markets",
          items: e.markets.slice(0, 6).map((m) => `${m.ticker} ${fmtPrice(m.close)} ${m.changePct >= 0 ? "+" : "−"}${Math.abs(m.changePct).toFixed(1)}%`),
        }
      : null;
  return {
    page,
    number: e.number,
    date: e.date,
    lead: { headline: e.lead.headline, standfirst: e.lead.standfirst, text: e.lead.paragraphs.join(" ").slice(0, 2600) },
    stories: e.stories.slice(0, 3).map((s) => ({ headline: s.headline, text: s.text })),
    comment: { columnist: e.comment.columnist, headline: e.comment.headline, text: e.comment.paragraphs.join(" ").slice(0, 700) },
    chart: e.chart,
    strip,
    ears: [inside(e), e.comment.columnist ? `Comment: ${e.comment.columnist}` : "Comment"],
  };
}

/** "Inside: in brief, scores and markets". */
function inside(e: Edition): string {
  const parts = [e.briefs.length ? "in brief" : "", e.scores.length ? "scores" : "", e.markets.length ? "markets" : ""].filter(Boolean);
  if (!parts.length) return "Inside: comment";
  return `Inside: ${parts.length < 2 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`}`;
}

export function fmtPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (p >= 1) return p.toFixed(2);
  return p.toPrecision(3);
}

/** Store a finished edition: its page, the post carrying its front page and its
 *  row. Call inside tx(). The page and the post appear at `at`. */
export function storeEdition(e: Edition, at: number): { articleId: number; postId: number } {
  const conn = db();
  const art = conn
    .prepare("INSERT INTO articles (outlet, headline, dek, body, storyline_id, created_at, kind) VALUES (?, ?, ?, ?, NULL, ?, 'edition')")
    .run(ARC_HANDLE, e.lead.headline, e.lead.standfirst, e.lead.paragraphs.join("\n\n"), at);
  const articleId = Number(art.lastInsertRowid);
  const row = conn.prepare("SELECT * FROM articles WHERE id = ?").get(articleId) as unknown as ArticleRow;
  const card = articleCards([row])[0];
  if (!card) throw new Error(`The Arc's account is missing; edition ${e.date} not stored.`);
  const postId = insertPost({
    author: ARC_HANDLE,
    text: frontPagePost(e),
    createdAt: at,
    heat: 4,
    media: { kind: "frontpage", page: frontPage(e, card) },
    tactic: "report",
  });
  conn
    .prepare("INSERT INTO editions (date, edition, article_id, post_id, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(e.date, JSON.stringify(e), articleId, postId, at);
  return { articleId, postId };
}

/** FROM THE ARC: the last few editions' headlines, for the director. */
export function arcMemory(limit = 3): WorldDigest["paper"] {
  return published(limit).flatMap((r) => {
    const e = parse(r.edition);
    if (!e) return [];
    return [{ date: editionDate(r.date), number: e.number, headlines: [e.lead.headline, ...e.stories.slice(0, 4).map((s) => s.headline)] }];
  });
}

/** The edition page behind an article id, or null when the article is not an edition. */
export function getEdition(articleId: number): EditionResponse | null {
  const row = db()
    .prepare(
      `SELECT e.* FROM editions e JOIN articles a ON a.id = e.article_id WHERE e.article_id = ? AND a.created_at <= ?`,
    )
    .get(articleId, now()) as unknown as EditionRow | undefined;
  const edition = row && parse(row.edition);
  if (!row || !edition) return null;

  const ids = [...new Set([edition.lead.storylineId, ...edition.stories.map((s) => s.storylineId)].filter((x): x is number => x != null))];
  const titles = ids.length
    ? (db().prepare(`SELECT id, title FROM storylines WHERE id IN (${qs(ids.length)})`).all(...ids) as { id: number; title: string }[])
    : [];
  const storylines: Record<number, string> = Object.fromEntries(titles.map((s) => [s.id, s.title]));

  const others = published(30, articleId);
  const pages = others.length
    ? (db().prepare(`SELECT * FROM articles WHERE id IN (${qs(others.length)})`).all(...others.map((o) => o.article_id)) as unknown as ArticleRow[])
    : [];
  const cards = new Map(articleCards(pages).map((c) => [c.id, c]));
  const issues = others.flatMap((o) => {
    const card = cards.get(o.article_id);
    const e = parse(o.edition);
    return card && e ? [{ card, number: e.number, date: o.date, lead: e.lead.headline }] : [];
  });
  // Back issues are only the older ones; a reader opening an old edition sees the newer ones apart.
  return {
    edition, storylines,
    backIssues: issues.filter((i) => i.date < row.date),
    laterIssues: issues.filter((i) => i.date > row.date),
  };
}
