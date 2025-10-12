import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "../../../data");
const DB_FILE = path.join(DATA_DIR, "debby.db");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function initializeDatabase(): Database.Database {
  ensureDataDir();

  const db = new Database(DB_FILE);

  // Enable WAL mode for better concurrent access
  db.pragma("journal_mode = WAL");

  db.exec(`
		CREATE TABLE IF NOT EXISTS databases (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			type TEXT NOT NULL CHECK(type IN ('postgresql', 'mysql', 'mongodb')),
			port INTEGER NOT NULL UNIQUE,
			username TEXT NOT NULL,
			password TEXT NOT NULL,
			container_id TEXT,
			status TEXT NOT NULL CHECK(status IN ('running', 'stopped', 'created', 'error')),
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL
		);
		
		CREATE TABLE IF NOT EXISTS master_password (
			id INTEGER PRIMARY KEY CHECK(id = 1),
			hash TEXT NOT NULL,
			created_at TEXT NOT NULL
		);
	`);

  return db;
}

let dbInstance: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    dbInstance = initializeDatabase();
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
