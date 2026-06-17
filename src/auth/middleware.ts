import type { Context, Next } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { getEnv } from "fastedge::env";
import { mintToken, verifyToken, AUTH_COOKIE, TOKEN_MAX_AGE } from "./jwt";
import { verifySsoToken } from "./sso.js";

export type AuthEnv = { Variables: { user: string } };

// Fast path only: verifies own auth_token. Runs on every route so nav can
// show the logged-in username. Never touches the SSO cookie.
export async function jwtAuth(c: Context, next: Next): Promise<void> {
  const secret = getEnv("SESSION_SECRET");
  const ownToken = getCookie(c, AUTH_COOKIE);
  if (ownToken && secret) {
    const username = await verifyToken(ownToken, secret);
    if (username) {
      c.set("user", username);
    }
  }
  await next();
}

// SSO bootstrap: run only on routes protected by the CDN filter (/checkout).
// Verifies sso_session via JWKS and mints own auth_token so subsequent
// requests use the fast path above without a further JWKS fetch.
export async function ssoBootstrap(c: Context, next: Next): Promise<void> {
  if (c.get("user")) return next();
  const secret = getEnv("SESSION_SECRET");
  const jwksUrl = getEnv("JWKS_URL");
  if (jwksUrl && secret) {
    const ssoCookieName = getEnv("SESSION_COOKIE") ?? "sso_session";
    const ssoToken = getCookie(c, ssoCookieName);
    if (ssoToken) {
      const identity = await verifySsoToken(ssoToken, jwksUrl);
      if (identity) {
        // Prefer a human-readable display name over the raw SSO subject ID
        const displayName = identity.name ?? identity.email ?? identity.sub;
        const newToken = await mintToken(displayName, secret);
        setCookie(c, AUTH_COOKIE, newToken, {
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
          path: "/",
          maxAge: TOKEN_MAX_AGE,
        });
        c.set("user", displayName);
      }
    }
  }
  await next();
}

export async function attemptLogin(
  username: string,
  password: string,
  c: Context,
): Promise<boolean> {
  const expected = getEnv("PASSWORD") ?? "authme";
  if (!username || !timingSafeEqual(password, expected)) return false;
  const secret = getEnv("SESSION_SECRET");
  if (!secret) return false;
  const token = await mintToken(username, secret);
  setCookie(c, AUTH_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: TOKEN_MAX_AGE,
  });
  return true;
}

export function doLogout(c: Context): void {
  deleteCookie(c, AUTH_COOKIE, { path: "/" });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
