import "dotenv/config";
import { node } from "@elysiajs/node";
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { createContext } from "@debby/api/context";
import { appRouter } from "@debby/api/routers/index";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { migrateToSQLite } from "@debby/api/utils/migrate-to-sqlite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Auto-migrate JSON data to SQLite if JSON files exist
const DATA_DIR =
  process.env.DATA_DIR || path.join(__dirname, "../../../packages/data");
const DATABASES_FILE = path.join(DATA_DIR, "databases.json");
const PASSWORD_FILE = path.join(DATA_DIR, "master-password.json");

if (fs.existsSync(DATABASES_FILE) || fs.existsSync(PASSWORD_FILE)) {
  console.log(
    "Detected JSON data files, running automatic migration to SQLite...",
  );
  try {
    migrateToSQLite();
  } catch (error) {
    console.error("Auto-migration failed:", error);
    console.error("You can manually run: npm run migrate");
  }
}

new Elysia({ adapter: node() })
  .use(
    cors({
      origin: process.env.CORS_ORIGIN || "",
      methods: ["GET", "POST", "OPTIONS"],
      credentials: true,
    }),
  )
  .all("/trpc/*", async (context) => {
    const res = await fetchRequestHandler({
      endpoint: "/trpc",
      router: appRouter,
      req: context.request,
      createContext: () => createContext({ context }),
      responseMeta(opts) {
        const { data } = opts;
        const headers: Record<string, string> = {};

        if (data) {
          for (const result of data) {
            if (
              "result" in result &&
              result.result &&
              "data" in result.result
            ) {
              const resultData = result.result.data as any;

              if (resultData?.sessionToken && resultData?.expiresAt) {
                const expires = new Date(resultData.expiresAt);
                headers["Set-Cookie"] =
                  `session=${resultData.sessionToken}; Path=/; HttpOnly; SameSite=Strict; Expires=${expires.toUTCString()}`;
              }

              if (
                resultData?.success &&
                resultData?.message === "Logged out successfully"
              ) {
                headers["Set-Cookie"] =
                  "session=; Path=/; HttpOnly; SameSite=Strict; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
              }
            }
          }
        }

        return { headers };
      },
    });
    return res;
  })
  .get("/", () => "OK")
  .listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
  });
