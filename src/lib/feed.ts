// Timeline ranking, trends, sidebar and explore reads. Server-only.
import { db, now, userHandle } from "./db";
import type { ArticleRow } from "./db";
import { SUBJECTS, SUBJECT_INFO, SUBJECT_TABS, type ExploreTab, type Subject } from "./subjects";
import { interestPull } from "./interests";
import { formatsOf, prefMap } from "./prefs";
import { getSettings } from "./settings";
import { simStatus } from "./sim";
import { comingSoon } from "./slate";
import { sidebarGames, todaysGames } from "./sports";
import { stockViews } from "./stocks";
import { isHot, tacticOf } from "./tactics";
import type {
  Domain,
  Account, ExploreResponse, FeedResponse, SidebarResponse, Trend,
} from "./types";
import { accountViews, articleCards, parseList, postViews } from "./views";

const PAGE = 30;
const AFTER_MAX = 50;
const CANDIDATES = 500;
/** How far taste can move a post, by the Personalisation setting. Light used to
 *  be half an hour for both, which left the timeline close to chronological. */
const TASTE_BOOST_MS = { off: 0, light: 60 * 60_000, strong: 180 * 60_000 } as const;
/** With Rage bait on, how far the angriest post is lifted: further than any taste. */
const RAGE_BOOST_MS = 45 * 60_000;

interface Cand {
  id: number;
  author: string;
  created_at: number;
  storyline_id: number | null;
  domain: string | null;
  tone: string | null;
  topics: string;
  quote_of: number | null;
  style: string | null;
  media: string | null;
  article_id: number | null;
  text: string;
  heat: number;
  tactic: string | null;
  a_domain: string | null; // the author's own subject
  r_by: string | null; // latest visible repost by a followed account
  r_at: number | null;
  eff: number; // the later of the post's time and that repost's time
  lbl: number; // 1 when the repost is why the post is here or what lifted it
}

/** How well a post matches the user's taste, from -1 to 1. Specific keys (the
 *  author, the topics) count in full; broad ones (domain, tone) count for a
 *  quarter, so "likes pop culture" nudges a post without making every pop post
 *  rank the same. */
function affinity(w: Map<string, number>, c: Cand): number {
  return Math.tanh(parts(w, c).reduce((sum, p) => sum + p.value, 0) / 12);
}

/** How much a post is built to provoke, from 0 to 1: a provoking label counts
 *  most, then how many people are reacting, then a story that is already a row.
 *  With Rage bait on the timeline ranks by this, as an engagement-driven one
 *  does, and says so when asked why. */
function anger(c: Cand): number {
  const hot = isHot(tacticOf(c.tactic)) ? 0.6 : 0;
  return Math.min(1, hot + Math.max(0, c.heat - 4) / 15 + (c.tone === "feud" ? 0.15 : 0));
}

/** Where a post's author sits against the interests the reader chose, from -1
 *  to 1: inside one is lifted, inside one they passed over is pushed down, and
 *  everything else is left alone. */
function chosen(c: Cand, interests: readonly string[]): number {
  const pull = interestPull(c.author, c.a_domain ?? "", interests);
  return pull > 1 ? 0.5 : pull < 1 ? -0.6 : 0;
}

/** The learned weights the timeline ranks by: none with personalisation off,
 *  and weighing half as much again when it is set to strong. */
function taste(): Map<string, number> {
  const level = getSettings().personalisation;
  if (level === "off") return new Map();
  const w = prefMap();
  if (level === "strong") for (const [k, v] of w) w.set(k, v * 1.5);
  return w;
}

const SUBJECT_NAME: Record<string, string> = {
  ...Object.fromEntries(SUBJECTS.map((k) => [k, SUBJECT_INFO[k].name])), crossover: "crossover",
};

