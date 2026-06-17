# Task: Support ES256/JWKS Session Verification

**Status:** done  
**Scope:** `src/auth/` only — no route changes, no component changes  
**Why:** `saml-app`'s cookie variant issues ES256 JWTs. When private-shop sits behind the saml-app CDN filter, it needs to bootstrap its own local session by verifying `sso_session` once against the saml-app's JWKS endpoint, then operate entirely on its own `auth_token` thereafter.

---

## Background

`saml-app` is a Gcore FastEdge edge SSO bolt-on. In the **cookie variant**, it:

1. Sits as a CDN filter in front of private-shop — verifies `sso_session` JWT at the edge (Rust proxy-WASM)
2. Runs an auth-app that federates to Google/GitHub/SAML IdPs and issues a **signed session JWT** as the `sso_session` cookie

The JWT is signed with **ES256** (ECDSA-P256). The matching public key is served at a configurable JWKS endpoint on the auth-app (default path: `/auth/.well-known/jwks.json`).

**Current problem:** private-shop reads `SESSION_SECRET` and verifies `auth_token` cookies with HS256. It has no knowledge of `sso_session` or ES256. When deployed behind saml-app, the user's identity (their SSO `sub`) is in the `sso_session` cookie, but private-shop ignores it.

**Goal:** private-shop should recognise a valid `sso_session` JWT, verify it via JWKS **once**, mint its own `auth_token` from the verified identity, and set it on the response. All subsequent requests use `auth_token` directly — no further JWKS fetch until the local token expires.

---

## Design

### Token exchange pattern (SSO bootstrap)

The JWKS fetch is a one-time bootstrap cost, not a per-request overhead:

```
Request arrives
│
├── Has valid auth_token? ──yes──▶ c.set("user", sub), next()   ← fast path, no network
│        (HS256, local verify)
│
└── No auth_token (or invalid)
    │
    ├── JWKS_URL set AND sso_session cookie present?
    │       │
    │       └──yes──▶ Fetch JWKS ──▶ verify sso_session (ES256)
    │                                       │
    │                              ┌────────┴───────────┐
    │                           success               failure
    │                              │                     │
    │                    mint auth_token           fall through
    │                    set cookie on response    (unauthenticated)
    │                    c.set("user", sub)
    │                    next()
    │
    └── No JWKS_URL or no sso_session ──▶ unauthenticated, next()
```

**Key behaviours:**
- `auth_token` check always runs first — it's local, no network. The JWKS path is only reached when `auth_token` is absent or invalid.
- On SSO bootstrap success, private-shop mints its own `auth_token` (HS256) signed with its `SESSION_SECRET` and sets it in the response. The browser now holds both `sso_session` (from saml-app) and `auth_token` (from private-shop). Subsequent requests hit the fast path.
- `SESSION_SECRET` is required even in SSO mode (needed to mint `auth_token` on bootstrap). It does not need to match anything in saml-app — it is private-shop's own HS256 key.
- When `auth_token` expires, the next request re-enters the SSO bootstrap path (one more JWKS fetch) and mints a fresh `auth_token`. This keeps the local session alive as long as the upstream `sso_session` is also valid (the CDN filter enforces that at the edge).

### Why fetch the JWKS endpoint (not a static env var)

Fetching the JWKS via `createRemoteJWKSet` from `jose` is the correct approach:

- **Key rotation is seamless.** When the saml-app operator rotates the signing keypair, they redeploy the auth-app. All verifiers fetching the JWKS endpoint automatically pick up the new public key. A static public JWK env var would require a redeployment of private-shop on every rotation — operationally painful.
- **`createRemoteJWKSet` already works on StarlingMonkey.** The saml-app itself uses it for Google OIDC verification (`providers/google.ts`). It uses `fetch()` internally, which is available on FastEdge HTTP apps.
- **JWKS fetch only happens once per local session.** After `auth_token` is minted, subsequent requests never reach the JWKS path.

Note: `createRemoteJWKSet` maintains an in-process key cache and re-fetches only when a key ID is not found. StarlingMonkey has no persistent state between requests, so the cache is per-invocation. Since JWKS fetch only happens when `auth_token` is absent, this is fine — the common case (request has `auth_token`) costs zero network round-trips.

