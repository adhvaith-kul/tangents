// SQLite access, schema and the simulation clock.
// Server-only: never import from a client component.
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { CAST, STOCKS, avatarOf, bannerOf, type CastMember } from "./cast";
import { INITIAL_RELATIONSHIPS } from "./personas";

// TANGENTS_DATA_DIR lets a second instance (a test run) keep its own world.
const DATA_DIR = path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.TANGENTS_DATA_DIR ?? "data");
const DB_PATH = path.join(DATA_DIR, "tangents.db");
const SNAPSHOT_PATH = path.join(DATA_DIR, "snapshot.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS accounts (
  handle TEXT PRIMARY KEY COLLATE NOCASE,
  name TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL,              -- figure | outlet | crowd | org | user
  domain TEXT NOT NULL,
  badge TEXT,                      -- blue | gold | NULL
  followers INTEGER NOT NULL DEFAULT 0,
  following INTEGER NOT NULL DEFAULT 0,
  avatar TEXT,
  banner TEXT NOT NULL DEFAULT '#333639',
  location TEXT,
  joined TEXT NOT NULL DEFAULT ''
);

-- accounts the user follows
CREATE TABLE IF NOT EXISTS follows (handle TEXT PRIMARY KEY COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author TEXT NOT NULL COLLATE NOCASE,
  text TEXT NOT NULL,
  created_at INTEGER NOT NULL,     -- simulation ms; the post is visible once created_at <= now()
  reply_to INTEGER,                -- parent post id
  root_id INTEGER,                 -- top post of the thread (NULL for a top-level post)
  quote_of INTEGER,
  article_id INTEGER,
  storyline_id INTEGER,
  domain TEXT,
  tone TEXT,
  topics TEXT NOT NULL DEFAULT '[]',   -- JSON string[]
  heat INTEGER NOT NULL DEFAULT 3,
  t_likes INTEGER NOT NULL DEFAULT 0,  -- engagement targets, see engagement.ts
  t_reposts INTEGER NOT NULL DEFAULT 0,
  t_replies INTEGER NOT NULL DEFAULT 0,
  t_views INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0,  -- deleted by its author: hidden everywhere, a tombstone in threads
  media TEXT,                          -- JSON PostMedia, or NULL
  style TEXT,                          -- kind of humour or remark, for replies that were labelled
  lang TEXT,                           -- language name in English, when the post is not in English
  translation TEXT,                    -- the English translation, with lang
  tactic TEXT                          -- what the post is doing to its reader (lib/tactics.ts), as its writer labelled it
);
CREATE INDEX IF NOT EXISTS posts_created ON posts(created_at);
CREATE INDEX IF NOT EXISTS posts_reply ON posts(reply_to);
CREATE INDEX IF NOT EXISTS posts_author ON posts(author, created_at);
CREATE INDEX IF NOT EXISTS posts_storyline ON posts(storyline_id);

-- "Readers added context": a Community Note under a post. One per post.
CREATE TABLE IF NOT EXISTS notes (
  post_id INTEGER PRIMARY KEY,
  text TEXT NOT NULL,
  created_at INTEGER NOT NULL      -- simulation ms; shown once created_at <= now()
);

-- one row per story beat, in the order the world wrote them: the record the
-- story map is drawn from.
CREATE TABLE IF NOT EXISTS beats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  storyline_id INTEGER NOT NULL,
  kind TEXT NOT NULL,              -- new_event | advance | spinoff | crossover | user_reaction
  summary TEXT NOT NULL,           -- what happened on this beat, one or two sentences
  heat INTEGER NOT NULL DEFAULT 5,
  article_id INTEGER,              -- the page published on this beat, if any
  post_id INTEGER,                 -- the beat's first post
  headline_id INTEGER,             -- the real headline it started from, if any
  seeded INTEGER NOT NULL DEFAULT 0,   -- 1 when the reader proposed it ("What if")
  premise TEXT,                    -- the reader's own words, when they proposed it
  created_at INTEGER NOT NULL      -- simulation ms
);
CREATE INDEX IF NOT EXISTS beats_storyline ON beats(storyline_id, created_at);

