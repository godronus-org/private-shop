import { getEnv } from "fastedge::env";

// Which auth integration this deployment emulates. One wasm; the behavior is
// selected at runtime by the AUTH_MODE env var so a single build can be deployed
// as several independent "customer" apps. See context/architecture.
export type AuthMode = "cookie-jwt" | "cookie-session" | "headers";

const VALID: readonly AuthMode[] = ["cookie-jwt", "cookie-session", "headers"];

// Default to cookie-jwt so an app with no AUTH_MODE set behaves like the
// original private-shop (stateless HMAC JWT) rather than failing closed.
const DEFAULT_MODE: AuthMode = "cookie-jwt";

let cached: AuthMode | undefined;

export function getAuthMode(): AuthMode {
  if (cached) return cached;
  const raw = getEnv("AUTH_MODE");
  cached = raw && VALID.includes(raw as AuthMode) ? (raw as AuthMode) : DEFAULT_MODE;
  return cached;
}

// True only for the server-side session mode, which exposes the /manage-sessions
// admin surface and the hidden footer entry point.
export function sessionAdminEnabled(): boolean {
  return getAuthMode() === "cookie-session";
}
