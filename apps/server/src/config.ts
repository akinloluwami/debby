const defaultCorsOrigins = ["http://localhost:4366", "http://localhost:4367"];

export const config = {
  port: Number(process.env.PORT ?? 4466),
  corsOrigins: (process.env.CORS_ORIGIN ?? defaultCorsOrigins.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  dataDir: process.env.DATA_DIR ?? "./data",
  appSecret:
    process.env.APP_SECRET ??
    (process.env.NODE_ENV === "production" ? undefined : "development-only-secret-change-before-production"),
  sessionCookieName: "debby_session",
  sessionDays: 14
};

export function isAllowedCorsOrigin(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin) return true;

  if (config.corsOrigins.includes(origin)) {
    return true;
  }

  if (process.env.NODE_ENV !== "production") {
    return /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  }

  return false;
}

export function requireAppSecret() {
  const secret = config.appSecret;

  if (!secret || secret.length < 32) {
    throw new Error("APP_SECRET must be set and at least 32 characters long.");
  }

  return secret;
}
