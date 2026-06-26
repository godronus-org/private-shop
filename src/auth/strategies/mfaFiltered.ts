import { getEnv } from "fastedge::env";
import { getSecret } from "fastedge::secret";
import { sign } from "hono/jwt";
import type { Context } from "hono";
import { cookieJwtStrategy } from "./cookieJwt";
import { configError } from "../errors";
import type { AuthStrategy } from "../types";

// Profile A: totp-app Rust filter enforces MFA via mfa_session cookie.
// The origin issues auth_token immediately after password (identity), but the
// filter blocks every protected path until mfa_session is also present.
// A pre-MFA auth_token grants nothing on its own — the filter is the gate.
//
// Delegates authenticate / issue / revoke to cookieJwtStrategy.
// Adds startSecondFactor (called by POST /login instead of plain issue+redirect)
// and the /mfa/start handler (registered in index.tsx).

async function buildHandoffTicket(sub: string, next: string): Promise<string> {
  const handoffKey = getSecret("HANDOFF_KEY");
  if (!handoffKey) throw new Error("HANDOFF_KEY not configured");
  const ttl = parseInt(getEnv("TICKET_TTL") ?? "90", 10);
  const now = Math.floor(Date.now() / 1000);
  return sign({ sub, next, iat: now, exp: now + ttl }, handoffKey, "HS256");
}

export const mfaFilteredStrategy: AuthStrategy = {
  localLogin: true,
  sessionAdmin: false,

  authenticate(c) {
    return cookieJwtStrategy.authenticate(c);
  },

  issue(c, user) {
    return cookieJwtStrategy.issue(c, user);
  },

  revoke(c) {
    return cookieJwtStrategy.revoke(c);
  },

  logoutRedirectUrl() {
    const challengeUrl = getEnv("TOTP_CHALLENGE_URL");
    if (!challengeUrl) return "/";
    const logoutPath = new URL(challengeUrl).pathname.replace(/\/[^/]*$/, "/logout");
    return `${logoutPath}?redirect=/`;
  },

  async startSecondFactor(c: Context, user: string, next: string): Promise<Response> {
    const totpChallengeUrl = getEnv("TOTP_CHALLENGE_URL");
    if (!totpChallengeUrl) return configError(c, "TOTP_CHALLENGE_URL not set");

    // Issue auth_token immediately — the filter blocks until mfa_session also exists.
    const issued = await cookieJwtStrategy.issue(c, user);
    if (!issued) return configError(c, "SESSION_SECRET not set");

    let ticket: string;
    try {
      ticket = await buildHandoffTicket(user, next || "/");
    } catch {
      return configError(c, "HANDOFF_KEY not set");
    }

    return c.redirect(`${totpChallengeUrl}?t=${encodeURIComponent(ticket)}`, 303);
  },
};

// Handler body for GET /mfa/start (registered unconditionally in index.tsx).
// The totp-app filter redirects here (with ?redirect=<original>) when mfa_session
// has expired. If auth_token is valid we mint a fresh ticket → 303 to edge
// (no re-password). Otherwise redirect to /login.
export async function handleMfaStart(c: Context): Promise<Response> {
  const totpChallengeUrl = getEnv("TOTP_CHALLENGE_URL");
  if (!totpChallengeUrl) return configError(c, "TOTP_CHALLENGE_URL not set");

  const redirect = c.req.query("redirect") || "/";
  const user = c.get("user");

  if (user) {
    // auth_token is valid — sign a fresh ticket so the user goes straight to TOTP
    // without re-entering their password.
    let ticket: string;
    try {
      ticket = await buildHandoffTicket(user, redirect);
    } catch {
      return configError(c, "HANDOFF_KEY not set");
    }
    return c.redirect(`${totpChallengeUrl}?t=${encodeURIComponent(ticket)}`, 303);
  }

  // No valid auth_token — fall back to full login.
  const loginNext = encodeURIComponent(redirect);
  return c.redirect(`/login?next=${loginNext}`, 302);
}
