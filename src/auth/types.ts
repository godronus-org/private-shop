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
}
