// Live sport, the pure half: the competitions this world follows, reading
// ESPN's public scoreboard JSON, and how a game plays out. A game's state is a
// function of its seed, the time since it went live and any events the
// director added, so the score is the same whoever asks and can be recomputed
// at any moment. No database here (sports.ts keeps the ledger).

export type Sport = "basketball" | "american_football" | "soccer" | "racing";

export interface Competition {
  key: string; // stored in fixtures.competition; never rename
  path: string; // ESPN's sport/league
  label: string;
  sport: Sport;
}

export const COMPETITIONS: readonly Competition[] = [
  { key: "nba", path: "basketball/nba", label: "NBA", sport: "basketball" },
  { key: "nfl", path: "football/nfl", label: "NFL", sport: "american_football" },
  { key: "epl", path: "soccer/eng.1", label: "Premier League", sport: "soccer" },
  { key: "laliga", path: "soccer/esp.1", label: "LaLiga", sport: "soccer" },
  { key: "ucl", path: "soccer/uefa.champions", label: "Champions League", sport: "soccer" },
  { key: "f1", path: "racing/f1", label: "Formula 1", sport: "racing" },
];

export const competitionOf = (key: string): Competition | undefined => COMPETITIONS.find((c) => c.key === key);

/** Real time a game takes to play out here, start to finish. */
export const GAME_MS = 30 * 60_000;

export type Side = "home" | "away";

export interface Team {
  name: string; // "New Orleans Pelicans"
  short: string; // "Pelicans"
  abbr: string; // "NO"
}

export interface TeamRecord {
  wins: number;
  losses: number;
  draws: number; // ties in American football
}

/** One fixture as the real schedule gives it: who, when, and nothing about the result. */
export interface ParsedFixture {
  extId: string;
  competition: string;
  startsAt: number;
  home: Team | null; // null for a race
  away: Team | null;
  homeRecord: TeamRecord | null;
  awayRecord: TeamRecord | null;
  event: string | null; // a race: the Grand Prix
  session: string | null; // a race: "Race"
  laps: number | null;
}

// ------------------------------------------------------------------ records

/** ESPN's record summary: "6-4" (NBA), "6-2" or "6-2-1" with ties (NFL), "7-1-3" as won-drawn-lost (football). */
export function parseRecord(summary: unknown, sport: Sport): TeamRecord | null {
  if (typeof summary !== "string") return null;
  const n = summary.trim().split("-").map(Number);
  if (n.length < 2 || n.some((x) => !Number.isInteger(x) || x < 0)) return null;
  if (sport === "soccer") return n.length === 3 ? { wins: n[0], draws: n[1], losses: n[2] } : null;
  return { wins: n[0], losses: n[1], draws: n[2] ?? 0 };
}

export function formatRecord(r: TeamRecord, sport: Sport): string {
  if (sport === "soccer") return `${r.wins}-${r.draws}-${r.losses}`;
  return r.draws ? `${r.wins}-${r.losses}-${r.draws}` : `${r.wins}-${r.losses}`;
}

// ------------------------------------------------------------ ESPN's JSON

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : null);

/** Grands Prix and their lengths in laps. The key is also how the name reads without its sponsor. */
const CIRCUITS: [string, number][] = [
  ["Australian", 58], ["Chinese", 56], ["Japanese", 53], ["Bahrain", 57], ["Saudi Arabian", 50],
  ["Miami", 57], ["Canadian", 70], ["Monaco", 78], ["Barcelona-Catalunya", 66], ["Austrian", 71],
  ["British", 52], ["Belgian", 44], ["Hungarian", 70], ["Dutch", 72], ["Italian", 53], ["Spanish", 57],
  ["Azerbaijan", 51], ["Singapore", 62], ["United States", 56], ["Mexico City", 71], ["São Paulo", 71],
  ["Las Vegas", 50], ["Qatar", 57], ["Abu Dhabi", 58],
];

/** "MSC Cruises São Paulo Grand Prix" -> "São Paulo Grand Prix", and its laps. */
export function grandPrix(name: string): { event: string; laps: number } {
  for (const [key, laps] of CIRCUITS) {
    const at = name.indexOf(`${key} Grand Prix`);
    if (at >= 0) return { event: name.slice(at), laps };
  }
  return { event: name, laps: 57 };
}

function team(c: Obj): Team | null {
  const t = obj(c.team);
  const name = str(t.displayName) ?? str(t.name);
  if (!name) return null;
  return { name, short: str(t.shortDisplayName) ?? name, abbr: str(t.abbreviation) ?? "" };
}

function recordOf(c: Obj, sport: Sport): TeamRecord | null {
  const records = arr(c.records).map(obj);
  const total = records.find((r) => r.type === "total") ?? records[0];
  return total ? parseRecord(total.summary, sport) : null;
}

