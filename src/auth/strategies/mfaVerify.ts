import { getEnv } from "fastedge::env";
import { getSecret } from "fastedge::secret";
import { sign } from "hono/jwt";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Context } from "hono";
import { cookieJwtStrategy } from "./cookieJwt";
import { verifyMfaProof } from "../sso";
import { getStrategy } from "../strategy";
import { configError } from "../errors";
import type { AuthStrategy } from "../types";

// Profile B: no filter. The edge issues a one-time ES256 mfa_proof cookie;
// the origin verifies it via JWKS then mints auth_token.
// auth_token is deliberately NOT issued until the proof is verified — without a
// filter to gate protected paths, issuing early would bypass MFA entirely.
//
// Delegates authenticate / issue / revoke to cookieJwtStrategy.
// Adds startSecondFactor (called by POST /login instead of plain issue+redirect)
// and the /mfa/return handler (registered in index.tsx).

const PRE_MFA_COOKIE = "pre_mfa";

async function buildHandoffTicket(sub: string, next: string): Promise<string> {
  const handoffKey = getSecret("HANDOFF_KEY");
  if (!handoffKey) throw new Error("HANDOFF_KEY not configured");
  const ttl = parseInt(getEnv("TICKET_TTL") ?? "90", 10);
  const now = Math.floor(Date.now() / 1000);
  return sign({ sub, next, iat: now, exp: now + ttl }, handoffKey, "HS256");
}

export const mfaVerifyStrategy: AuthStrategy = {
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

    // Set a short-lived pre_mfa marker — NOT auth_token. The marker carries the
    // username so /mfa/return can bind the proof to the right subject.
    setCookie(c, PRE_MFA_COOKIE, user, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/",
      maxAge: 300, // 5 minutes — enough for the TOTP round-trip
    });

    // The ticket's `next` points back to /mfa/return so totp-app redirects here
    // after a successful TOTP verify, carrying the mfa_proof cookie.
    const returnNext = encodeURIComponent(next || "/");
    const ticketNext = `/mfa/return?next=${returnNext}`;

    let ticket: string;
    try {
      ticket = await buildHandoffTicket(user, ticketNext);
    } catch {
      return configError(c, "HANDOFF_KEY not set");
    }

    return c.redirect(`${totpChallengeUrl}?t=${encodeURIComponent(ticket)}`, 303);
  },
};

// Handler body for GET /mfa/return (registered unconditionally in index.tsx).
// totp-app redirects here after issuing an mfa_proof cookie. We verify the
// proof, clear the temporary cookies, then issue auth_token and redirect to next.
export async function handleMfaReturn(c: Context): Promise<Response> {
  const next = c.req.query("next") || "/";

  const preMfa = getCookie(c, PRE_MFA_COOKIE);
  const mfaProofCookieName = getEnv("MFA_PROOF_COOKIE") ?? "mfa_proof";
  const proof = getCookie(c, mfaProofCookieName);

  if (!preMfa || !proof) {
    const loginNext = encodeURIComponent(next);
    return c.redirect(`/login?next=${loginNext}`, 302);
  }

  const jwksUrl = getEnv("TOTP_JWKS_URL");
  if (!jwksUrl) return configError(c, "TOTP_JWKS_URL not set");

  const verified = await verifyMfaProof(proof, jwksUrl, preMfa);
  if (!verified) {
    // Proof invalid — clear the marker and send back to login with error signal.
    deleteCookie(c, PRE_MFA_COOKIE, { path: "/" });
    const loginNext = encodeURIComponent(next);
    return c.redirect(`/login?next=${loginNext}&error=mfa_failed`, 302);
  }

  // Proof verified — clear temporary cookies and issue the real session.
  deleteCookie(c, PRE_MFA_COOKIE, { path: "/" });
  deleteCookie(c, mfaProofCookieName, { path: "/" });

  await getStrategy().issue(c, verified.sub);
  return c.redirect(next, 302);
}