-- a poll attached to a post. targets are the final vote counts the displayed
-- numbers climb towards (see engagement.ts); the user's vote is in user_choice.
CREATE TABLE IF NOT EXISTS polls (
  post_id INTEGER PRIMARY KEY,
  options TEXT NOT NULL,           -- JSON string[] (2 to 4 labels)
  targets TEXT NOT NULL,           -- JSON number[]: final votes per option, before the user's vote
  closes_at INTEGER NOT NULL,      -- simulation ms
  user_choice INTEGER,             -- index the user voted for, or NULL
  resolved INTEGER NOT NULL DEFAULT 0   -- 1 once the result has been recorded as a fact
);

-- a plain repost: an account sharing someone else's post without comment.
-- account may be the user. Visible once created_at <= now().
CREATE TABLE IF NOT EXISTS reposts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account TEXT NOT NULL COLLATE NOCASE,
  post_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (account, post_id)
);
CREATE INDEX IF NOT EXISTS reposts_post ON reposts(post_id);
CREATE INDEX IF NOT EXISTS reposts_account ON reposts(account, created_at);

CREATE TABLE IF NOT EXISTS storylines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  domain TEXT NOT NULL,
  tone TEXT NOT NULL,
  topics TEXT NOT NULL DEFAULT '[]',        -- JSON string[]
  participants TEXT NOT NULL DEFAULT '[]',  -- JSON handles
  origin TEXT NOT NULL,            -- headline | spinoff | user | original
  headline_id INTEGER,
  heat INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'open',      -- open | dormant
  beats INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  outlet TEXT NOT NULL COLLATE NOCASE,
  headline TEXT NOT NULL,
  dek TEXT NOT NULL,
  body TEXT NOT NULL,
  storyline_id INTEGER,
  created_at INTEGER NOT NULL,
  kind TEXT NOT NULL DEFAULT 'article',   -- article | press_release | blog | statement | edition
  updated_at INTEGER                      -- set when a developing story is revised
);

-- The Arc's daily editions (paper.ts, sim/edition.ts): one per simulated date.
-- Its front page is the post, its edition page is the article.
CREATE TABLE IF NOT EXISTS editions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,       -- the simulated date it is dated, "2026-11-15"
  edition TEXT NOT NULL,           -- JSON Edition (arc.ts)
  article_id INTEGER NOT NULL,     -- the edition page
  post_id INTEGER,                 -- the post that carried the front page
  created_at INTEGER NOT NULL      -- simulation ms it was written
);

-- one row per unordered pair, stored with a < b (case-insensitive)
CREATE TABLE IF NOT EXISTS relationships (
  a TEXT NOT NULL COLLATE NOCASE,
  b TEXT NOT NULL COLLATE NOCASE,
  score INTEGER NOT NULL DEFAULT 0,   -- -10 to +10
  note TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (a, b)
);

CREATE TABLE IF NOT EXISTS facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  subjects TEXT NOT NULL DEFAULT '[]',  -- JSON handles
  storyline_id INTEGER,
  created_at INTEGER NOT NULL,
  due_at INTEGER,                       -- simulation ms a promise, bet or deadline falls due, or NULL
  due_shown INTEGER NOT NULL DEFAULT 0  -- times listed as coming due; 3 means settled (sim/recall.ts)
);

-- Where each famous account stands now (sim/stands.ts): one living note per
-- account, replaced when a beat moves it.
CREATE TABLE IF NOT EXISTS stands (
  handle TEXT PRIMARY KEY COLLATE NOCASE,
  note TEXT NOT NULL,
  updated_at INTEGER NOT NULL      -- simulation ms it was written
);

-- Lines the timeline coined (sim/injokes.ts): each stand-out reply, offered to
-- the crowd as something to riff on for a few days.
CREATE TABLE IF NOT EXISTS injokes (
  post_id INTEGER PRIMARY KEY,     -- the stand-out reply
  line TEXT NOT NULL,              -- its text, shortened to a line
  storyline_id INTEGER,
  offered INTEGER NOT NULL DEFAULT 0,  -- crowd batches it has been listed in
  created_at INTEGER NOT NULL      -- simulation ms, the post's time
);

