import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { getEnv } from "fastedge::env";
import { getStrategy } from "./strategy";
import { verifySsoToken } from "./sso.js";

export type { AuthEnv } from "./types";

// Single global auth middleware. Two paths:
//   1. Local credential — the active strategy's own cookie (local login).
//   2. SSO direct verify — if JWKS_URL is set, verify the upstream sso_session
//      JWT on each request. No secondary credential is minted; the SSO session
//      IS the session (matches the Cloudflare Access model).
export async function auth(c: Context, next: Next): Promise<void> {
  const strategy = getStrategy();
  let user = await strategy.authenticate(c);
  if (!user) user = await ssoVerify(c);
  if (user) c.set("user", user);
  await next();
}

async function ssoVerify(c: Context): Promise<string | null> {
  const jwksUrl = getEnv("JWKS_URL");
  if (!jwksUrl) return null;
  const ssoCookieName = getEnv("SESSION_COOKIE") ?? "sso_session";
  const ssoToken = getCookie(c, ssoCookieName);
  if (!ssoToken) return null;
  // NOTE: jose's createRemoteJWKSet caches the JWK in module memory, but
  // FastEdge WASM runs each request in a fresh sandbox with no shared memory,
  // so the JWK is fetched on every request here. A real customer's origin
  // (Node, Go, etc.) runs long-lived processes where the cache is effective.
  // This demo does not optimise for it — the fixture shows the pattern, not
  // the performance profile.
  const identity = await verifySsoToken(ssoToken, jwksUrl);
  if (!identity) return null;
  return identity.name ?? identity.email ?? identity.sub;
}

export async function attemptLogin(
  username: string,
  password: string,
  c: Context,
): Promise<boolean> {
  const strategy = getStrategy();
  if (!strategy.localLogin) return false;
  if (!checkPassword(username, password)) return false;
  return strategy.issue(c, username);
}

export async function doLogout(c: Context): Promise<void> {
  await getStrategy().revoke(c);
}

// Check username/password without issuing a credential. Exported so that
// routes which need to hand off to a second factor (mfa-filtered, mfa-verify)
// can validate the password before calling strategy.startSecondFactor.
export function checkPassword(username: string, password: string): boolean {
  if (!username) return false;
  const expected = getEnv("PASSWORD") ?? "authme";
  return timingSafeEqual(password, expected);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
