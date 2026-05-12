import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { config } from "./config";

mkdirSync(config.dataDir, { recursive: true });

export const db = new Database(join(config.dataDir, "debby.sqlite"), {
  create: true,
  strict: true
});

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

  CREATE TABLE IF NOT EXISTS database_connections (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('postgres', 'mysql')),
    name TEXT NOT NULL,
    host TEXT NOT NULL,
    port INTEGER NOT NULL,
    database_name TEXT NOT NULL,
    username TEXT NOT NULL,
    encrypted_password TEXT NOT NULL,
    ssl_enabled INTEGER NOT NULL DEFAULT 0,
    last_tested_at TEXT,
    last_status TEXT,
    last_error TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_database_connections_type ON database_connections(type);
`);

export type UserRecord = {
  id: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
};

export type SessionRecord = {
  id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
};

export type DatabaseConnectionRecord = {
  id: string;
  type: "postgres" | "mysql";
  name: string;
  host: string;
  port: number;
  database_name: string;
  username: string;
  encrypted_password: string;
  ssl_enabled: 0 | 1;
  last_tested_at: string | null;
  last_status: "success" | "failed" | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export const queries = {
  getAdminUser: db.query<UserRecord, []>("SELECT * FROM users WHERE id = 'admin' LIMIT 1"),
  createAdminUser: db.query<unknown, [string]>(
    "INSERT INTO users (id, password_hash) VALUES ('admin', ?)"
  ),
  getSession: db.query<SessionRecord, [string]>(
    "SELECT * FROM sessions WHERE id = ? AND expires_at > datetime('now') LIMIT 1"
  ),
  createSession: db.query<unknown, [string, string, string]>(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)"
  ),
  deleteSession: db.query<unknown, [string]>("DELETE FROM sessions WHERE id = ?"),
  pruneSessions: db.query<unknown, []>("DELETE FROM sessions WHERE expires_at <= datetime('now')"),
  listDatabaseConnections: db.query<DatabaseConnectionRecord, []>(
    `SELECT * FROM database_connections ORDER BY created_at DESC`
  ),
  getDatabaseConnection: db.query<DatabaseConnectionRecord, [string]>(
    `SELECT * FROM database_connections WHERE id = ? LIMIT 1`
  ),
  createDatabaseConnection: db.query<
    unknown,
    [string, "postgres" | "mysql", string, string, number, string, string, string, number]
  >(
    `INSERT INTO database_connections
      (id, type, name, host, port, database_name, username, encrypted_password, ssl_enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ),
  deleteDatabaseConnection: db.query<unknown, [string]>(
    `DELETE FROM database_connections WHERE id = ?`
  ),
  updateDatabaseConnectionTestStatus: db.query<
    unknown,
    ["success" | "failed", string | null, string]
  >(
    `UPDATE database_connections
     SET last_status = ?, last_error = ?, last_tested_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  )
};
