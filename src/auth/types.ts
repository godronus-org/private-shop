import type { Context } from "hono";

export type AuthEnv = { Variables: { user: string } };

// One strategy per AUTH_MODE. The middleware and the /login route call this
// contract; all the variation between the JWT, session, and header-trust
// integrations lives behind it.
export interface AuthStrategy {
  // Resolve the request's own origin credential to a username, or null.
  // (Fast path — must not touch the upstream SSO cookie.)
  authenticate(c: Context): Promise<string | null>;
  // Issue the origin credential after a successful local login or SSO
  // bootstrap. Returns false if the mode cannot issue (misconfigured, or the
  // edge owns the credential), so callers don't claim a login that didn't take.
  issue(c: Context, user: string): Promise<boolean>;
  // Clear the origin credential (logout).
  revoke(c: Context): Promise<void>;
  // Does this mode accept the local /login form? (false for header-trust mode.)
  readonly localLogin: boolean;
  // Does this mode expose the /manage-sessions admin surface?
  readonly sessionAdmin: boolean;
  // If present, this strategy requires a second factor. POST /login returns this
  // Response instead of issue()+redirect; the strategy issues auth_token at the
  // correct time (immediately for mfa-filtered, after proof return for mfa-verify).
  startSecondFactor?(c: Context, user: string, next: string): Promise<Response>;
  // If present, the sign-out handler redirects here (instead of /auth/logout)
  // so edge-issued cookies (mfa_session, mfa_proof) are also cleared.
  logoutRedirectUrl?(): string;
}