CREATE TABLE IF NOT EXISTS stocks (
  ticker TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,              -- stock | crypto
  day_open REAL NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);
-- price history. A row with t in the future is a scheduled move; the current
-- price is the latest row with t <= now().
CREATE TABLE IF NOT EXISTS stock_ticks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticker TEXT NOT NULL,
  t INTEGER NOT NULL,
  price REAL NOT NULL,
  pct REAL,                        -- size of the story-driven move, when there is one
  reason TEXT,                     -- set when a story moved it
  storyline_id INTEGER
);
CREATE INDEX IF NOT EXISTS ticks_ticker ON stock_ticks(ticker, t);

CREATE TABLE IF NOT EXISTS headlines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  title TEXT NOT NULL UNIQUE,
  link TEXT,
  domain TEXT NOT NULL,
  published_at INTEGER,
  fetched_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  -- set by the news desk (sim/desk.ts): how the headline fits this world
  relation TEXT,                   -- new | continues | conflicts | skip; NULL = not assessed yet
  storyline_id INTEGER,            -- the open storyline it continues or conflicts with
  adapted TEXT                     -- the headline rewritten to fit this world, when it had to be
);

CREATE TABLE IF NOT EXISTS trends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  storyline_id INTEGER,
  domain TEXT,
  heat INTEGER NOT NULL DEFAULT 5,
  posts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- raw engagement log
CREATE TABLE IF NOT EXISTS interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  post_id INTEGER,
  handle TEXT,
  ms INTEGER,
  created_at INTEGER NOT NULL
);

-- the user's state on a post
CREATE TABLE IF NOT EXISTS viewer_state (
  post_id INTEGER PRIMARY KEY,
  liked INTEGER NOT NULL DEFAULT 0,
  reposted INTEGER NOT NULL DEFAULT 0,
  bookmarked INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0     -- "Not interested"
);

-- learned taste weights. kind: author | topic | domain | tone | storyline | style | format
CREATE TABLE IF NOT EXISTS prefs (
  kind TEXT NOT NULL,
  key TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (kind, key)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,              -- reply | quote | mention | like | repost | follow
  actor TEXT NOT NULL COLLATE NOCASE,
  post_id INTEGER,                 -- the reply / quote / mention
  target_post_id INTEGER,          -- the user's post that was liked / reposted
  count INTEGER NOT NULL DEFAULT 1,     -- for likes: "actor and count-1 others"
  created_at INTEGER NOT NULL,     -- simulation ms; shown once created_at <= now()
  read INTEGER NOT NULL DEFAULT 0
);

-- Live sport (sports.ts, games.ts): real fixtures, results invented by this
-- world. A live game's score is computed from its seed and events; a final
-- one is stored here and never changes.
CREATE TABLE IF NOT EXISTS fixtures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ext_id TEXT NOT NULL UNIQUE,     -- the real schedule's id: "<competition>:<ESPN event or race session id>"
  competition TEXT NOT NULL,       -- nba | nfl | epl | laliga | ucl | f1 (games.ts COMPETITIONS)
  home TEXT,                       -- JSON {name, short, abbr}; NULL for a race
  away TEXT,
  event TEXT,                      -- a race: the Grand Prix
  session TEXT,                    -- a race: the session, "Race"
  laps INTEGER,                    -- a race
  starts_at INTEGER NOT NULL,      -- simulation ms
  status TEXT NOT NULL DEFAULT 'scheduled',   -- scheduled | live | final
  home_score INTEGER,
  away_score INTEGER,
  clock TEXT,                      -- short label: "Q3 4:21", "67'", "Lap 34/71", "FT"
  race_order TEXT,                 -- a race: JSON driver names in running order
  seed INTEGER NOT NULL,           -- with events, decides how the game plays out
  events TEXT NOT NULL DEFAULT '[]',   -- JSON GameEvent[]: what the director added
  storyline_id INTEGER             -- the storyline covering it, from when it went live
);
CREATE INDEX IF NOT EXISTS fixtures_start ON fixtures(starts_at);

