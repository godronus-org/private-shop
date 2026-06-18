import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { getEnv } from "fastedge::env";
import { mintToken, verifyToken, AUTH_COOKIE, TOKEN_MAX_AGE } from "../jwt";
import type { AuthStrategy } from "../types";

// Stateless HMAC JWT in an HttpOnly cookie (hono/jwt, HS256). Requires
// SESSION_SECRET; the cookie is self-contained so there is no server-side store.
export const cookieJwtStrategy: AuthStrategy = {
  localLogin: true,
  sessionAdmin: false,

  async authenticate(c) {
    const secret = getEnv("SESSION_SECRET");
    const token = getCookie(c, AUTH_COOKIE);
    if (token && secret) return verifyToken(token, secret);
    return null;
  },

  async issue(c, user) {
    const secret = getEnv("SESSION_SECRET");
    if (!secret) return false;
    const token = await mintToken(user, secret);
    setCookie(c, AUTH_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/",
      maxAge: TOKEN_MAX_AGE,
    });
    return true;
  },

  async revoke(c) {
    deleteCookie(c, AUTH_COOKIE, { path: "/" });
  },
};