/** The fixtures in one competition's scoreboard response. Takes who, when and
 *  each side's record; ignores real scores and statuses. A race weekend gives
 *  one fixture, its Race session. Anything malformed is skipped. */
export function parseScoreboard(json: unknown, comp: Competition): ParsedFixture[] {
  const out: ParsedFixture[] = [];
  for (const e of arr(obj(json).events).map(obj)) {
    const comps = arr(e.competitions).map(obj);
    if (comp.sport === "racing") {
      const race = comps.find((c) => obj(c.type).abbreviation === "Race");
      const name = str(e.name);
      const startsAt = Date.parse(str(race?.date) ?? str(race?.startDate) ?? "");
      if (!race || !name || !Number.isFinite(startsAt)) continue;
      const gp = grandPrix(name);
      out.push({
        extId: `${comp.key}:${str(race.id) ?? str(e.id)}`, competition: comp.key, startsAt,
        home: null, away: null, homeRecord: null, awayRecord: null, event: gp.event, session: "Race", laps: gp.laps,
      });
      continue;
    }
    const c = comps[0];
    const sides = arr(c?.competitors).map(obj);
    const home = sides.find((s) => s.homeAway === "home");
    const away = sides.find((s) => s.homeAway === "away");
    const id = str(e.id);
    const startsAt = Date.parse(str(e.date) ?? str(c?.date) ?? "");
    const h = home && team(home);
    const a = away && team(away);
    if (!id || !h || !a || !Number.isFinite(startsAt)) continue;
    out.push({
      extId: `${comp.key}:${id}`, competition: comp.key, startsAt, home: h, away: a,
      homeRecord: recordOf(home, comp.sport), awayRecord: recordOf(away, comp.sport), event: null, session: null, laps: null,
    });
  }
  return out;
}

// --------------------------------------------------------------- the grid

/** The Formula 1 grid, with a rough pace that shapes qualifying and the race. */
export const F1_GRID: { name: string; pace: number }[] = [
  { name: "Lando Norris", pace: 10 }, { name: "Max Verstappen", pace: 9.8 }, { name: "Oscar Piastri", pace: 9.5 },
  { name: "George Russell", pace: 9.2 }, { name: "Charles Leclerc", pace: 9 }, { name: "Lewis Hamilton", pace: 8.6 },
  { name: "Kimi Antonelli", pace: 8.5 }, { name: "Isack Hadjar", pace: 7.4 }, { name: "Fernando Alonso", pace: 7 },
  { name: "Carlos Sainz", pace: 7 }, { name: "Alexander Albon", pace: 6.8 }, { name: "Liam Lawson", pace: 6.5 },
  { name: "Nico Hülkenberg", pace: 6.5 }, { name: "Pierre Gasly", pace: 6.4 }, { name: "Oliver Bearman", pace: 6.3 },
  { name: "Gabriel Bortoleto", pace: 6 }, { name: "Arvid Lindblad", pace: 6 }, { name: "Franco Colapinto", pace: 5.8 },
  { name: "Lance Stroll", pace: 5.6 }, { name: "Sergio Pérez", pace: 5.6 }, { name: "Valtteri Bottas", pace: 5.4 },
  { name: "Rafael Câmara", pace: 5 },
];

export const surname = (driver: string): string => driver.trim().split(/\s+/).at(-1) ?? driver;

// ------------------------------------------------------------- the game

/** Something the director added to a live game (sports.ts checks it first). */
export interface GameEvent {
  at: number; // simulation ms
  side?: Side; // team sports
  driver?: string; // a race
  points: number; // a run's points, a score, a goal (1), or places gained (+) or lost (-) in a race
  label: string;
}

export interface GameSpec {
  sport: Sport;
  seed: number;
  startsAt: number;
  laps: number | null;
  events: GameEvent[];
}

/** One thing that happened: a score, or a change of places in a race. */
export interface Play {
  at: number; // simulation ms
  clock: string; // "Q3 4:21", "67'", "Lap 23"
  side: Side | null;
  driver: string | null;
  points: number;
  label: string;
}

export interface GameState {
  status: "scheduled" | "live" | "final";
  home: number;
  away: number;
  /** "Q3 4:21", "67'", "Lap 34/71", "Final", "FT"; null before the start. */
  clock: string | null;
  /** A race: every driver in running order (the grid before the start). */
  order: string[] | null;
  /** What has happened so far, oldest first. */
  plays: Play[];
}