-- A team's record in one competition: seeded from the real record when the
-- team is first fetched, then changed only by this world's results.
CREATE TABLE IF NOT EXISTS team_records (
  competition TEXT NOT NULL,
  team TEXT NOT NULL,              -- the team's full name
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,    -- ties in American football
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (competition, team)
);

-- The slate (slate.ts): invented films, series, albums, tours and games, each
-- with a life over later beats. Figures once stated never change.
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,              -- film | series | album | tour | game
  title TEXT NOT NULL,
  maker TEXT NOT NULL,             -- the studio, platform, label or publisher, by name
  maker_handle TEXT,               -- its account, when it is in the cast
  people TEXT NOT NULL DEFAULT '[]',   -- JSON [{name, role, handle?}] in billing order
  logline TEXT NOT NULL DEFAULT '',
  tagline TEXT,                    -- the line on its poster
  status TEXT NOT NULL DEFAULT 'announced',  -- announced | in_production | dated | released | delayed | cancelled
  release TEXT,                    -- free text: "Summer 2027", "14 August"
  figures TEXT NOT NULL DEFAULT '[]',  -- JSON string[]: numbers stated so far, fixed
  stops TEXT NOT NULL DEFAULT '[]',    -- a tour: JSON [{city, date}]
  platforms TEXT,                  -- a game
  history TEXT NOT NULL DEFAULT '[]',  -- JSON [{at, what}]: everything that happened to it
  storyline_id INTEGER,            -- the storyline it belongs to or grew out of
  format TEXT NOT NULL,            -- title_card | poster | cover | tour_poster | key_art
  look INTEGER NOT NULL,           -- the card's layout and palette, chosen once
  post_id INTEGER,                 -- the post that last carried its card
  created_at INTEGER NOT NULL,     -- simulation ms
  updated_at INTEGER NOT NULL
);

-- Major events (sim/major.ts): one planned in secret, built up to, broken and
-- played out. At most one is not resolved. Never sent to the browser before it breaks.
CREATE TABLE IF NOT EXISTS arcs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scale TEXT NOT NULL,             -- scandal | national | global
  kind TEXT NOT NULL,              -- scandal | business | politics | disaster | world
  started_by TEXT NOT NULL,        -- reader | world
  plan TEXT NOT NULL,              -- JSON: event, roots, phases (happens, unsaid, beats), consequences
  phase TEXT NOT NULL,             -- murmurs | break | fallout | resolution | resolved
  phase_beats INTEGER NOT NULL DEFAULT 0,  -- beats spent in the current phase
  played TEXT NOT NULL DEFAULT '[]',       -- JSON number[]: consequences played
  storyline_id INTEGER,            -- the event's storyline, from the break
  created_at INTEGER NOT NULL,     -- simulation ms
  broke_at INTEGER,
  resolved_at INTEGER
);

CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS llm_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,
  backend TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  ms INTEGER NOT NULL DEFAULT 0,
  ok INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
