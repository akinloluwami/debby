import bcrypt from "bcrypt";
import { getDatabase } from "./database.js";

const SALT_ROUNDS = 10;

export function isMasterPasswordConfigured(): boolean {
  const db = getDatabase();
  const stmt = db.prepare("SELECT id FROM master_password WHERE id = 1");
  const row = stmt.get();
  return row !== undefined;
}

export async function setMasterPassword(password: string): Promise<void> {
  if (isMasterPasswordConfigured()) {
    throw new Error("Master password is already configured");
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const createdAt = new Date().toISOString();

  const db = getDatabase();
  const stmt = db.prepare(
    "INSERT INTO master_password (id, hash, created_at) VALUES (1, ?, ?)",
  );
  stmt.run(hash, createdAt);
}

export async function verifyMasterPassword(password: string): Promise<boolean> {
  if (!isMasterPasswordConfigured()) {
    return false;
  }

  const db = getDatabase();
  const stmt = db.prepare("SELECT hash FROM master_password WHERE id = 1");
  const row = stmt.get() as { hash: string } | undefined;

  if (!row) {
    return false;
  }

  return await bcrypt.compare(password, row.hash);
}

export function getMasterPasswordHash(): string | null {
  if (!isMasterPasswordConfigured()) {
    return null;
  }

  const db = getDatabase();
  const stmt = db.prepare("SELECT hash FROM master_password WHERE id = 1");
  const row = stmt.get() as { hash: string } | undefined;

  return row ? row.hash : null;
}
