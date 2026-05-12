import mysql from "mysql2/promise";
import pg from "pg";
import { decryptSecret } from "./crypto";
import type { DatabaseConnectionRecord } from "./database";

const { Client } = pg;

export type DatabaseType = "postgres" | "mysql";

export type ConnectionInput = {
  type: DatabaseType;
  name: string;
  host: string;
  port: number;
  databaseName: string;
  username: string;
  password: string;
  sslEnabled: boolean;
};

export type PublicDatabaseConnection = {
  id: string;
  type: DatabaseType;
  name: string;
  host: string;
  port: number;
  databaseName: string;
  username: string;
  sslEnabled: boolean;
  lastTestedAt: string | null;
  lastStatus: "success" | "failed" | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toPublicConnection(record: DatabaseConnectionRecord): PublicDatabaseConnection {
  return {
    id: record.id,
    type: record.type,
    name: record.name,
    host: record.host,
    port: record.port,
    databaseName: record.database_name,
    username: record.username,
    sslEnabled: record.ssl_enabled === 1,
    lastTestedAt: record.last_tested_at,
    lastStatus: record.last_status,
    lastError: record.last_error,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export function recordToConnectionInput(record: DatabaseConnectionRecord): ConnectionInput {
  return {
    type: record.type,
    name: record.name,
    host: record.host,
    port: record.port,
    databaseName: record.database_name,
    username: record.username,
    password: decryptSecret(record.encrypted_password),
    sslEnabled: record.ssl_enabled === 1
  };
}

export async function testDatabaseConnection(input: ConnectionInput) {
  if (input.type === "postgres") {
    const client = new Client({
      host: input.host,
      port: input.port,
      database: input.databaseName,
      user: input.username,
      password: input.password,
      ssl: input.sslEnabled ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 5000,
      query_timeout: 5000
    });

    try {
      await client.connect();
      await client.query("select 1");
    } finally {
      await client.end().catch(() => undefined);
    }

    return;
  }

  const connection = await mysql.createConnection({
    host: input.host,
    port: input.port,
    database: input.databaseName,
    user: input.username,
    password: input.password,
    ssl: input.sslEnabled ? {} : undefined,
    connectTimeout: 5000
  });

  try {
    await connection.query("select 1");
  } finally {
    await connection.end().catch(() => undefined);
  }
}

export function normalizeConnectionInput(input: ConnectionInput): ConnectionInput {
  return {
    ...input,
    name: input.name.trim(),
    host: input.host.trim(),
    databaseName: input.databaseName.trim(),
    username: input.username.trim()
  };
}

export function getConnectionErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to connect to database.";
}
