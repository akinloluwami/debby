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
    }),
  )
  .all("/trpc/*", async (context) => {
    const res = await fetchRequestHandler({
      endpoint: "/trpc",
      router: appRouter,
      req: context.request,
      createContext: () => createContext({ context }),
    });
    return res;
  })
  .get("/", () => "OK")
  .listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
  });
