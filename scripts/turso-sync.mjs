#!/usr/bin/env node
// Sync and migration utility for Turso (LibSQL).
// Usage:
//   node scripts/turso-sync.mjs test      # test connection
//   node scripts/turso-sync.mjs info      # list tables
import { createClient } from "@libsql/client";
import path from "node:path";

const backend = process.env.DB_BACKEND || "local";
const isTurso = backend === "turso" && Boolean(process.env.TURSO_DATABASE_URL);
const url = isTurso ? process.env.TURSO_DATABASE_URL : `file:${path.resolve(process.cwd(), "data/tangents.db")}`;
const authToken = isTurso ? process.env.TURSO_AUTH_TOKEN : undefined;

console.log(`ℹ️  DB_BACKEND: ${backend} (${isTurso ? "Remote Turso" : "Local SQLite"})`);

const client = createClient({
  url,
  authToken,
});

async function run() {
  const cmd = process.argv[2] || "test";

  if (cmd === "test") {
    console.log(`Connecting to ${url}...`);
    try {
      const res = await client.execute("SELECT COUNT(*) AS count FROM accounts");
      console.log(`✅ Success! Connected. Found ${res.rows[0].count} accounts in database.`);
    } catch (err) {
      console.error("❌ Connection failed:", err);
      process.exit(1);
    }
  } else if (cmd === "info") {
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    console.log("Tables in database:", tables.rows.map((r) => r.name));
  } else {
    console.log("Usage: node scripts/turso-sync.mjs [test|info]");
  }
}

run().catch(console.error);
