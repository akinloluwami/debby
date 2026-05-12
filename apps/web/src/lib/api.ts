const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4466";

type ApiError = {
  error?: string;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers
    },
    ...options
  });

  const data = (await response.json()) as T & ApiError;

  if (!response.ok) {
    throw new Error(data.error ?? "Request failed.");
  }

  return data;
}

export type AuthState = {
  setupRequired: boolean;
  authenticated: boolean;
};

export function getAuthState() {
  return request<AuthState>("/api/auth/state");
}

export function setup(password: string) {
  return request<AuthState>("/api/setup", {
    method: "POST",
    body: JSON.stringify({ password })
  });
}

export function login(password: string) {
  return request<AuthState>("/api/login", {
    method: "POST",
    body: JSON.stringify({ password })
  });
}

export function logout() {
  return request<{ authenticated: false }>("/api/logout", {
    method: "POST"
  });
}

export type DatabaseType = "postgres" | "mysql";

export type DatabaseConnection = {
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

export type DatabaseConnectionInput = {
  type: DatabaseType;
  name: string;
  host: string;
  port: number;
  databaseName: string;
  username: string;
  password: string;
  sslEnabled: boolean;
};

export function listDatabases() {
  return request<{ databases: DatabaseConnection[] }>("/api/databases");
}

export function testDatabaseConnection(input: DatabaseConnectionInput) {
  return request<{ ok: true }>("/api/databases/test", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function createDatabaseConnection(input: DatabaseConnectionInput) {
  return request<{ database: DatabaseConnection }>("/api/databases", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function deleteDatabaseConnection(id: string) {
  return request<{ ok: true }>(`/api/databases/${id}`, {
    method: "DELETE"
  });
}
