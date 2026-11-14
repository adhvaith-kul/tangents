// Live sport, the ledger. Today's real fixtures come from ESPN's public
// scoreboard; games go live and finish on the simulation clock; a result, once
// written, never changes, and team records move only with this world's
// results. Also what the scoreboard shows the reader and the writers, and the
// director's lever on a live game. How a game plays out is games.ts. Server-only.
import { CAST } from "./cast";
import { db, kvGet, kvSet, now, tx } from "./db";
import {
  COMPETITIONS, EVENT_CAP, F1_GRID, GAME_MS, boundEvent, competitionOf, formatRecord, gameState, parseScoreboard, surname,
  type Competition, type GameEvent, type GameState, type Side, type Team, type TeamRecord,
} from "./games";
import { getSettings } from "./settings";
import type { DigestGame, GameView, WorldDigest } from "./types";

const MINUTE = 60_000;
const DAY_MS = 24 * 3_600_000;
const FETCH_TIMEOUT_MS = 6_000;

interface FixtureRow {
  id: number;
  ext_id: string;
  competition: string;
  home: string | null;
  away: string | null;
  event: string | null;
  session: string | null;
  laps: number | null;
  starts_at: number;
  status: string;
  home_score: number | null;
  away_score: number | null;
  clock: string | null;
  race_order: string | null;
  seed: number;
  events: string;
  storyline_id: number | null;
}

/** A fixture with everything its readers need worked out once. */
interface Game {
  row: FixtureRow;
  comp: Competition;
  home: Team | null;
  away: Team | null;
  /** Where it stands now; a final game's comes from the ledger. */
  state: GameState;
  ends: number;
  story: { title: string; beats: number; updatedAt: number } | null;
  /** Famous players or drivers in it, who stay off the timeline until it is over. */
  players: string[];
  /** How many cast accounts it involves: the better connected, the higher it ranks. */
  prominence: number;
}

// ------------------------------------------------------------------ dates

