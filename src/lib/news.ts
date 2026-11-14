// Real headlines in: the feeds, which of them are allowed, and which subject each belongs to.
import { db, now, tx } from "./db";
import { FIGURES } from "./cast";
import { PREMISES } from "./premises";
import { SUBJECTS, SUBJECT_INFO, type Subject } from "./subjects";
import type { Domain, WorldDigest } from "./types";

const TIMEOUT_MS = 6_000;
const MAX_ROWS = 400;
const MAX_AGE_MS = 3 * 24 * 3600_000;

interface Item {
  source: string;
  title: string;
  link: string | null;
  publishedAt: number | null;
  fallback: Domain; // domain when no cast member is named
}

// ----------------------------------------------------------------- sources

// Names (and common short forms) used to search and to tag headlines.
const ALIASES: Record<string, string[]> = {
  elonmusk: ["Elon Musk", "Musk"],
  sama: ["Sam Altman", "Altman"],
  zuck: ["Mark Zuckerberg", "Zuckerberg"],
  JeffBezos: ["Jeff Bezos", "Bezos"],
  jensenhuang: ["Jensen Huang"],
  mcuban: ["Mark Cuban"],
  BillAckman: ["Bill Ackman", "Ackman"],
  taylorswift13: ["Taylor Swift"],
  KimKardashian: ["Kim Kardashian"],
  KylieJenner: ["Kylie Jenner"],
  Drake: ["Drake"],
  iamcardib: ["Cardi B"],
  rihanna: ["Rihanna"],
  RealChalamet: ["Timothée Chalamet", "Timothee Chalamet", "Chalamet"],
  realDonaldTrump: ["Donald Trump", "Trump"],
  JDVance: ["JD Vance", "J.D. Vance", "Vance"],
  AOC: ["Ocasio-Cortez", "AOC"],
  GavinNewsom: ["Gavin Newsom", "Newsom"],
  KingJames: ["LeBron James", "LeBron"],
  StephenCurry30: ["Stephen Curry", "Steph Curry"],
  PatrickMahomes: ["Patrick Mahomes", "Mahomes"],
  tkelce: ["Travis Kelce"],
  Cristiano: ["Cristiano Ronaldo", "Ronaldo"],
  KMbappe: ["Kylian Mbappé", "Kylian Mbappe", "Mbappé", "Mbappe"],
  ErlingHaaland: ["Erling Haaland", "Haaland"],
  stephenasmith: ["Stephen A. Smith"],
  PatMcAfeeShow: ["Pat McAfee"],
  ShannonSharpe: ["Shannon Sharpe"],
  ShamsCharania: ["Shams Charania"],
  AdamSchefter: ["Adam Schefter", "Schefter"],
  FabrizioRomano: ["Fabrizio Romano"],
  MrBeast: ["MrBeast", "Mr Beast"],
  VancityReynolds: ["Ryan Reynolds"],
  StephenKing: ["Stephen King"],
  TheRock: ["Dwayne Johnson"],
  // gaming, streamers and creators: several display names are not what a headline calls them
  KaiCenat: ["Kai Cenat"],
  ishowspeedsui: ["IShowSpeed"],
  xQc: ["xQc"],
  pokimanelol: ["Pokimane"],
  Ninja: ["Tyler Blevins", "Ninja Blevins", "streamer Ninja"],
  Asmongold: ["Asmongold"],
  LudwigAhgren: ["Ludwig Ahgren"],
  Valkyrae: ["Valkyrae"],
  KSI: ["KSI"],
  LoganPaul: ["Logan Paul"],
  geoffkeighley: ["Geoff Keighley", "Keighley"],
  jasonschreier: ["Jason Schreier", "Schreier"],
  TimSweeneyEpic: ["Tim Sweeney"],
};

const PEOPLE = FIGURES.map((f) => ({
  domain: f.domain,
  patterns: (ALIASES[f.handle] ?? [f.name]).map(
    (a) => new RegExp(`(?<![\\w])${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w])`, f.handle === "AOC" ? "" : "i"),
  ),
}));

