#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDatabase } from "./database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "../../../data");
const DATABASES_FILE = path.join(DATA_DIR, "databases.json");
const PASSWORD_FILE = path.join(DATA_DIR, "master-password.json");

interface DatabaseJSON {
  id: string;
  name: string;
  type: "postgresql" | "mysql" | "mongodb";
  port: number;
  username: string;
  password: string;
  containerId?: string;
  status: "running" | "stopped" | "created" | "error";
  createdAt: string;
  updatedAt: string;
}

interface MasterPasswordJSON {
  hash: string;
  createdAt: string;
}

export function migrateToSQLite() {
  const db = getDatabase();

  console.log("Starting migration from JSON to SQLite...");

  if (fs.existsSync(DATABASES_FILE)) {
    const databasesData = fs.readFileSync(DATABASES_FILE, "utf-8");
    const databases: DatabaseJSON[] = JSON.parse(databasesData);

    console.log(`Found ${databases.length} databases to migrate`);

    const stmt = db.prepare(`
			INSERT OR REPLACE INTO databases 
			(id, name, type, port, username, password, container_id, status, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

    for (const dbData of databases) {
      stmt.run(
        dbData.id,
        dbData.name,
        dbData.type,
        dbData.port,
        dbData.username,
        dbData.password,
        dbData.containerId || null,
        dbData.status,
        dbData.createdAt,
        dbData.updatedAt,
      );
    }

    console.log(`✓ Migrated ${databases.length} databases`);

    fs.renameSync(DATABASES_FILE, `${DATABASES_FILE}.backup`);
    console.log(`✓ Backed up databases.json to databases.json.backup`);
  } else {
    console.log("No databases.json file found, skipping database migration");
  }

  if (fs.existsSync(PASSWORD_FILE)) {
    const passwordData = fs.readFileSync(PASSWORD_FILE, "utf-8");
    const masterPassword: MasterPasswordJSON = JSON.parse(passwordData);

    console.log("Found master password to migrate");

    const stmt = db.prepare(`
			INSERT OR REPLACE INTO master_password (id, hash, created_at)
			VALUES (1, ?, ?)
		`);

    stmt.run(masterPassword.hash, masterPassword.createdAt);

    console.log("✓ Migrated master password");

    fs.renameSync(PASSWORD_FILE, `${PASSWORD_FILE}.backup`);
    console.log(
      `✓ Backed up master-password.json to master-password.json.backup`,
    );
  } else {
    console.log(
      "No master-password.json file found, skipping password migration",
    );
  }

  console.log("\n✓ Migration completed successfully!");
  console.log("SQLite database created at:", path.join(DATA_DIR, "debby.db"));
}

// Run migration if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    migrateToSQLite();
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}
