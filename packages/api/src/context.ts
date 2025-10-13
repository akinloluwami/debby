import type { Context as ElysiaContext } from "elysia";
import { validateSessionToken } from "./utils/auth.js";

export type CreateContextOptions = {
  context: ElysiaContext;
};

export async function createContext({ context }: CreateContextOptions) {
  const cookieHeader = context.request.headers.get("cookie");
  let sessionToken: string | null = null;

  if (cookieHeader) {
    const cookies = cookieHeader.split(";").map((c) => c.trim());
    const sessionCookie = cookies.find((c) => c.startsWith("session="));
    if (sessionCookie) {
      sessionToken = sessionCookie.split("=")[1] || null;
    }
  }

  const isAuthenticated = sessionToken
    ? validateSessionToken(sessionToken)
    : false;

  return {
    isAuthenticated,
    sessionToken,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