`;

// ------------------------------------------------------------------ rows

export interface AccountRow {
  handle: string;
  name: string;
  bio: string;
  kind: string;
  domain: string;
  badge: string | null;
  followers: number;
  following: number;
  avatar: string | null;
  banner: string;
  location: string | null;
  joined: string;
}

export interface PostRow {
  id: number;
  author: string;
  text: string;
  created_at: number;
  reply_to: number | null;
  root_id: number | null;
  quote_of: number | null;
  article_id: number | null;
  storyline_id: number | null;
  domain: string | null;
  tone: string | null;
  topics: string;
  heat: number;
  t_likes: number;
  t_reposts: number;
  t_replies: number;
  t_views: number;
  deleted: number;
  media: string | null;
  /** A reply's kind of humour or remark ("sarcasm", "expert", ...), when its writer labelled it. */
  style?: string | null;
  /** Language of a post not written in English, and its English translation. */
  lang?: string | null;
  translation?: string | null;
  tactic?: string | null;
}

export interface StorylineRow {
  id: number;
  parent_id: number | null;
  title: string;
  summary: string;
  domain: string;
  tone: string;
  topics: string;
  participants: string;
  origin: string;
  headline_id: number | null;
  heat: number;
  status: string;
  beats: number;
  created_at: number;
  updated_at: number;
}

export interface ArticleRow {
  id: number;
  outlet: string;
  headline: string;
  dek: string;
  body: string;
  storyline_id: number | null;
  created_at: number;
  kind: string;
  updated_at: number | null;
}

// ------------------------------------------------------------ connection

interface Globals {
  __tangentsDb?: DatabaseSync;
  __tangentsOffset?: number;
}
const g = globalThis as Globals;

function open(): DatabaseSync {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const conn = new DatabaseSync(DB_PATH);
  conn.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  conn.exec(SCHEMA);
  migrate(conn);
  seed(conn);
  const row = conn.prepare("SELECT value FROM kv WHERE key = 'clock_offset'").get() as
    | { value: string }
    | undefined;
  g.__tangentsOffset = row ? Number(row.value) : 0;
  return conn;
}

/** The shared connection. Creates and seeds the database on first use. */
export function db(): DatabaseSync {
  if (!g.__tangentsDb) g.__tangentsDb = open();
  return g.__tangentsDb;
}

/** Bring a database (or snapshot) created by an earlier build up to date. */
function migrate(conn: DatabaseSync) {
  const cols = conn.prepare("PRAGMA table_info(posts)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "deleted")) {
    conn.exec("ALTER TABLE posts ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0");
  }
  if (!cols.some((c) => c.name === "media")) conn.exec("ALTER TABLE posts ADD COLUMN media TEXT");
  if (!cols.some((c) => c.name === "style")) conn.exec("ALTER TABLE posts ADD COLUMN style TEXT");
  if (!cols.some((c) => c.name === "lang")) conn.exec("ALTER TABLE posts ADD COLUMN lang TEXT");
  if (!cols.some((c) => c.name === "translation")) conn.exec("ALTER TABLE posts ADD COLUMN translation TEXT");
  if (!cols.some((c) => c.name === "tactic")) conn.exec("ALTER TABLE posts ADD COLUMN tactic TEXT");
  const bcols = conn.prepare("PRAGMA table_info(beats)").all() as { name: string }[];
  if (bcols.length && !bcols.some((c) => c.name === "premise")) conn.exec("ALTER TABLE beats ADD COLUMN premise TEXT");
  const acols = conn.prepare("PRAGMA table_info(articles)").all() as { name: string }[];
  if (!acols.some((c) => c.name === "kind")) {
    conn.exec("ALTER TABLE articles ADD COLUMN kind TEXT NOT NULL DEFAULT 'article'");
  }
  if (!acols.some((c) => c.name === "updated_at")) conn.exec("ALTER TABLE articles ADD COLUMN updated_at INTEGER");
  const hcols = conn.prepare("PRAGMA table_info(headlines)").all() as { name: string }[];
  if (!hcols.some((c) => c.name === "relation")) {
    conn.exec("ALTER TABLE headlines ADD COLUMN relation TEXT");
    conn.exec("ALTER TABLE headlines ADD COLUMN storyline_id INTEGER");
    conn.exec("ALTER TABLE headlines ADD COLUMN adapted TEXT");
  }
  const fcols = conn.prepare("PRAGMA table_info(facts)").all() as { name: string }[];
  if (!fcols.some((c) => c.name === "due_at")) {
    conn.exec("ALTER TABLE facts ADD COLUMN due_at INTEGER");
    conn.exec("ALTER TABLE facts ADD COLUMN due_shown INTEGER NOT NULL DEFAULT 0");
  }
  // New tables (beats, fixtures, team_records, projects) need nothing here: SCHEMA runs
  // first and creates whatever an older database or snapshot lacks.
  // Accounts added to the cast since this world was created (none on a new world),
  // and accounts dropped from it that never posted.
  const have = conn.prepare("SELECT COUNT(*) AS n FROM accounts").get() as { n: number };
  if (have.n === 0) return;
  const current = new Set(CAST.map((c) => c.handle.toLowerCase()));
  current.add(SPECIAL.handle);
  const stale = (
    conn
      .prepare(
        `SELECT handle FROM accounts a WHERE kind != 'user'
           AND NOT EXISTS (SELECT 1 FROM posts p WHERE p.author = a.handle)
           AND NOT EXISTS (SELECT 1 FROM reposts r WHERE r.account = a.handle)`,
      )
      .all() as { handle: string }[]
  ).filter((r) => !current.has(r.handle.toLowerCase()));
  for (const r of stale) {
    conn.prepare("DELETE FROM accounts WHERE handle = ?").run(r.handle);
    conn.prepare("DELETE FROM follows WHERE handle = ?").run(r.handle);
    conn.prepare("DELETE FROM relationships WHERE a = ? OR b = ?").run(r.handle, r.handle);
  }
  const add = conn.prepare(
    `INSERT OR IGNORE INTO accounts (handle, name, bio, kind, domain, badge, followers, following, avatar, banner, location, joined)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  // Pictures can be added to the cast after a world was created.
  const setAvatar = conn.prepare("UPDATE accounts SET avatar = ? WHERE handle = ? AND avatar IS NOT ?");
  const setBanner = conn.prepare("UPDATE accounts SET banner = ? WHERE handle = ? AND kind != 'user' AND banner != ?");
  // And an account can move to another subject (markets and gaming were split out of tech and pop).
  const setDomain = conn.prepare("UPDATE accounts SET domain = ? WHERE handle = ? AND kind != 'user' AND domain != ?");
  for (const c of CAST) {
    add.run(
      c.handle, c.name, c.bio, c.kind, c.domain, c.badge, Math.round(c.followers),
      c.following, avatarOf(c), bannerFor(c), c.location, c.joined,
    );
    setAvatar.run(avatarOf(c), c.handle, avatarOf(c));
    setBanner.run(bannerFor(c), c.handle, bannerFor(c));
    setDomain.run(c.domain, c.handle, c.domain);
  }
  ensureSpecial(conn);
}