/** Local midnight before t. */
function dayStart(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** "20261114": the calendar day ESPN's scoreboard is asked for. */
function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

const dayName = (t: number) => new Date(t).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
const hhmm = (t: number) => new Date(t).toTimeString().slice(0, 5);

// --------------------------------------------------------------- the cast

const SPORTS_CAST = CAST.filter((c) => c.domain === "sports" && (c.kind === "figure" || c.kind === "org"));
const tiesCache = new Map<string, { handle: string; player: boolean }[]>();

/** Cast accounts whose name or bio names this team or driver. */
function tiesTo(name: string): { handle: string; player: boolean }[] {
  let ties = tiesCache.get(name);
  if (!ties) {
    const re = new RegExp(`(^|[^\\p{L}])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}])`, "u");
    ties = SPORTS_CAST.filter((c) => re.test(c.name) || re.test(c.bio)).map((c) => ({ handle: c.handle, player: c.kind === "figure" }));
    tiesCache.set(name, ties);
  }
  return ties;
}

// ---------------------------------------------------------------- reading

function parseTeam(s: string | null): Team | null {
  if (!s) return null;
  try {
    const t = JSON.parse(s) as Team;
    return t && typeof t.name === "string" ? { name: t.name, short: t.short || t.name, abbr: t.abbr ?? "" } : null;
  } catch {
    return null;
  }
}

function parseEvents(s: string): GameEvent[] {
  try {
    const v: unknown = JSON.parse(s);
    return Array.isArray(v) ? (v as GameEvent[]) : [];
  } catch {
    return [];
  }
}

function parseOrder(s: string | null): string[] | null {
  try {
    const v: unknown = JSON.parse(s ?? "null");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : null;
  } catch {
    return null;
  }
}

const specOf = (row: FixtureRow, sport: Competition["sport"]) => ({
  sport, seed: row.seed, startsAt: row.starts_at, laps: row.laps, events: parseEvents(row.events),
});

type GameRowJoined = FixtureRow & { story_title: string | null; story_beats: number | null; story_updated: number | null };

function gameOf(row: GameRowJoined, t: number): Game | null {
  const comp = competitionOf(row.competition);
  if (!comp) return null;
  const home = parseTeam(row.home);
  const away = parseTeam(row.away);
  const state: GameState = row.status === "final"
    ? { status: "final", home: row.home_score ?? 0, away: row.away_score ?? 0, clock: row.clock, order: parseOrder(row.race_order), plays: [] }
    : gameState(specOf(row, comp.sport), t);
  const names = comp.sport === "racing" ? F1_GRID.map((d) => d.name) : [home?.name, away?.name].filter((n): n is string => !!n);
  const ties = names.flatMap(tiesTo);
  return {
    row, comp, home, away, state, ends: row.starts_at + GAME_MS,
    story: row.story_title != null ? { title: row.story_title, beats: row.story_beats ?? 0, updatedAt: row.story_updated ?? 0 } : null,
    players: [...new Set(ties.filter((x) => x.player).map((x) => x.handle))],
    prominence: ties.length,
  };
}

function loadGames(where: string, ...params: (number | string)[]): Game[] {
  const t = now();
  const rows = db()
    .prepare(
      `SELECT f.*, s.title AS story_title, s.beats AS story_beats, s.updated_at AS story_updated
       FROM fixtures f LEFT JOIN storylines s ON s.id = f.storyline_id WHERE ${where}`,
    )
    .all(...params) as unknown as GameRowJoined[];
  return rows.map((r) => gameOf(r, t)).filter((g): g is Game => g !== null);
}

/** Every game that is live, finished today or due today: live first (the best
 *  connected first), then today's results (latest first), then what is still to come. */
function todays(): Game[] {
  const t = now();
  const start = dayStart(t);
  const games = loadGames("f.starts_at < ? AND f.starts_at + ? >= ?", start + DAY_MS, GAME_MS, start);
  const by = (s: GameState["status"]) => games.filter((g) => g.state.status === s);
  return [
    ...by("live").sort((a, b) => b.prominence - a.prominence || a.row.starts_at - b.row.starts_at),
    ...by("final").sort((a, b) => b.ends - a.ends),
    ...by("scheduled").sort((a, b) => a.row.starts_at - b.row.starts_at || b.prominence - a.prominence),
  ];
}

const american = (comp: Competition) => comp.sport === "basketball" || comp.sport === "american_football";

/** The two sides in the order the sport lists them: visitors first in American sports. */
function sides(g: Game): { team: Team; side: Side; score: number }[] {
  if (!g.home || !g.away) return [];
  const home = { team: g.home, side: "home" as const, score: g.state.home };
  const away = { team: g.away, side: "away" as const, score: g.state.away };
  return american(g.comp) ? [away, home] : [home, away];
}

function titleOf(g: Pick<Game, "comp" | "home" | "away" | "row">): string {
  if (!g.home || !g.away) return g.row.event ?? g.comp.label;
  return g.comp.sport === "soccer" ? `${g.home.short} v ${g.away.short}` : `${g.away.short} at ${g.home.short}`;
}

function scoreOf(g: Game): string {
  if (g.state.status === "scheduled") return "";
  if (g.state.order) return g.state.order.slice(0, 3).map((d, i) => `${i + 1}. ${surname(d)}`).join(", ");
  return sides(g).map((s) => `${s.team.short} ${s.score}`).join(", ");
}

function recordOf(comp: Competition, team: Team): TeamRecord | null {
  const r = db().prepare("SELECT wins, losses, draws FROM team_records WHERE competition = ? AND team = ?").get(comp.key, team.name) as
    | TeamRecord | undefined;
  return r ?? null;
}

function recordsOf(g: Game): string {
  return sides(g)
    .map((s) => {
      const r = recordOf(g.comp, s.team);
      return r ? `${s.team.short} ${formatRecord(r, g.comp.sport)}` : null;
    })
    .filter(Boolean)
    .join(", ");
}

function playLine(g: Game, p: GameState["plays"][number]): string {
  if (p.driver) return `${p.clock}: ${p.label}`;
  const team = p.side === "home" ? g.home : g.away;
  return `${p.clock} ${team?.short ?? ""} ${p.label}`;
}

// ------------------------------------------------------------------ views

function viewOf(g: Game): GameView {
  const started = g.state.status !== "scheduled";
  return {
    id: g.row.id,
    competition: g.comp.label,
    status: g.state.status,
    startsAt: g.row.starts_at,
    clock: started ? g.state.clock : null,
    event: g.row.event,
    teams: sides(g).map((s) => ({ name: s.team.short, score: started ? s.score : null })),
    podium: started && g.state.order ? g.state.order.slice(0, 3) : [],
    search: g.story?.title ?? null,
  };
}

/** All of today's games, for Explore's Sports tab. */
export function todaysGames(): GameView[] {
  return todays().map(viewOf);
}

/** The right column's Live card: up to three, and none when Sports is off. */
export function sidebarGames(): GameView[] {
  return getSettings().sports > 0 ? todays().slice(0, 3).map(viewOf) : [];
}

function digestGame(g: Game): DigestGame {
  return {
    id: g.row.id,
    competition: g.comp.label,
    title: titleOf(g),
    score: scoreOf(g),
    clock: g.state.status === "scheduled" ? null : g.state.clock,
    startsAt: hhmm(g.row.starts_at),
    records: recordsOf(g),
    recent: g.state.status === "live" ? g.state.plays.slice(-4).map((p) => playLine(g, p)) : [],
    storylineId: g.row.storyline_id,
    minutesSinceBeat: g.story && g.story.beats > 0 ? Math.max(0, Math.round((now() - g.story.updatedAt) / MINUTE)) : null,
    inGame: g.players,
  };
}

/** What the director is told about today's games. Empty when the reader has Sports off. */
export function digestScoreboard(): WorldDigest["scoreboard"] {
  if (getSettings().sports <= 0) return { live: [], finals: [], upcoming: [] };
  const games = todays();
  const pick = (s: GameState["status"], n: number) => games.filter((g) => g.state.status === s).slice(0, n).map(digestGame);
  return { live: pick("live", 6), finals: pick("final", 8), upcoming: pick("scheduled", 6) };
}

function crowdLine(g: Game): string {
  const head = `${g.comp.label} · ${titleOf(g)}`;
  if (g.state.status === "scheduled") return `${head}: starts at ${hhmm(g.row.starts_at)}`;
  if (g.state.status === "final") return `${head}: final, ${scoreOf(g)}`;
  return `${head}: ${scoreOf(g)} (${g.state.clock}, live)`;
}

/** One line per game for the crowd writer, so replies quote the right score:
 *  the beat's own game if it is one, then whatever is live. */
export function crowdScoreLines(storylineId: number | null): string[] {
  const own = storylineId != null ? loadGames("f.storyline_id = ?", storylineId) : [];
  const live = getSettings().sports > 0 ? todays().filter((g) => g.state.status === "live") : [];
  const seen = new Set<number>();
  return [...own, ...live]
    .filter((g) => !seen.has(g.row.id) && !!seen.add(g.row.id))
    .slice(0, 3)
    .map(crowdLine);
}

// --------------------------------------------------------------- fetching

async function fetchJson(url: string): Promise<unknown> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "user-agent": "Mozilla/5.0 (compatible; Tangents/1.0)", accept: "application/json" },
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

