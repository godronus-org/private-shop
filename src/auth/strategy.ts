import { getAuthMode } from "./mode";
import type { AuthStrategy } from "./types";
import { cookieJwtStrategy } from "./strategies/cookieJwt";
import { cookieSessionStrategy } from "./strategies/cookieSession";
import { headersStrategy } from "./strategies/headers";

// Resolve the active strategy from AUTH_MODE. getAuthMode() caches, so this is
// cheap to call per request.
export function getStrategy(): AuthStrategy {
  switch (getAuthMode()) {
    case "cookie-session":
      return cookieSessionStrategy;
    case "headers":
      return headersStrategy;
    case "cookie-jwt":
    default:
      return cookieJwtStrategy;
  }
}
