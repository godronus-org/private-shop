import { getEnv } from "fastedge::env";
import type { AuthStrategy } from "../types";

// Trusted-header mode (IAP / oauth2-proxy style): the edge has already
// authenticated the user and injects their identity as a request header.
// The origin trusts it directly — there is no origin-side credential, so there
// is nothing to issue or revoke and no local /login. AUTH_HEADER overrides the
// identity header (default X-Forwarded-User; typically carries the stable sub).
// DISPLAY_HEADER overrides the display-name header (default x-sso-name); falls
// back to the AUTH_HEADER value so plain X-Forwarded-User deployments still work.
//
// SECURITY: only safe when the origin is reachable solely via the trusted edge,
// which must strip any client-supplied copy of this header. This is a demo
// fixture; a real deployment would also pin the edge's identity.
export const headersStrategy: AuthStrategy = {
  localLogin: false,
  sessionAdmin: false,

  async authenticate(c) {
    const authHeader = getEnv("AUTH_HEADER") ?? "X-Forwarded-User";
    const sub = c.req.header(authHeader);
    if (!sub || sub.length === 0) return null;
    const displayHeader = getEnv("DISPLAY_HEADER") ?? "x-sso-name";
    const display = c.req.header(displayHeader);
    return display && display.length > 0 ? display : sub;
  },

  async issue() {
    // The edge owns the credential; the origin cannot mint one.
    return false;
  },

  async revoke() {
    // No origin-side credential to clear.
  },
};