/** Each learned key's contribution to a post's score, with the sentence that explains it. */
function parts(w: Map<string, number>, c: Cand): { value: number; why: string }[] {
  const out: { value: number; why: string }[] = [];
  out.push({ value: w.get(`author:${c.author.toLowerCase()}`) ?? 0, why: `You engage with posts from @${c.author}.` });
  const topics = [...new Set(parseList(c.topics).map((s) => s.toLowerCase()))];
  for (const t of topics) {
    out.push({ value: (w.get(`topic:${t}`) ?? 0) / topics.length, why: `You engage with posts about ${t}.` });
  }
  if (c.domain) {
    out.push({ value: 0.25 * (w.get(`domain:${c.domain}`) ?? 0), why: `You engage with ${SUBJECT_NAME[c.domain] ?? c.domain} posts.` });
  }
  if (c.tone) out.push({ value: 0.25 * (w.get(`tone:${c.tone}`) ?? 0), why: "You engage with posts in this vein." });
  if (c.storyline_id != null) {
    out.push({ value: 0.5 * (w.get(`storyline:${c.storyline_id}`) ?? 0), why: "You have been following this story." });
  }
  if (c.style) out.push({ value: 0.5 * (w.get(`style:${c.style}`) ?? 0), why: "You tend to like replies of this kind." });
  for (const f of formatsOf(c)) {
    out.push({ value: 0.25 * (w.get(`format:${f}`) ?? 0), why: `You engage with ${f === "link" ? "linked stories" : f === "quote" ? "quote posts" : `${f} posts`}.` });
  }
  return out;
}

/** One line on why a post is in For you. */
function reason(w: Map<string, number>, c: Cand, explore: boolean, rage: boolean, interests: readonly string[]): string {
  if (rage && anger(c) >= 0.6) {
    return "Shown because it is making people angry. Rage bait is on, so the timeline puts posts like this first.";
  }
  if (explore) return "Something outside what you usually engage with, to keep the timeline from narrowing.";
  if (c.lbl && c.r_by) return `Reposted by @${c.r_by}, an account you follow.`;
  const best = parts(w, c).sort((a, b) => b.value - a.value)[0];
  if (best && best.value >= 1) return best.why;
  if (chosen(c, interests) > 0) return `@${c.author} is inside an interest you chose to follow closely.`;
  if (c.heat >= 7) return "A lot of people are reacting to this right now.";
  return "A recent post. The timeline has not learned much about posts like this yet.";
}

/** One row per candidate post (so a post never repeats), with its repost by a followed account, if any.
 *  The user's own reposts never count here. `extra` filters on the outer columns (eff). */
function candidateSql(tab: "foryou" | "following", extra: string): string {
  const authorOk = tab === "following" ? "(p.author IN (SELECT handle FROM follows) OR p.author = $me)" : "1";
  return `SELECT * FROM (
    SELECT p.id, p.author, p.created_at, p.storyline_id, p.domain, p.tone, p.topics, p.quote_of,
           p.style, p.media, p.article_id, p.text, p.heat, p.tactic,
           (SELECT domain FROM accounts WHERE handle = p.author) AS a_domain,
           r.account AS r_by, r.at AS r_at,
           MAX(p.created_at, COALESCE(r.at, 0)) AS eff,
           (r.post_id IS NOT NULL AND (r.at > p.created_at OR NOT (p.reply_to IS NULL AND ${authorOk}))) AS lbl
    FROM posts p
    LEFT JOIN viewer_state v ON v.post_id = p.id
    LEFT JOIN (
      SELECT post_id, account, MAX(created_at) AS at FROM reposts
      WHERE created_at <= $t AND account != $me AND account IN (SELECT handle FROM follows)
      GROUP BY post_id
    ) r ON r.post_id = p.id
    WHERE p.created_at <= $t AND p.deleted = 0 AND COALESCE(v.hidden, 0) = 0
      AND ((p.reply_to IS NULL AND ${authorOk}) OR r.post_id IS NOT NULL)
  ) WHERE 1 = 1 ${extra}
  ORDER BY eff DESC, id DESC LIMIT $lim`;
}

function repostMap(rows: Cand[]): Map<number, { by: string; at: number }> {
  const m = new Map<number, { by: string; at: number }>();
  for (const r of rows) if (r.lbl && r.r_by != null && r.r_at != null) m.set(r.id, { by: r.r_by, at: r.r_at });
  return m;
}