/** Brok, the site's assistant: an account in every world, but not a cast
 *  member any writer may speak as. The one definition of its row, created
 *  with the world and added to older worlds on start. */
const SPECIAL = {
  handle: "brok", name: "Brok", bio: "Ask me anything. I read the whole timeline so you don't have to.",
  kind: "org", domain: "tech", badge: "gold", followers: 6_400_000, following: 1,
  avatar: "/logos/brok.svg", banner: "/logos/brok-banner.svg", location: null, joined: "November 2023",
};

function ensureSpecial(conn: DatabaseSync) {
  conn
    .prepare(
      `INSERT OR IGNORE INTO accounts (handle, name, bio, kind, domain, badge, followers, following, avatar, banner, location, joined)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      SPECIAL.handle, SPECIAL.name, SPECIAL.bio, SPECIAL.kind, SPECIAL.domain, SPECIAL.badge, SPECIAL.followers,
      SPECIAL.following, SPECIAL.avatar, SPECIAL.banner, SPECIAL.location, SPECIAL.joined,
    );
}

/** What X shows behind a profile that has never set a header. */
const BLANK_BANNER = "#333639";

/** An account's header: the picture that ships with the app, else the one
 *  `npm run avatars` downloaded for a real account, else X's blank grey. */
function bannerFor(c: CastMember): string {
  const own = bannerOf(c);
  if (own.startsWith("/")) return own;
  if (c.kind !== "crowd") {
    const file = path.resolve(/* turbopackIgnore: true */ process.cwd(), "public", "banners", `${c.handle}.jpg`);
    if (fs.existsSync(file)) return `/banners/${c.handle}.jpg`;
  }
  return BLANK_BANNER;
}

function seed(conn: DatabaseSync) {
  const count = conn.prepare("SELECT COUNT(*) AS n FROM accounts").get() as { n: number };
  if (count.n > 0) return;
  const t = Date.now();
  conn.exec("BEGIN");
  const insertAccount = conn.prepare(
    `INSERT INTO accounts (handle, name, bio, kind, domain, badge, followers, following, avatar, banner, location, joined)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const c of CAST) {
    insertAccount.run(
      c.handle, c.name, c.bio, c.kind, c.domain, c.badge, Math.round(c.followers),
      c.following, avatarOf(c), bannerFor(c), c.location, c.joined,
    );
  }
  const insertStock = conn.prepare(
    "INSERT INTO stocks (ticker, name, kind, day_open, sort) VALUES (?, ?, ?, ?, ?)",
  );
  const insertTick = conn.prepare("INSERT INTO stock_ticks (ticker, t, price) VALUES (?, ?, ?)");
  STOCKS.forEach((s, i) => {
    insertStock.run(s.ticker, s.name, s.kind, s.price, i);
    insertTick.run(s.ticker, t, s.price);
  });
  const insertRel = conn.prepare(
    "INSERT OR REPLACE INTO relationships (a, b, score, note, updated_at) VALUES (?, ?, ?, ?, ?)",
  );
  for (const r of INITIAL_RELATIONSHIPS) {
    const [a, b] = pairKey(r.a, r.b);
    insertRel.run(a, b, r.score, r.note, t);
  }
  conn.exec("COMMIT");
}