### Configurable JWKS URL

The JWKS URL must be a configurable env var (`JWKS_URL`), not hardcoded to `/auth/.well-known/jwks.json`:

- A customer may route the saml-app auth-app at a different CDN prefix — changing the full JWKS path.
- The `/.well-known/` namespace (RFC 8615) could clash if the customer runs multiple OIDC issuers.
- A full absolute URL is explicit and removes all ambiguity about domain or path.

### New env vars

| Env var | Required | Default | Description |
|---|---|---|---|
| `JWKS_URL` | No | — | Full absolute URL of the saml-app JWKS endpoint. **Presence of this var enables SSO bootstrap mode.** Example: `https://auth.godronus.xyz/auth/.well-known/jwks.json` |
| `SESSION_COOKIE` | No | `"sso_session"` | Name of the SSO session cookie to read. Must match `SESSION_COOKIE` as configured on the saml-app CDN filter (default there is also `sso_session`). |
| `SESSION_SECRET` | Yes (existing) | — | Already required for own-auth. Also used here to mint `auth_token` after SSO bootstrap. No change to its meaning. |

All read at request time via `getEnv()` from `fastedge::env`, consistent with existing config reads.

---

## Exact Changes Required

### 1. Add `jose` dependency

`jose` is not in `package.json`. Add it:

```bash
npm install jose@^6.0.0
```

The `jose` library works on StarlingMonkey — the saml-app auth-app already uses `createRemoteJWKSet`, `jwtVerify`, and `SignJWT` from `jose` on the same runtime.

### 2. Create `src/auth/sso.ts` (new file)

```typescript
import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Verify an ES256 JWT from the saml-app cookie variant against the
 * JWKS endpoint at jwksUrl. Returns the `sub` claim on success, null
 * on any failure (expired, wrong algorithm, fetch error, bad signature).
 */
export async function verifySsoToken(
  token: string,
  jwksUrl: string,
): Promise<string | null> {
  try {
    const JWKS = createRemoteJWKSet(new URL(jwksUrl));
    const { payload } = await jwtVerify(token, JWKS, { algorithms: ["ES256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
```

**Notes:**
- `{ algorithms: ["ES256"] }` constrains acceptance to ES256 only — a stray HS256 JWT cannot be accepted here.
- All errors return `null` — JWKS fetch failures, expired tokens, bad signature, malformed JWT all fall through to unauthenticated.

### 3. Update `src/auth/middleware.ts`

Add this import at the top:

```typescript
import { verifySsoToken } from "./sso.js";
```

Replace the `jwtAuth` function (lines 8–16 of the current file) with:

```typescript
export async function jwtAuth(c: Context, next: Next): Promise<void> {
  // Fast path: own auth_token is present — local HS256 verify, no network.
  const secret = getEnv("SESSION_SECRET");
  const ownToken = getCookie(c, AUTH_COOKIE);
  if (ownToken && secret) {
    const username = await verifyToken(ownToken, secret);
    if (username) {
      c.set("user", username);
      return next();
    }
  }

  // SSO bootstrap: no valid auth_token — try to verify sso_session via JWKS.
  // On success, mint own auth_token and set it on the response so that
  // subsequent requests use the fast path above (no further JWKS fetch).
  const jwksUrl = getEnv("JWKS_URL");
  if (jwksUrl && secret) {
    const ssoCookieName = getEnv("SESSION_COOKIE") ?? "sso_session";
    const ssoToken = getCookie(c, ssoCookieName);
    if (ssoToken) {
      const sub = await verifySsoToken(ssoToken, jwksUrl);
      if (sub) {
        const newToken = await mintToken(sub, secret);
        setCookie(c, AUTH_COOKIE, newToken, {
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
          path: "/",
          maxAge: TOKEN_MAX_AGE,
        });
        c.set("user", sub);
      }
    }
  }

  await next();
}
```

**Exactly what changed:**
- Own-auth check moved to run first (fast path, no network)
- Early return on successful own-auth (skips SSO block entirely)
- SSO bootstrap block added after: verifies `sso_session` via JWKS, mints `auth_token`, sets it on the response
- `SESSION_SECRET` required for both paths (minting the own token on bootstrap)
- Cookie attributes on the newly minted token are identical to `attemptLogin` (HttpOnly, Secure, SameSite=Lax, Path=/, maxAge=TOKEN_MAX_AGE)