/** mulberry32: a small seeded generator, so a game replays the same way every time. */
function generator(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(r: () => number): number {
  return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
}

function poisson(r: () => number, mean: number): number {
  const limit = Math.exp(-mean);
  let k = 0;
  for (let p = r(); p > limit; p *= r()) k++;
  return k;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** A planned play: f is how far through the game it lands, 0 to 1. */
interface Planned {
  f: number;
  side?: Side;
  points: number;
  label: string;
  /** A race: the place whose holder moves (base plan) or the driver who does (director). */
  pos?: number;
  driver?: string;
}

const SIDES: Side[] = ["home", "away"];

function basketballPlan(r: () => number): Planned[] {
  const out: Planned[] = [];
  for (const side of SIDES) {
    const target = clamp(Math.round(110 + (side === "home" ? 2 : -1) + 9 * gauss(r)), 92, 132);
    for (let sum = 0; sum < target; ) {
      const x = r();
      const points = Math.min(target - sum, x < 0.33 ? 3 : x < 0.9 ? 2 : 1);
      out.push({ f: r(), side, points, label: points === 3 ? "3-pointer" : points === 2 ? "basket" : "free throw" });
      sum += points;
    }
  }
  return out;
}

function footballPlan(r: () => number): Planned[] {
  const out: Planned[] = [];
  for (const side of SIDES) {
    const drives = 2 + Math.floor(r() * 4) + (r() < (side === "home" ? 0.55 : 0.4) ? 1 : 0);
    for (let i = 0; i < drives; i++) {
      const x = r();
      if (x < 0.03) out.push({ f: r(), side, points: 2, label: "safety" });
      else if (x < 0.58) {
        const y = r();
        const points = y < 0.06 ? 6 : y < 0.12 ? 8 : 7;
        out.push({ f: r(), side, points, label: points === 8 ? "touchdown, two-point conversion" : points === 6 ? "touchdown, extra point missed" : "touchdown" });
      } else out.push({ f: r(), side, points: 3, label: "field goal" });
    }
  }
  return out;
}

function soccerPlan(r: () => number): Planned[] {
  const out: Planned[] = [];
  for (const side of SIDES) {
    const goals = poisson(r, side === "home" ? 1.45 : 1.15);
    for (let i = 0; i < goals; i++) out.push({ f: 0.005 + 0.99 * r(), side, points: 1, label: "goal" });
  }
  return out;
}

function racePlan(r: () => number): { grid: string[]; plan: Planned[] } {
  const grid = F1_GRID.map((d) => ({ name: d.name, key: d.pace + gauss(r) }))
    .sort((a, b) => b.key - a.key)
    .map((d) => d.name);
  const plan: Planned[] = [];
  const passes = 6 + Math.floor(r() * 7);
  for (let i = 0; i < passes; i++) plan.push({ f: 0.03 + 0.95 * r(), pos: 2 + Math.floor(r() * 9), points: 1, label: "" });
  const setbacks = Math.floor(r() * 3);
  for (let i = 0; i < setbacks; i++) {
    const what = ["slow pit stop", "spin", "five-second penalty"][Math.floor(r() * 3)];
    plan.push({ f: 0.1 + 0.8 * r(), pos: 1 + Math.floor(r() * 8), points: -(2 + Math.floor(r() * 4)), label: what });
  }
  return { grid, plan };
}

/** A director's scoring run, as the baskets that make it up, twenty seconds apart. */
function runBaskets(points: number): number[] {
  const out: number[] = [];
  for (let left = points, i = 0; left > 0; i++) {
    const p = left === 1 ? 1 : left === 3 || (left >= 5 && i % 2 === 0) ? 3 : 2;
    out.push(p);
    left -= p;
  }
  return out;
}

const RUN_STEP_MS = 20_000;

function directorPlays(spec: GameSpec): Planned[] {
  const out: Planned[] = [];
  const f = (at: number) => (at - spec.startsAt) / GAME_MS;
  for (const e of spec.events) {
    if (spec.sport === "racing") {
      if (e.driver) out.push({ f: f(e.at), driver: e.driver, points: e.points, label: e.label });
    } else if (spec.sport === "basketball") {
      runBaskets(e.points).forEach((p, i) =>
        out.push({ f: f(e.at + i * RUN_STEP_MS), side: e.side, points: p, label: i === 0 ? e.label : p === 3 ? "3-pointer" : "basket" }),
      );
    } else {
      out.push({ f: f(e.at), side: e.side, points: e.points, label: e.label });
    }
  }
  return out;
}

function mmss(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** The clock at a point f (0 to 1) through a live game. */
function clockAt(spec: GameSpec, f: number, long = true): string {
  const x = clamp(f, 0, 0.99999);
  switch (spec.sport) {
    case "basketball":
    case "american_football": {
      const quarter = Math.floor(x * 4) + 1;
      const length = (spec.sport === "basketball" ? 12 : 15) * 60_000;
      return `Q${quarter} ${mmss((quarter - x * 4) * length)}`;
    }
    case "soccer":
      return `${Math.floor(x * 90) + 1}'`;
    case "racing": {
      const laps = spec.laps ?? 57;
      const lap = Math.floor(x * laps) + 1;
      return long ? `Lap ${lap}/${laps}` : `Lap ${lap}`;
    }
  }
}

/** Where a game stands at simulation time t. */
export function gameState(spec: GameSpec, t: number): GameState {
  const r = generator(spec.seed);
  const elapsed = t - spec.startsAt;
  const status = elapsed < 0 ? "scheduled" : elapsed >= GAME_MS ? "final" : "live";
  const frac = clamp(elapsed / GAME_MS, 0, 1);
  const at = (f: number) => spec.startsAt + Math.round(f * GAME_MS);

  if (spec.sport === "racing") {
    const { grid, plan } = racePlan(r);
    const order = grid.slice();
    const plays: Play[] = [];
    const all = [...plan, ...directorPlays(spec)].sort((a, b) => a.f - b.f);
    for (const p of all) {
      if (p.f > frac) break;
      const from = p.driver ? order.indexOf(p.driver) : (p.pos ?? 0) - 1;
      if (from < 0 || from >= order.length) continue;
      const to = clamp(from - p.points, 0, order.length - 1);
      if (to === from) continue;
      const driver = order[from];
      const passed = order[to];
      order.splice(from, 1);
      order.splice(to, 0, driver);
      // Only the front of the field makes the play-by-play.
      if (Math.min(from, to) >= 10) continue;
      const label = p.points > 0
        ? `${p.label ? `${p.label}: ` : ""}${surname(driver)} passes ${surname(passed)} for P${to + 1}`
        : `${surname(driver)}: ${p.label || "loses time"}, down to P${to + 1}`;
      plays.push({ at: at(p.f), clock: clockAt(spec, p.f, false), side: null, driver, points: p.points, label });
    }
    return { status, home: 0, away: 0, clock: status === "scheduled" ? null : status === "final" ? "Final" : clockAt(spec, frac), order, plays };
  }

  const plan = spec.sport === "basketball" ? basketballPlan(r) : spec.sport === "american_football" ? footballPlan(r) : soccerPlan(r);
  const score = { home: 0, away: 0 };
  const plays: Play[] = [];
  for (const p of [...plan, ...directorPlays(spec)].sort((a, b) => a.f - b.f)) {
    if (p.f > frac || !p.side) continue;
    score[p.side] += p.points;
    plays.push({ at: at(p.f), clock: clockAt(spec, p.f), side: p.side, driver: null, points: p.points, label: p.label });
  }
  let clock: string | null = status === "scheduled" ? null : status === "live" ? clockAt(spec, frac) : spec.sport === "soccer" ? "FT" : "Final";
  // Basketball and American football are not left level: overtime settles it.
  if (status === "final" && spec.sport !== "soccer" && score.home === score.away) {
    const side: Side = spec.seed % 2 ? "home" : "away";
    const points = spec.sport === "basketball" ? 2 : 3;
    score[side] += points;
    plays.push({ at: at(1), clock: "OT", side, driver: null, points, label: spec.sport === "basketball" ? "overtime winner" : "overtime field goal" });
    clock = "Final/OT";
  }
  return { status, home: score.home, away: score.away, clock, order: null, plays };
}

// ------------------------------------------------------ the director's lever

/** How many events the director may add to one game. */
export const EVENT_CAP: Record<Sport, number> = { basketball: 3, american_football: 3, soccer: 2, racing: 3 };

/** Turn the director's request into a bounded event, or null if it cannot
 *  happen in this sport. `who` is already resolved to a side or a driver. */
export function boundEvent(
  sport: Sport,
  who: { side?: Side; driver?: string },
  points: number,
  label: string,
  at: number,
): GameEvent | null {
  if (!Number.isFinite(points)) return null;
  const p = Math.round(points);
  // A label that counts ("15-0 run") must not outlive a size that was cut down.
  const keep = (bounded: number) => (bounded === p || !/\d/.test(label) ? label : "");
  switch (sport) {
    case "basketball": {
      const run = clamp(p, 4, 12);
      return who.side ? { at, side: who.side, points: run, label: keep(run) || `${run}-0 run` } : null;
    }
    case "american_football":
      return who.side && [2, 3, 6, 7, 8].includes(p)
        ? { at, side: who.side, points: p, label: label || (p === 3 ? "field goal" : p === 2 ? "safety" : "touchdown") }
        : null;
    case "soccer":
      return who.side && p > 0 ? { at, side: who.side, points: 1, label: label || "goal" } : null;
    case "racing":
      return who.driver && p !== 0 ? { at, driver: who.driver, points: clamp(p, -6, 3), label: keep(clamp(p, -6, 3)) } : null;
  }
}