function googleUrl(domain: Domain): string {
  const names = FIGURES.filter((f) => f.domain === domain).map(
    (f) => `"${ALIASES[f.handle]?.[0] ?? f.name}"`,
  );
  const q = encodeURIComponent(`(${names.join(" OR ")}) when:2d`).replace(/%20/g, "+");
  return `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
}

const SOURCES: { name: string; url: string; fallback: Domain }[] = [
  // A subject with no famous figures yet has nobody to search for.
  ...SUBJECTS.filter((k) => FIGURES.some((f) => f.domain === k)).map((k) => ({ name: "Google News", url: googleUrl(k), fallback: k })),
  ...SUBJECTS.flatMap((k) => SUBJECT_INFO[k].feeds.map((f) => ({ ...f, fallback: k }))),
];

// ----------------------------------------------------------------- parsing

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : null;
}

/** Items from an RSS (or Atom-ish) document. Google's " - Source" suffix is removed. */
export function parseRss(xml: string, defaultSource: string, fallback: Domain): Item[] {
  const out: Item[] = [];
  for (const m of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)) {
    const block = m[0];
    let title = tag(block, "title");
    if (!title) continue;
    let source = tag(block, "source") ?? defaultSource;
    const suffix = title.lastIndexOf(" - ");
    if (defaultSource === "Google News" && suffix > 0) {
      const tail = title.slice(suffix + 3);
      if (!tag(block, "source") || tail === source) source = tail;
      title = title.slice(0, suffix).trim();
    }
    const date = tag(block, "pubDate");
    const t = date ? Date.parse(date) : NaN;
    out.push({
      source,
      title,
      link: tag(block, "link"),
      publishedAt: Number.isFinite(t) ? t : null,
      fallback,
    });
  }
  return out;
}

// ----------------------------------------------------------------- filtering

// X's feed is full of lawsuits, summits, scandals and investigations, and those
// stay in. What is dropped is what the simulation must not riff on: deaths and
// killings, sexual content and abuse, children, self-harm and serious illness.
const BLOCKED = new RegExp(
  "\\b(" +
    [
      "dead", "dies", "died", "death", "deaths", "dying", "killed", "kills", "killing", "murder\\w*",
      "shot", "shooting", "shooter", "stabb\\w*", "massacre", "terror\\w*", "bomb\\w*", "hostage\\w*",
      "assault\\w*", "abuse\\w*", "trafficking", "rape\\w*", "sexual\\w*", "sex", "nude", "porn\\w*", "explicit",
      "child", "children", "kid", "kids", "minor", "minors", "teen", "teens", "teenager", "baby", "babies",
      "toddler", "son", "daughter", "pregnan\\w*",
      "suicide", "overdose\\w*", "cancer", "diagnos\\w*", "hospitali[sz]ed", "surgery", "illness",
      "tragedy", "tragic", "funeral", "obituary",
    ].join("|") +
    ")\\b",
  "i",
);

// "Drake" also names a university's sports teams: a headline that names Drake
// alongside college-sport words or a score is about the Bulldogs, not the rapper.
const DRAKE = /\bdrake\b/i;
const COLLEGE_SPORT = new RegExp(
  "\\b(universit\\w*|athletics|bulldogs|basketball|volleyball|wbb|mbb|ncaa|coyotes)\\b|\\b\\d{2,3}-\\d{2,3}\\b",
  "i",
);

// Words that are blocked for good reason elsewhere but are everyday sport: a
// shot, a shooting slump, the minors, a kid from Akron, Son Heung-min.
const SPORT_WORDS = /\b(shot|shooting|shooter|minor|minors|kid|kids|son|teen|teens)\b/gi;

// Words a subject's headlines may use although the blocklist stops them elsewhere.
const EVERYDAY_WORDS: Record<Subject, RegExp | null> = { tech: null, markets: null, pop: null, gaming: null, politics: null, sports: SPORT_WORDS };

export function isAllowed(title: string, domain: Domain | null = null): boolean {
  const everyday = domain && domain !== "crossover" ? EVERYDAY_WORDS[domain] : null;
  const checked = everyday ? title.replace(everyday, " ") : title;
  return !BLOCKED.test(checked) && !(DRAKE.test(title) && COLLEGE_SPORT.test(title));
}

export function classify(title: string, fallback: Domain): Domain {
  const found = new Set<Domain>();
  for (const p of PEOPLE) if (p.patterns.some((r) => r.test(title))) found.add(p.domain);
  if (found.size > 1) return "crossover";
  const [only] = [...found];
  return only ?? fallback;
}

// ------------------------------------------------------------------- fetching

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": "Mozilla/5.0 (compatible; Tangents/1.0)", accept: "application/rss+xml, application/xml, text/xml, */*" },
    });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

/** Fetch every source and return the allowed items (exported for testing). */
export async function fetchAll(): Promise<{ source: string; fetched: number; kept: number; items: Item[] }[]> {
  return Promise.all(
    SOURCES.map(async (s) => {
      const xml = await fetchText(s.url);
      const items = xml ? parseRss(xml, s.name, s.fallback) : [];
      const t = Date.now();
      const kept = items.filter(
        (i) => isAllowed(i.title, s.fallback) && (i.publishedAt === null || t - i.publishedAt < MAX_AGE_MS),
      );
      return { source: s.name, fetched: items.length, kept: kept.length, items: kept };
    }),
  );
}

/** Fetch the RSS feeds and store new headlines. Returns how many were added.
 *  Falls back to the bundled premises when nothing can be fetched. Never throws. */
export async function refreshHeadlines(): Promise<number> {
  try {
    const results = await fetchAll();
    const items = results.flatMap((r) => r.items);
    const stamp = now();
    const insert = db().prepare(
      `INSERT OR IGNORE INTO headlines (source, title, link, domain, published_at, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    let added = 0;
    tx(() => {
      for (const i of items) {
        // Published times are real; the simulation clock may be ahead of them.
        const r = insert.run(i.source, i.title, i.link, classify(i.title, i.fallback), i.publishedAt, stamp);
        added += Number(r.changes);
      }
      if (results.every((r) => r.fetched === 0)) added += insertPremises(stamp);
      prune();
    });
    return added;
  } catch (err) {
    console.error("refreshHeadlines failed", err);
    return 0;
  }
}