async function fetchToday(): Promise<void> {
  try {
    const day = dayKey(now());
    const lists = await Promise.all(
      COMPETITIONS.map(async (c) => {
        const json = await fetchJson(`https://site.api.espn.com/apis/site/v2/sports/${c.path}/scoreboard?dates=${day}`);
        return json ? parseScoreboard(json, c) : [];
      }),
    );
    const stamp = now();
    const insert = db().prepare(
      `INSERT OR IGNORE INTO fixtures (ext_id, competition, home, away, event, session, laps, starts_at, seed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    // A record already here was written by this world and is not replaced.
    const seedRecord = db().prepare(
      "INSERT OR IGNORE INTO team_records (competition, team, wins, losses, draws, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    );
    tx(() => {
      for (const f of lists.flat()) {
        insert.run(
          f.extId, f.competition, f.home ? JSON.stringify(f.home) : null, f.away ? JSON.stringify(f.away) : null,
          f.event, f.session, f.laps, f.startsAt, Math.floor(Math.random() * 2 ** 31),
        );
        for (const [team, rec] of [[f.home, f.homeRecord], [f.away, f.awayRecord]] as const) {
          if (team && rec) seedRecord.run(f.competition, team.name, rec.wins, rec.losses, rec.draws, stamp);
        }
      }
    });
    // A failed fetch means no fixtures for that competition today, not another try every few seconds.
    kvSet("fixtures_day", day);
    syncGames();
  } catch (err) {
    console.error("[sports] fetching fixtures failed:", err);
  }
}

const fg = globalThis as { __tangentsFixtures?: Promise<void> };

/** Fetch the simulation day's fixtures. One fetch at a time; never throws. */
export function refreshFixtures(): Promise<void> {
  fg.__tangentsFixtures ??= fetchToday().finally(() => {
    fg.__tangentsFixtures = undefined;
  });
  return fg.__tangentsFixtures;
}

/** Fetch in the background if the simulation day has not been fetched yet. */
export function ensureFixtures(): void {
  if (kvGet("fixtures_day") !== dayKey(now())) void refreshFixtures();
}

// ------------------------------------------------------------ the clock

/** Open the storyline a game's posts hang together on. It starts dormant, so a
 *  slate of games does not crowd the director's open storylines; the first
 *  beat written on it opens it. */
function openStoryline(row: FixtureRow, comp: Competition, home: Team | null, away: Team | null): number {
  const title = titleOf({ comp, home, away, row });
  const rec = (t: Team) => {
    const r = recordOf(comp, t);
    return r ? ` (${formatRecord(r, comp.sport)})` : "";
  };
  const summary = home && away
    ? `${comp.label}, ${dayName(row.starts_at)}: ${american(comp) ? `the ${away.name}${rec(away)} at the ${home.name}${rec(home)}` : `${home.name}${rec(home)} against ${away.name}${rec(away)}`}.`
    : `Formula 1: the ${row.event ?? "Grand Prix"}, ${dayName(row.starts_at)}, over ${row.laps ?? "its"} laps.`;
  const topics = [comp.label, ...(home && away ? [home.short, away.short] : ["f1"])].map((s) => s.toLowerCase());
  const res = db()
    .prepare(
      `INSERT INTO storylines (parent_id, title, summary, domain, tone, topics, participants, origin, headline_id,
                               heat, status, beats, created_at, updated_at)
       VALUES (NULL, ?, ?, 'sports', 'hype', ?, '[]', 'original', NULL, 4, 'dormant', 0, ?, ?)`,
    )
    .run(title, summary, JSON.stringify(topics), row.starts_at, row.starts_at);
  return Number(res.lastInsertRowid);
}

function countResult(comp: Competition, team: Team, won: number, lost: number, drawn: number, at: number) {
  db()
    .prepare(
      `INSERT INTO team_records (competition, team, wins, losses, draws, updated_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(competition, team) DO UPDATE SET wins = wins + excluded.wins, losses = losses + excluded.losses,
                                                   draws = draws + excluded.draws, updated_at = excluded.updated_at`,
    )
    .run(comp.key, team.name, won, lost, drawn, at);
}

/** Store the result, move both records, and add the result to the facts ledger. */
function finalise(row: FixtureRow, comp: Competition, home: Team | null, away: Team | null): void {
  const end = row.starts_at + GAME_MS;
  const s = gameState(specOf(row, comp.sport), end);
  const done = db()
    .prepare(
      `UPDATE fixtures SET status = 'final', home_score = ?, away_score = ?, clock = ?, race_order = ?
       WHERE id = ? AND status != 'final'`,
    )
    .run(s.home, s.away, s.clock, s.order ? JSON.stringify(s.order) : null, row.id);
  if (Number(done.changes) === 0) return;
  const day = dayName(end);
  const inComp = comp.key === "laliga" ? comp.label : `the ${comp.label}`;
  let text: string;
  let names: string[];
  if (s.order) {
    const [p1, p2, p3] = s.order;
    text = `${p1} won the ${row.event ?? "Grand Prix"} on ${day}, ahead of ${p2} and ${p3}.`;
    names = s.order.slice(0, 3);
  } else if (home && away) {
    const draw = s.home === s.away;
    countResult(comp, home, +(s.home > s.away), +(s.home < s.away), +draw, end);
    countResult(comp, away, +(s.away > s.home), +(s.away < s.home), +draw, end);
    const [w, l, ws, ls] = s.home >= s.away ? [home, away, s.home, s.away] : [away, home, s.away, s.home];
    const records = [w, l]
      .map((t) => {
        const r = recordOf(comp, t);
        return r ? `${t.short} ${formatRecord(r, comp.sport)}` : null;
      })
      .filter(Boolean)
      .join(", ");
    text = draw
      ? `${home.name} and ${away.name} drew ${s.home}-${s.away} in ${inComp} on ${day}.`
      : `${w.name} beat ${l.name} ${ws}-${ls} in ${inComp} on ${day}${s.clock === "Final/OT" ? " after overtime" : ""}.`;
    if (records) text += ` Records${comp.sport === "soccer" ? " (won-drawn-lost)" : ""}: ${records}.`;
    names = [home.name, away.name];
  } else return;
  const subjects = [...new Set(names.flatMap(tiesTo).map((x) => x.handle))];
  db()
    .prepare("INSERT INTO facts (text, subjects, storyline_id, created_at) VALUES (?, ?, ?, ?)")
    .run(text, JSON.stringify(subjects), row.storyline_id, end);
}

/** Move every game along the simulation clock: start the ones that are due,
 *  finish the ones whose time is up (also those that ran while nobody was
 *  watching), and note where the live ones stand. Cheap; call it often. */
export function syncGames(): void {
  const t = now();
  const rows = db().prepare("SELECT * FROM fixtures WHERE status != 'final' AND starts_at <= ?").all(t) as unknown as FixtureRow[];
  if (!rows.length) return;
  tx(() => {
    for (const row of rows) {
      const comp = competitionOf(row.competition);
      if (!comp) continue;
      const home = parseTeam(row.home);
      const away = parseTeam(row.away);
      const s = gameState(specOf(row, comp.sport), t);
      if (s.status === "final") {
        finalise(row, comp, home, away);
        continue;
      }
      const storyline = row.storyline_id ?? openStoryline(row, comp, home, away);
      db()
        .prepare(
          `UPDATE fixtures SET status = 'live', home_score = ?, away_score = ?, clock = ?, race_order = ?, storyline_id = ?
           WHERE id = ? AND status != 'final'`,
        )
        .run(s.home, s.away, s.clock, s.order ? JSON.stringify(s.order) : null, storyline, row.id);
    }
  });
}

// ------------------------------------------------------- the director's lever

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/^the\s+/, "").trim();

function sideFor(name: string, home: Team | null, away: Team | null): Side | null {
  const want = fold(name);
  if (!want) return null;
  for (const [side, t] of [["home", home], ["away", away]] as const) {
    if (!t) continue;
    const names = [t.name, t.short, t.abbr].map(fold).filter(Boolean);
    if (names.includes(want) || fold(t.name).includes(want) || want.includes(fold(t.short))) return side;
  }
  return null;
}

function driverFor(name: string): string | null {
  const want = fold(name);
  const d = F1_GRID.find((x) => fold(x.name) === want || fold(surname(x.name)) === want);
  return d?.name ?? null;
}

/** The director's nudge to a live game, from DirectorSchema's game_event:
 *  checked against the game and bounded for its sport (games.ts boundEvent),
 *  at most a few per game, and never in a game's last two minutes. Returns
 *  whether it was added. Call inside the beat's transaction. */
export function addGameEvent(
  raw: { game?: unknown; team?: unknown; points?: unknown; label?: unknown } | null | undefined,
  at: number,
): boolean {
  const id = Number(raw?.game);
  if (!raw || !Number.isInteger(id)) return false;
  const row = db().prepare("SELECT * FROM fixtures WHERE id = ?").get(id) as FixtureRow | undefined;
  const comp = row && competitionOf(row.competition);
  if (!row || !comp || row.status === "final") return false;
  if (at < row.starts_at || at > row.starts_at + GAME_MS - 2 * MINUTE) return false;
  const events = parseEvents(row.events);
  if (events.length >= EVENT_CAP[comp.sport]) return false;
  const name = typeof raw.team === "string" ? raw.team : "";
  const who = comp.sport === "racing"
    ? { driver: driverFor(name) ?? undefined }
    : { side: sideFor(name, parseTeam(row.home), parseTeam(row.away)) ?? undefined };
  const label = typeof raw.label === "string" ? raw.label.replace(/\s+/g, " ").trim().slice(0, 60) : "";
  const ev = boundEvent(comp.sport, who, Number(raw.points), label, at);
  if (!ev) return false;
  db().prepare("UPDATE fixtures SET events = ? WHERE id = ?").run(JSON.stringify([...events, ev]), row.id);
  return true;
}