---

## What Does NOT Change

- `src/auth/jwt.ts` — untouched (`mintToken`/`verifyToken`, `AUTH_COOKIE`, `TOKEN_MAX_AGE`)
- `src/auth/middleware.ts` lines 18–47 (`attemptLogin`, `doLogout`, `timingSafeEqual`) — untouched
- `src/index.tsx` — untouched
- All components — untouched
- `src/config.ts`, `src/data/`, all other files — untouched

---

## Acceptance Criteria

**Build:**
- `npm run build` completes without errors and emits `http_private_shop.wasm`

**SSO mode OFF (`JWKS_URL` not set):**
- Existing login form still works unchanged
- `GET /checkout` with valid `auth_token` cookie → checkout page
- `GET /checkout` with no cookie → redirects to `/login?next=/checkout`
- No regression

**SSO mode ON (`JWKS_URL` set):**
- `GET /checkout` with valid `sso_session`, no `auth_token` → JWKS fetched once, `auth_token` minted and set in response, checkout page shown with user as JWT `sub`
- Second request with the newly set `auth_token` → checkout page shown, no JWKS fetch (fast path)
- `GET /checkout` with expired `sso_session`, no `auth_token` → unauthenticated (no JWKS bootstrap, redirect to `/login`)
- `GET /checkout` with tampered `sso_session`, no `auth_token` → unauthenticated (JWKS verify fails, falls through)
- `GET /checkout` with JWKS endpoint unreachable → `verifySsoToken` returns null; if `auth_token` is also absent, unauthenticated — no 500 error
- `GET /checkout` with valid `auth_token` already present → fast path wins; `sso_session` is not read; no JWKS fetch

**Note:** there are no automated tests in this app. Verify by building the WASM and testing via the FastEdge debug runner. See "How to obtain a test keypair" below.

---

## Context Docs to Update After Implementing

1. **`context/architecture/jwt-app.md`** — add a section describing SSO bootstrap mode: `JWKS_URL` env var enables it, the token exchange pattern (verify once → mint own token), and the fast/slow path split.
2. **`context/development-state.md`** — mark this task complete; note the new env vars (`JWKS_URL`, `SESSION_COOKIE`).
3. **`context/design/decisions.md`** — add a new row: `JWKS_URL triggers SSO bootstrap: verify sso_session once via JWKS fetch, mint own auth_token, all subsequent requests use local HS256 — no per-request JWKS latency. Own-auth flow unchanged (additive).`

---

## How to Obtain a Test Keypair

Run this from the saml-app workspace root (at `../../saml-app/` relative to this app):

```bash
node scripts/gen-ec-keypair.mjs
```

This prints `SESSION_SIGNING_KEY` (private key, for the saml-app) and `SESSION_PUBLIC_JWK` (public JWK, served by the saml-app's JWKS endpoint).

To test the SSO bootstrap path locally: run the saml-app auth-app locally (it exposes `GET /auth/.well-known/jwks.json`), set `JWKS_URL` in private-shop's local env config to point at it, and present a `sso_session` cookie signed with the corresponding private key.

---

## Integration Context (for the deploying engineer)

When deploying private-shop behind the saml-app cookie variant:

1. Generate keypair: `node scripts/gen-ec-keypair.mjs` in the saml-app workspace
2. Set `SESSION_SIGNING_KEY` secret on the saml-app auth-app (signs JWTs on login)
3. Set `SESSION_PUBLIC_JWK` env var on the saml-app CDN filter (verifies at edge, no fetch overhead)
4. Set `JWKS_URL` env var on private-shop — full URL of the JWKS endpoint (e.g. `https://auth.godronus.xyz/auth/.well-known/jwks.json`)
5. `SESSION_SECRET` on private-shop remains its own key — unrelated to any saml-app secret
6. Optionally set `SESSION_COOKIE` on private-shop if the cookie name differs from `sso_session`

The CDN filter verifies with a static public JWK (performance-optimised, no fetch at edge). Private-shop bootstraps by fetching the JWKS once per local session (rotation-resilient, one-time cost). These are complementary strategies for the same public key.
