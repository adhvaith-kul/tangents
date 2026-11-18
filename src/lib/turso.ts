// Turso (LibSQL) client and synchronization adapter for Tangents.
// In embedded replica mode, reads and writes run against a local replica file
// and sync with the remote Turso cloud database.
import { createClient, type Client, type ResultSet } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

let _client: Client | null = null;
let _syncPromise: Promise<void> | null = null;

export function isTursoEnabled(): boolean {
  return process.env.DB_BACKEND === "turso" && Boolean(process.env.TURSO_DATABASE_URL);
}

export function getTursoReplicaPath(): string {
  const dataDir = path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.TANGENTS_DATA_DIR ?? "data");
  return path.join(dataDir, "turso-replica.db");
}

export function getTursoClient(): Client {
  if (_client) return _client;

  const url = isTursoEnabled()
    ? `file:${getTursoReplicaPath()}`
    : `file:${path.resolve(process.cwd(), "data/tangents.db")}`;

  const syncUrl = isTursoEnabled() ? process.env.TURSO_DATABASE_URL : undefined;
  const authToken = isTursoEnabled() ? process.env.TURSO_AUTH_TOKEN : undefined;

  _client = createClient({
    url,
    syncUrl,
    authToken,
  });

  return _client;
}

/** Trigger bi-directional synchronization with remote Turso */
export async function syncTurso(): Promise<void> {
  if (!isTursoEnabled()) return;
  if (_syncPromise) return _syncPromise;

  _syncPromise = (async () => {
    try {
      const client = getTursoClient();
      await client.sync();
    } catch (err) {
      console.error("[Turso Sync Error]:", err instanceof Error ? err.message : err);
    } finally {
      _syncPromise = null;
    }
  })();

  return _syncPromise;
}

/** Execute a query on Turso directly or via replica */
export async function tursoQuery(sql: string, args: any[] = []): Promise<ResultSet> {
  const client = getTursoClient();
  return client.execute({ sql, args });
}

/** Execute multiple statements inside a single transaction batch */
export async function tursoBatch(statements: { sql: string; args?: any[] }[]): Promise<ResultSet[]> {
  const client = getTursoClient();
  return client.batch(statements, "write");
}