/** Canonical order for a relationship pair. */
export function pairKey(x: string, y: string): [string, string] {
  return x.toLowerCase() < y.toLowerCase() ? [x, y] : [y, x];
}

/** Run fn inside a transaction. */
export function tx<T>(fn: () => T): T {
  const conn = db();
  conn.exec("BEGIN");
  try {
    const out = fn();
    conn.exec("COMMIT");
    return out;
  } catch (err) {
    conn.exec("ROLLBACK");
    throw err;
  }
}

// ------------------------------------------------------------------ kv

export function kvGet(key: string): string | null {
  const row = db().prepare("SELECT value FROM kv WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row ? row.value : null;
}

export function kvSet(key: string, value: string): void {
  db()
    .prepare("INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(key, value);
}

// --------------------------------------------------------------- clock

/** Simulation time in ms. Real time plus the offset added by "Skip a day". */
export function now(): number {
  db();
  return Date.now() + (g.__tangentsOffset ?? 0);
}

/** Move the simulation clock forward. */
export function advanceClock(ms: number): void {
  db();
  g.__tangentsOffset = (g.__tangentsOffset ?? 0) + ms;
  kvSet("clock_offset", String(g.__tangentsOffset));
}

// ------------------------------------------------------- the user account

/** The user's handle, or null before onboarding. */
export function userHandle(): string | null {
  const row = db().prepare("SELECT handle FROM accounts WHERE kind = 'user' LIMIT 1").get() as
    | { handle: string }
    | undefined;
  return row ? row.handle : null;
}

// ------------------------------------------------------------ snapshots

export function hasSnapshot(): boolean {
  return fs.existsSync(SNAPSHOT_PATH);
}

/** Save the whole world to data/snapshot.db. */
export function saveSnapshot(): void {
  fs.rmSync(SNAPSHOT_PATH, { force: true });
  db().exec(`VACUUM INTO '${SNAPSHOT_PATH.replace(/'/g, "''")}'`);
}

function close() {
  g.__tangentsDb?.close();
  g.__tangentsDb = undefined;
}

function removeDbFiles() {
  for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(DB_PATH + suffix, { force: true });
}

/** Replace the world with the saved snapshot. Returns false if there is none. */
export function restoreSnapshot(): boolean {
  if (!hasSnapshot()) return false;
  close();
  removeDbFiles();
  fs.copyFileSync(SNAPSHOT_PATH, DB_PATH);
  db();
  return true;
}

// ------------------------------------------------------------ saved worlds
// A saved world is the whole database under a name, in worlds/ at the project
// root. That folder is not git-ignored, so a world one person stages can be
// committed and loaded by another. Loading one puts its clock back to the
// moment it was saved, so nothing in it has aged and what was scheduled for
// the next few minutes still arrives on time.

const WORLDS_DIR = path.resolve(/* turbopackIgnore: true */ process.cwd(), "worlds");
const WORLD_NAME = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,39}$/;
const worldPath = (name: string) => path.join(WORLDS_DIR, `${name}.db`);

export interface SavedWorld {
  name: string;
  /** Real time it was saved, and the simulation time it will resume at. */
  savedAt: number;
  simTime: number;
  posts: number;
  reader: string | null;
}

export const validWorldName = (name: unknown): name is string => typeof name === "string" && WORLD_NAME.test(name.trim());

/** The name the world on screen was last saved or loaded under; null for one never saved. */
export function currentWorldName(): string | null {
  const name = kvGet("world_name");
  // A name whose save has since been deleted no longer names anything.
  return name && fs.existsSync(worldPath(name)) ? name : null;
}

/** Save the current world under a name, replacing any world already saved with it. */
export function saveWorld(name: string): void {
  if (!validWorldName(name)) throw new Error("Use letters, digits, spaces, hyphens or underscores, 40 characters at most.");
  fs.mkdirSync(WORLDS_DIR, { recursive: true });
  kvSet("saved_sim", String(now()));
  kvSet("saved_real", String(Date.now()));
  // A world knows its own name, so the screen can say which one is running.
  kvSet("world_name", name.trim());
  const file = worldPath(name.trim());
  fs.rmSync(file, { force: true });
  db().exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
}

/** Replace the current world with a saved one, its clock resuming where it stopped. False if there is none by that name. */
export function loadWorld(name: string): boolean {
  if (!validWorldName(name) || !fs.existsSync(worldPath(name.trim()))) return false;
  close();
  removeDbFiles();
  fs.copyFileSync(worldPath(name.trim()), DB_PATH);
  db();
  kvSet("world_name", name.trim()); // also names a file that was renamed or saved before worlds had names
  const saved = Number(kvGet("saved_sim"));
  if (Number.isFinite(saved) && saved > 0) {
    g.__tangentsOffset = saved - Date.now();
    kvSet("clock_offset", String(g.__tangentsOffset));
  }
  return true;
}

export function deleteWorld(name: string): boolean {
  if (!validWorldName(name) || !fs.existsSync(worldPath(name.trim()))) return false;
  fs.rmSync(worldPath(name.trim()), { force: true });
  return true;
}

/** Every saved world, most recently saved first. A file that cannot be read is left out. */
export function listWorlds(): SavedWorld[] {
  if (!fs.existsSync(WORLDS_DIR)) return [];
  const out: SavedWorld[] = [];
  for (const f of fs.readdirSync(WORLDS_DIR)) {
    if (!f.endsWith(".db")) continue;
    try {
      const conn = new DatabaseSync(path.join(WORLDS_DIR, f), { readOnly: true });
      try {
        const kv = (k: string) => (conn.prepare("SELECT value FROM kv WHERE key = ?").get(k) as { value: string } | undefined)?.value;
        const posts = (conn.prepare("SELECT COUNT(*) AS n FROM posts WHERE deleted = 0").get() as { n: number }).n;
        const reader = (conn.prepare("SELECT name FROM accounts WHERE kind = 'user' LIMIT 1").get() as { name: string } | undefined)?.name ?? null;
        out.push({ name: f.slice(0, -3), savedAt: Number(kv("saved_real")) || 0, simTime: Number(kv("saved_sim")) || 0, posts, reader });
      } finally {
        conn.close();
      }
    } catch {
      // not a world this version can read
    }
  }
  return out.sort((a, b) => b.savedAt - a.savedAt);
}

/** Delete the world and start again from the seed. The snapshot is kept. */
export function resetWorld(): void {
  close();
  removeDbFiles();
  db();
}
