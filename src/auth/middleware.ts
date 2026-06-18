import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { getEnv } from "fastedge::env";
import { getStrategy } from "./strategy";
import { verifySsoToken } from "./sso.js";
import type { AuthStrategy } from "./types";

export type { AuthEnv } from "./types";

// Single global auth middleware. Runs on every route so navigation can show the
// logged-in username. Two steps:
//   1. Fast path — resolve the origin's own credential via the active strategy.
//   2. SSO bootstrap — if there's no local credential but an upstream sso_session
//      cookie is present, verify it via JWKS once and exchange it for an origin
//      credential, so subsequent requests use the fast path without re-fetching
//      JWKS. Cookie modes only; header-trust mode has no credential to issue.
export async function auth(c: Context, next: Next): Promise<void> {
  const strategy = getStrategy();
  let user = await strategy.authenticate(c);
  if (!user && strategy.localLogin) {
    user = await ssoBootstrap(c, strategy);
  }
  if (user) c.set("user", user);
  await next();
}

async function ssoBootstrap(c: Context, strategy: AuthStrategy): Promise<string | null> {
  const jwksUrl = getEnv("JWKS_URL");
  if (!jwksUrl) return null;
  const ssoCookieName = getEnv("SESSION_COOKIE") ?? "sso_session";
  const ssoToken = getCookie(c, ssoCookieName);
  if (!ssoToken) return null;
  const identity = await verifySsoToken(ssoToken, jwksUrl);
  if (!identity) return null;
  // Prefer a human-readable display name over the raw SSO subject ID.
  const displayName = identity.name ?? identity.email ?? identity.sub;
  const issued = await strategy.issue(c, displayName);
  return issued ? displayName : null;
}

export async function attemptLogin(
  username: string,
  password: string,
  c: Context,
): Promise<boolean> {
  const strategy = getStrategy();
  if (!strategy.localLogin) return false;
  const expected = getEnv("PASSWORD") ?? "authme";
  if (!username || !timingSafeEqual(password, expected)) return false;
  return strategy.issue(c, username);
}

export async function doLogout(c: Context): Promise<void> {
  await getStrategy().revoke(c);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
