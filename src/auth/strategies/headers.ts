import { getEnv } from "fastedge::env";
import type { AuthStrategy } from "../types";

// Trusted-header mode (IAP / oauth2-proxy style): the edge has already
// authenticated the user and injects their identity as a request header.
// The origin trusts it directly — there is no origin-side credential, so there
// is nothing to issue or revoke and no local /login. AUTH_HEADER overrides the
// header name (default X-Forwarded-User).
//
// SECURITY: only safe when the origin is reachable solely via the trusted edge,
// which must strip any client-supplied copy of this header. This is a demo
// fixture; a real deployment would also pin the edge's identity.
export const headersStrategy: AuthStrategy = {
  localLogin: false,
  sessionAdmin: false,

  async authenticate(c) {
    const headerName = getEnv("AUTH_HEADER") ?? "X-Forwarded-User";
    const user = c.req.header(headerName);
    return user && user.length > 0 ? user : null;
  },

  async issue() {
    // The edge owns the credential; the origin cannot mint one.
    return false;
  },

  async revoke() {
    // No origin-side credential to clear.
  },
};