export function getFeed(tab: "foryou" | "following", cursor: number | null, after: number | null): FeedResponse {
  const t = now();
  const me = userHandle() ?? "";
  const settings = getSettings();
  const disabled = new Set(SUBJECTS.filter((s) => (settings[s] ?? 2) === 0));

  const isAllowed = (c: Cand) => {
    if (c.author.toLowerCase() === me.toLowerCase()) return true;
    if (disabled.size === 0) return true;
    const postDomain = (c.domain || c.a_domain) as Subject | null;
    if (postDomain && disabled.has(postDomain)) return false;
    return true;
  };

  const run = (extra: string, lim: number, more: Record<string, number> = {}) =>
    db().prepare(candidateSql(tab, extra)).all({ t, me, lim, ...more }) as unknown as Cand[];
  const view = (rows: Cand[]) => postViews(rows.map((r) => r.id), { reposts: repostMap(rows) });

  if (after != null) {
    const raw = run("AND eff > $after", AFTER_MAX, { after }).filter(isAllowed);
    return { posts: view(raw), nextCursor: null, now: t };
  }

  if (tab === "following") {
    const raw = cursor != null ? run("AND eff < $cursor", PAGE * 3, { cursor }) : run("", PAGE * 3);
    const filtered = raw.filter(isAllowed);
    const page = filtered.slice(0, PAGE);
    return {
      posts: view(page),
      nextCursor: filtered.length > PAGE ? page[page.length - 1].eff : null,
      now: t,
    };
  }

  // For you: candidate posts filtered to exclude any unselected / disabled domains
  const cands = run("", CANDIDATES).filter(isAllowed);
  const w = taste();
  const { rage, personalisation, interests } = settings;
  const boost = TASTE_BOOST_MS[personalisation];
  const ranked = cands
    .map((c) => {
      const aff = affinity(w, c);
      const pull = boost ? chosen(c, interests) : 0;
      return { c, aff: aff + pull, score: c.eff + (aff + pull) * boost + (rage ? anger(c) * RAGE_BOOST_MS : 0) };
    })
    .filter((r) => cursor == null || r.score < cursor)
    .sort((a, b) => b.score - a.score);
  const more = ranked.length > PAGE;
  const page = ranked.slice(0, PAGE);

  // Every eighth slot goes to the newest post in the page with zero or negative affinity.
  const explore = page.filter((r) => r.aff <= 0).sort((a, b) => b.c.eff - a.c.eff);
  const used = new Set<number>();
  const explored = new Set<number>();
  const order: typeof page = [];
  const rest = [...page];
  for (let i = 0; i < page.length; i++) {
    let pick: (typeof page)[number] | undefined;
    if (i % 8 === 7) {
      pick = explore.find((r) => !used.has(r.c.id));
      if (pick) {
        rest.splice(rest.indexOf(pick), 1);
        explored.add(pick.c.id);
      }
    }
    if (!pick) {
      pick = rest.shift();
    }
    if (!pick) break;
    used.add(pick.c.id);
    order.push(pick);
  }
  const shown = spread(order.map((r) => r.c));
  const whys = new Map(shown.map((c) => [c.id, reason(w, c, explored.has(c.id), rage, interests)]));
  return {
    posts: view(shown).map((p) => ({ ...p, why: whys.get(p.id) })),
    nextCursor: more ? page[page.length - 1].score : null,
    now: t,
  };
}

/** Keep one account or one story from filling the screen. An account never
 *  appears back to back, and at most twice in any eight posts. A storyline
 *  never appears back to back, and at most twice in any six. A post is kept
 *  away from the post it quotes and from another quote of the same post, so
 *  the same headline is not read three times running. A post that would break
 *  a rule waits for the next slot where it fits; whatever cannot be placed
 *  goes at the end. */
function spread(rows: Cand[]): Cand[] {
  const out: Cand[] = [];
  const waiting: Cand[] = [];
  const fits = (c: Cand) => {
    const authors = out.slice(-7).map((r) => r.author);
    if (authors[authors.length - 1] === c.author || authors.filter((a) => a === c.author).length >= 2) return false;
    if (c.storyline_id != null) {
      const stories = out.slice(-5).map((r) => r.storyline_id);
      if (stories[stories.length - 1] === c.storyline_id) return false;
      if (stories.filter((s) => s === c.storyline_id).length >= 2) return false;
    }
    const near = out.slice(-5);
    if (c.quote_of != null && near.some((r) => r.id === c.quote_of || r.quote_of === c.quote_of)) return false;
    if (near.some((r) => r.quote_of === c.id)) return false;
    return true;
  };
  for (const c of rows) {
    for (let i = 0; i < waiting.length; i++) {
      if (fits(waiting[i])) out.push(...waiting.splice(i--, 1));
    }
    if (fits(c)) out.push(c);
    else waiting.push(c);
  }
  return [...out, ...waiting];
}

// ------------------------------------------------------------------ trends

interface TrendRow {
  id: number; label: string; category: string; storyline_id: number | null;
  domain: string | null; heat: number; posts: number; created_at: number;
}

