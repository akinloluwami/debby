import type {
  DatabaseInstance,
  DatabaseCreateInput,
  DatabaseUpdateInput,
} from "../types";
import { randomUUID } from "crypto";
import { getDatabase } from "./database.js";

function rowToDatabase(row: any): DatabaseInstance {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    port: row.port,
    username: row.username,
    password: row.password,
    containerId: row.container_id,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function getAllDatabases(): DatabaseInstance[] {
  const db = getDatabase();
  const stmt = db.prepare("SELECT * FROM databases");
  const rows = stmt.all();
  return rows.map(rowToDatabase);
}

export function getDatabaseById(id: string): DatabaseInstance | null {
  const db = getDatabase();
  const stmt = db.prepare("SELECT * FROM databases WHERE id = ?");
  const row = stmt.get(id);
  return row ? rowToDatabase(row) : null;
}

export function createDatabase(
  input: DatabaseCreateInput & { port: number },
): DatabaseInstance {
  const db = getDatabase();

  const portCheck = db
    .prepare("SELECT id FROM databases WHERE port = ?")
    .get(input.port);
  if (portCheck) {
    throw new Error(`Port ${input.port} is already in use`);
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
		INSERT INTO databases (id, name, type, port, username, password, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`);

  stmt.run(
    id,
    input.name,
    input.type,
    input.port,
    input.username,
    input.password,
    "created",
    now,
    now,
  );

  return getDatabaseById(id)!;
}

export function updateDatabase(input: DatabaseUpdateInput): DatabaseInstance {
  const db = getDatabase();
  const current = getDatabaseById(input.id);

  if (!current) {
    throw new Error("Database not found");
  }

  const updates: string[] = [];
  const values: any[] = [];

  if (input.name !== undefined) {
    updates.push("name = ?");
    values.push(input.name);
  }
  if (input.port !== undefined) {
    updates.push("port = ?");
    values.push(input.port);
  }
  if (input.username !== undefined) {
    updates.push("username = ?");
    values.push(input.username);
  }
  if (input.password !== undefined) {
    updates.push("password = ?");
    values.push(input.password);
  }

  updates.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(input.id);

  const stmt = db.prepare(
    `UPDATE databases SET ${updates.join(", ")} WHERE id = ?`,
  );
  stmt.run(...values);

  return getDatabaseById(input.id)!;
}

export function deleteDatabase(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare("DELETE FROM databases WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}

export function updateDatabaseStatus(
  id: string,
  status: DatabaseInstance["status"],
  containerId?: string,
): DatabaseInstance {
  const db = getDatabase();

  const existing = getDatabaseById(id);
  if (!existing) {
    throw new Error("Database not found");
  }

  const updates = ["status = ?", "updated_at = ?"];
  const values: any[] = [status, new Date().toISOString()];

  if (containerId !== undefined) {
    updates.push("container_id = ?");
    values.push(containerId);
  }

  values.push(id);

  const stmt = db.prepare(
    `UPDATE databases SET ${updates.join(", ")} WHERE id = ?`,
  );
  stmt.run(...values);

  return getDatabaseById(id)!;
}
