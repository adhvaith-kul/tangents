// SQLite access, schema and the simulation clock.
// FROZEN after phase 1. Server-only: never import from a client component.
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { CAST, STOCKS, avatarPath } from "./cast";
import { INITIAL_RELATIONSHIPS } from "./personas";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "tangents.db");
const SNAPSHOT_PATH = path.join(DATA_DIR, "snapshot.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS accounts (
  handle TEXT PRIMARY KEY COLLATE NOCASE,
  name TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL,              -- figure | outlet | crowd | user
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
  t_views INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS posts_created ON posts(created_at);
CREATE INDEX IF NOT EXISTS posts_reply ON posts(reply_to);
CREATE INDEX IF NOT EXISTS posts_author ON posts(author, created_at);
CREATE INDEX IF NOT EXISTS posts_storyline ON posts(storyline_id);

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
  created_at INTEGER NOT NULL
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
  created_at INTEGER NOT NULL
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
  used INTEGER NOT NULL DEFAULT 0
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

-- learned taste weights. kind: author | topic | domain | tone | storyline
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
      c.following, avatarPath(c.handle, c.kind), c.banner, c.location, c.joined,
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

/** Delete the world and start again from the seed. The snapshot is kept. */
export function resetWorld(): void {
  close();
  removeDbFiles();
  db();
}