/** Visible trends, recent first, weighted by heat and the user's domain affinity, one per label. */
function trendsFor(limit: number, domain: Domain | null = null): Trend[] {
  const t = now();
  const settings = getSettings();
  const disabled = new Set(SUBJECTS.filter((s) => (settings[s] ?? 2) === 0));
  const rows = db()
    .prepare(
      "SELECT * FROM trends WHERE created_at <= ? AND (? IS NULL OR domain = ?) ORDER BY created_at DESC, id DESC LIMIT 60",
    )
    .all(t, domain, domain) as unknown as TrendRow[];
  const w = taste();
  const seen = new Set<string>();
  const scored = rows
    .filter((r) => {
      if (r.domain && disabled.has(r.domain as Subject)) return false;
      const k = r.label.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((r) => {
      const ageH = (t - r.created_at) / 3_600_000;
      const taste = r.domain ? Math.tanh((w.get(`domain:${r.domain}`) ?? 0) / 10) : 0;
      return { r, score: r.heat + 3 * taste - 0.5 * ageH };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return scored.map(({ r }) => ({
    id: r.id, label: r.label, category: r.category, posts: r.posts, storylineId: r.storyline_id,
  }));
}

// ----------------------------------------------------------------- sidebar

export function getSidebar(): SidebarResponse {
  const t = now();
  const settings = getSettings();
  const disabled = new Set(SUBJECTS.filter((s) => (settings[s] ?? 2) === 0));

  const stocks = disabled.has("markets")
    ? []
    : stockViews()
        .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
        .slice(0, 4);

  const w = taste();
  const cands = db()
    .prepare(
      `SELECT handle, domain, followers FROM accounts
       WHERE kind IN ('figure','outlet','org') AND handle NOT IN (SELECT handle FROM follows)`,
    )
    .all() as unknown as { handle: string; domain: string; followers: number }[];
  const best = cands
    .filter((a) => !a.domain || !disabled.has(a.domain as Subject))
    .map((a) => ({
      a,
      s: (w.get(`author:${a.handle.toLowerCase()}`) ?? 0) + 0.5 * (w.get(`domain:${a.domain}`) ?? 0),
    }))
    .sort((x, y) => y.s - x.s || y.a.followers - x.a.followers)
    .slice(0, 3);
  const whoToFollow: Account[] = accountViews(best.map((b) => b.a.handle));

  const unread = (
    db().prepare("SELECT COUNT(*) AS n FROM notifications WHERE read = 0 AND created_at <= ?").get(t) as unknown as {
      n: number;
    }
  ).n;
  const games = disabled.has("sports") ? [] : sidebarGames();
  return { trends: trendsFor(5), stocks, whoToFollow, sim: simStatus(), unread, games };
}

// ----------------------------------------------------------------- explore

/** X's Explore tabs. Sports and Entertainment narrow everything to one subject. */
export type { ExploreTab };
const EXPLORE_DOMAIN: Partial<Record<ExploreTab, Domain>> = Object.fromEntries(SUBJECT_TABS.map((t) => [t.key, t.subject]));

export function getExplore(q: string, tab: ExploreTab = "for_you"): ExploreResponse {
  const t = now();
  const domain = EXPLORE_DOMAIN[tab] ?? null;
  const articleRows = tab === "trending"
    ? []
    : (db()
        .prepare(
          `SELECT a.* FROM articles a LEFT JOIN storylines s ON s.id = a.storyline_id
           WHERE a.created_at <= ? AND (? IS NULL OR s.domain = ?)
           ORDER BY a.created_at DESC, a.id DESC LIMIT ?`,
        )
        .all(t, domain, domain, tab === "news" ? 30 : 10) as unknown as ArticleRow[]);
  let posts: ExploreResponse["posts"] = [];
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    // A search for a storyline's exact title also finds its posts: how a game on
    // the scoreboard, or a story with no page, opens what has been said about it.
    const ids = db()
      .prepare(
        `SELECT p.id FROM posts p JOIN accounts a ON a.handle = p.author
         WHERE p.created_at <= ? AND p.deleted = 0
           AND (p.text LIKE ? ESCAPE '\\' OR a.name LIKE ? ESCAPE '\\' OR a.handle LIKE ? ESCAPE '\\'
                OR p.storyline_id IN (SELECT id FROM storylines WHERE title = ? COLLATE NOCASE))
         ORDER BY p.created_at DESC, p.id DESC LIMIT 30`,
      )
      .all(t, like, like, like, q) as unknown as { id: number }[];
    posts = postViews(ids.map((r) => r.id));
  }
  return {
    trends: tab === "news" ? [] : trendsFor(tab === "trending" ? 30 : 10, domain),
    articles: articleCards(articleRows),
    posts,
    games: domain === "sports" && !q ? todaysGames() : undefined,
    projects: domain === "pop" && !q ? comingSoon() : undefined,
  };
}
