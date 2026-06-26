import { getAuthMode } from "./mode";
import type { AuthStrategy } from "./types";
import { cookieJwtStrategy } from "./strategies/cookieJwt";
import { cookieSessionStrategy } from "./strategies/cookieSession";
import { headersStrategy } from "./strategies/headers";
import { mfaFilteredStrategy } from "./strategies/mfaFiltered";
import { mfaVerifyStrategy } from "./strategies/mfaVerify";

// Resolve the active strategy from AUTH_MODE. getAuthMode() caches, so this is
// cheap to call per request.
export function getStrategy(): AuthStrategy {
  switch (getAuthMode()) {
    case "cookie-session":
      return cookieSessionStrategy;
    case "headers":
      return headersStrategy;
    case "mfa-filtered":
      return mfaFilteredStrategy;
    case "mfa-verify":
      return mfaVerifyStrategy;
    case "cookie-jwt":
    default:
      return cookieJwtStrategy;
  }
}
