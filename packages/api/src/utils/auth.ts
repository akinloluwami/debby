import bcrypt from "bcrypt";
import { getDatabase } from "./database.js";
import { randomBytes } from "crypto";

const SALT_ROUNDS = 10;
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

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

// Session management
export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function createSession(): {
  id: string;
  token: string;
  expiresAt: Date;
} {
  const db = getDatabase();
  const id = randomBytes(16).toString("hex");
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION);
  const createdAt = new Date().toISOString();

  // Clean up expired sessions before creating a new one
  cleanupExpiredSessions();

  const stmt = db.prepare(
    "INSERT INTO sessions (id, token, expires_at, created_at) VALUES (?, ?, ?, ?)",
  );
  stmt.run(id, token, expiresAt.toISOString(), createdAt);

  return { id, token, expiresAt };
}

export function validateSessionToken(token: string): boolean {
  if (!token) {
    return false;
  }

  const db = getDatabase();
  const stmt = db.prepare(
    "SELECT id, expires_at FROM sessions WHERE token = ?",
  );
  const row = stmt.get(token) as { id: string; expires_at: string } | undefined;

  if (!row) {
    return false;
  }

  const expiresAt = new Date(row.expires_at);
  const now = new Date();

  if (expiresAt < now) {
    // Session expired, delete it
    deleteSession(token);
    return false;
  }

  return true;
}

export function deleteSession(token: string): void {
  const db = getDatabase();
  const stmt = db.prepare("DELETE FROM sessions WHERE token = ?");
  stmt.run(token);
}

export function cleanupExpiredSessions(): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  const stmt = db.prepare("DELETE FROM sessions WHERE expires_at < ?");
  stmt.run(now);
}
