import { config } from "./config";
import { queries } from "./database";

export type AuthState = {
  setupRequired: boolean;
  authenticated: boolean;
};

export function getAuthState(sessionId?: string): AuthState {
  const admin = queries.getAdminUser.get();

  if (!admin) {
    return { setupRequired: true, authenticated: false };
  }

  if (!sessionId) {
    return { setupRequired: false, authenticated: false };
  }

  const session = queries.getSession.get(sessionId);

  return {
    setupRequired: false,
    authenticated: Boolean(session)
  };
}

export function parseCookie(header: string | null, name: string) {
  if (!header) return undefined;

  const cookies = header.split(";").map((part) => part.trim());

  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.split("=");

    if (key === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return undefined;
}

export function createSessionCookie(sessionId: string) {
  const maxAge = config.sessionDays * 24 * 60 * 60;

  return `${config.sessionCookieName}=${encodeURIComponent(
    sessionId
  )}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return `${config.sessionCookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

export function getSessionId(headers: Headers) {
  return parseCookie(headers.get("cookie"), config.sessionCookieName);
}

export async function hashPassword(password: string) {
  return Bun.password.hash(password, {
    algorithm: "argon2id",
    memoryCost: 19456,
    timeCost: 2
  });
}

export function verifyPassword(password: string, hash: string) {
  return Bun.password.verify(password, hash);
}

export function createSession(userId: string) {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + config.sessionDays * 24 * 60 * 60 * 1000).toISOString();

  queries.createSession.run(sessionId, userId, expiresAt);

  return sessionId;
}
