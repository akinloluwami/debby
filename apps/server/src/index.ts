import cors from "@elysiajs/cors";
import { Elysia, t } from "elysia";
import {
  clearSessionCookie,
  createSession,
  createSessionCookie,
  getAuthState,
  getSessionId,
  hashPassword,
  verifyPassword
} from "./auth";
import {
  getConnectionErrorMessage,
  normalizeConnectionInput,
  recordToConnectionInput,
  testDatabaseConnection,
  toPublicConnection,
  type ConnectionInput
} from "./connections";
import { config, isAllowedCorsOrigin, requireAppSecret } from "./config";
import { encryptSecret } from "./crypto";
import { queries } from "./database";

requireAppSecret();
queries.pruneSessions.run();

const passwordBody = t.Object({
  password: t.String({ minLength: 8 })
});

const connectionType = t.Union([t.Literal("postgres"), t.Literal("mysql")]);

const connectionBody = t.Object({
  type: connectionType,
  name: t.String({ minLength: 1 }),
  host: t.String({ minLength: 1 }),
  port: t.Number({ minimum: 1, maximum: 65535 }),
  databaseName: t.String({ minLength: 1 }),
  username: t.String({ minLength: 1 }),
  password: t.String({ minLength: 1 }),
  sslEnabled: t.Boolean()
});

function ensureAuthenticated(request: Request, set: { status?: unknown }) {
  const state = getAuthState(getSessionId(request.headers));

  if (!state.authenticated) {
    set.status = 401;
    return false;
  }

  return true;
}

function validateConnectionInput(input: ConnectionInput) {
  const normalized = normalizeConnectionInput(input);

  if (!normalized.name || !normalized.host || !normalized.databaseName || !normalized.username) {
    return {
      error: "Name, host, database, and username are required."
    };
  }

  return { input: normalized };
}

const app = new Elysia()
  .use(
    cors({
      origin: isAllowedCorsOrigin,
      credentials: true,
      allowedHeaders: ["Content-Type"],
      methods: ["GET", "POST", "DELETE", "OPTIONS"]
    })
  )
  .get("/health", () => ({
    ok: true,
    service: "debby-server"
  }))
  .get("/api/auth/state", ({ request }) => {
    const sessionId = getSessionId(request.headers);

    return getAuthState(sessionId);
  })
  .post(
    "/api/setup",
    async ({ body, request, set }) => {
      const existing = queries.getAdminUser.get();

      if (existing) {
        set.status = 409;
        return { error: "Setup has already been completed." };
      }

      const passwordHash = await hashPassword(body.password);

      queries.createAdminUser.run(passwordHash);

      const sessionId = createSession("admin");
      set.headers["Set-Cookie"] = createSessionCookie(sessionId);

      return {
        setupRequired: false,
        authenticated: true
      };
    },
    { body: passwordBody }
  )
  .post(
    "/api/login",
    async ({ body, set }) => {
      const admin = queries.getAdminUser.get();

      if (!admin) {
        set.status = 409;
        return { error: "Setup is required before login." };
      }

      const validPassword = await verifyPassword(body.password, admin.password_hash);

      if (!validPassword) {
        set.status = 401;
        return { error: "Invalid password." };
      }

      const sessionId = createSession(admin.id);
      set.headers["Set-Cookie"] = createSessionCookie(sessionId);

      return {
        setupRequired: false,
        authenticated: true
      };
    },
    { body: passwordBody }
  )
  .post("/api/logout", ({ request, set }) => {
    const sessionId = getSessionId(request.headers);

    if (sessionId) {
      queries.deleteSession.run(sessionId);
    }

    set.headers["Set-Cookie"] = clearSessionCookie();

    return { authenticated: false };
  })
  .get("/api/me", ({ request, set }) => {
    const state = getAuthState(getSessionId(request.headers));

    if (!state.authenticated) {
      set.status = 401;
      return { error: "Unauthorized." };
    }

    return { id: "admin" };
  })
  .get("/api/databases", ({ request, set }) => {
    if (!ensureAuthenticated(request, set)) {
      return { error: "Unauthorized." };
    }

    return {
      databases: queries.listDatabaseConnections.all().map(toPublicConnection)
    };
  })
  .post(
    "/api/databases/test",
    async ({ body, request, set }) => {
      if (!ensureAuthenticated(request, set)) {
        return { error: "Unauthorized." };
      }

      const validation = validateConnectionInput(body);

      if ("error" in validation) {
        set.status = 400;
        return { error: validation.error };
      }

      try {
        await testDatabaseConnection(validation.input);
        return { ok: true };
      } catch (error) {
        set.status = 400;
        return {
          ok: false,
          error: getConnectionErrorMessage(error)
        };
      }
    },
    { body: connectionBody }
  )
  .post(
    "/api/databases",
    async ({ body, request, set }) => {
      if (!ensureAuthenticated(request, set)) {
        return { error: "Unauthorized." };
      }

      const validation = validateConnectionInput(body);

      if ("error" in validation) {
        set.status = 400;
        return { error: validation.error };
      }

      const connection = validation.input;
      const id = crypto.randomUUID();

      try {
        await testDatabaseConnection(connection);
        queries.createDatabaseConnection.run(
          id,
          connection.type,
          connection.name,
          connection.host,
          connection.port,
          connection.databaseName,
          connection.username,
          encryptSecret(connection.password),
          connection.sslEnabled ? 1 : 0
        );
        queries.updateDatabaseConnectionTestStatus.run("success", null, id);

        const record = queries.getDatabaseConnection.get(id);

        return { database: record ? toPublicConnection(record) : null };
      } catch (error) {
        set.status = 400;
        return {
          error: getConnectionErrorMessage(error)
        };
      }
    },
    { body: connectionBody }
  )
  .post("/api/databases/:id/test", async ({ params, request, set }) => {
    if (!ensureAuthenticated(request, set)) {
      return { error: "Unauthorized." };
    }

    const record = queries.getDatabaseConnection.get(params.id);

    if (!record) {
      set.status = 404;
      return { error: "Database connection not found." };
    }

    try {
      await testDatabaseConnection(recordToConnectionInput(record));
      queries.updateDatabaseConnectionTestStatus.run("success", null, record.id);
      return { ok: true };
    } catch (error) {
      const message = getConnectionErrorMessage(error);
      queries.updateDatabaseConnectionTestStatus.run("failed", message, record.id);
      set.status = 400;
      return { ok: false, error: message };
    }
  })
  .delete("/api/databases/:id", ({ params, request, set }) => {
    if (!ensureAuthenticated(request, set)) {
      return { error: "Unauthorized." };
    }

    const record = queries.getDatabaseConnection.get(params.id);

    if (!record) {
      set.status = 404;
      return { error: "Database connection not found." };
    }

    queries.deleteDatabaseConnection.run(record.id);

    return { ok: true };
  })
  .listen(config.port);

console.log(`Debby API listening on http://localhost:${app.server?.port}`);