/** Only when the table has nothing unused to offer. */
function insertPremises(stamp: number): number {
  const unused = db().prepare("SELECT COUNT(*) AS n FROM headlines WHERE used = 0").get() as { n: number };
  if (unused.n > 0) return 0;
  const insert = db().prepare(
    "INSERT OR IGNORE INTO headlines (source, title, link, domain, published_at, fetched_at) VALUES ('Wire', ?, NULL, ?, NULL, ?)",
  );
  let n = 0;
  for (const p of PREMISES) n += Number(insert.run(p.title, p.domain, stamp).changes);
  return n;
}

function prune() {
  db()
    .prepare(
      // A headline a storyline or a beat grew from is kept for good: the story map cites it.
      `DELETE FROM headlines WHERE id IN (
         SELECT id FROM headlines
         WHERE id NOT IN (SELECT headline_id FROM storylines WHERE headline_id IS NOT NULL)
           AND id NOT IN (SELECT headline_id FROM beats WHERE headline_id IS NOT NULL)
         ORDER BY used ASC, COALESCE(published_at, fetched_at) DESC
         LIMIT -1 OFFSET ?)`,
    )
    .run(MAX_ROWS);
}

// -------------------------------------------------------------------- reading

/** Up to n unused headlines, mixed across domains. Ones the news desk has
 *  already fitted to this world come first, then the freshest. */
export function pickHeadlines(n: number): WorldDigest["headlines"] {
  const rows = db()
    .prepare(
      `SELECT id, source, COALESCE(adapted, title) AS title, domain, relation, storyline_id FROM headlines
       WHERE used = 0 AND COALESCE(relation, 'new') != 'skip'
       ORDER BY (relation IS NULL), COALESCE(published_at, fetched_at) DESC, id DESC LIMIT 200`,
    )
    .all() as {
    id: number; source: string; title: string; domain: Domain;
    relation: "new" | "continues" | "conflicts" | null; storyline_id: number | null;
  }[];
  const buckets = new Map<string, typeof rows>();
  for (const r of rows) {
    const b = buckets.get(r.domain) ?? [];
    b.push(r);
    buckets.set(r.domain, b);
  }
  const lists = [...buckets.values()];
  const out: typeof rows = [];
  // One big story fills the feeds with rewrites of itself: offer each story once.
  for (let i = 0; out.length < n && lists.some((l) => l.length > i); i++) {
    for (const l of lists) {
      const r = l[i];
      if (r && out.length < n && !out.some((o) => sameStory(o.title, r.title))) out.push(r);
    }
  }
  return out.map((r) => ({
    id: r.id, source: r.source, title: r.title, domain: r.domain,
    relation: r.relation ?? "new", storylineId: r.storyline_id,
  }));
}

const STOP = new Set(["with", "from", "that", "this", "after", "over", "says", "into", "will", "have", "about", "their", "what", "amid", "more"]);

function keywords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOP.has(w)),
  );
}

/** Two headlines are the same story when they share three or more significant words. */
function sameStory(a: string, b: string): boolean {
  const wa = keywords(a);
  let shared = 0;
  for (const w of keywords(b)) if (wa.has(w) && ++shared >= 3) return true;
  return false;
}

/** Mark a headline used, along with other write-ups of the same story. */
export function markHeadlineUsed(id: number): void {
  const row = db().prepare("SELECT title FROM headlines WHERE id = ?").get(id) as { title: string } | undefined;
  if (!row) return;
  const unused = db().prepare("SELECT id, title FROM headlines WHERE used = 0").all() as { id: number; title: string }[];
  const mark = db().prepare("UPDATE headlines SET used = 1 WHERE id = ?");
  mark.run(id);
  for (const u of unused) if (u.id !== id && sameStory(row.title, u.title)) mark.run(u.id);
}
