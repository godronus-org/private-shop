# Auth Modes — One WASM, Selected by `AUTH_MODE`

> **This is the canonical description of how privateShop's auth works.** Read this
> first when touching auth. The `cookie-session` store has its own reference in
> [session-store.md](session-store.md).

## The model

privateShop is **one codebase, one wasm**, whose auth behavior is selected **at
request time** by the `AUTH_MODE` env var. To present several "different
customers", deploy the *same* wasm as several FastEdge apps, each with a different
`AUTH_MODE`.

```
AUTH_MODE = cookie-jwt | cookie-session | headers | mfa-filtered | mfa-verify   (default: cookie-jwt)
```

The shop itself (components, render, config, data, the `/login` form, the SSO
bootstrap shell) is identical across all modes. All variation lives behind a
small **auth-strategy** interface.

## The strategy abstraction

`src/auth/types.ts` defines `AuthStrategy`:

| Member | Purpose |
|---|---|
| `authenticate(c) → user \| null` | Fast path: resolve the origin's *own* credential. Must not touch the upstream SSO cookie. |
| `issue(c, user) → boolean` | Set the origin credential after local login or SSO bootstrap. Returns `false` if the mode can't issue (misconfigured, or the edge owns the credential). |
| `revoke(c)` | Clear the origin credential (logout). |
| `localLogin: boolean` | Does this mode accept the local `/login` form? |
| `sessionAdmin: boolean` | Does this mode expose `/manage-sessions`? |

`src/auth/mode.ts` reads + caches `AUTH_MODE`. `src/auth/strategy.ts` maps the
mode to the active strategy. `src/auth/middleware.ts` and `src/index.tsx` only
ever talk to the interface — they never branch on the mode directly (except the
two `localLogin` / `sessionAdmin` flags).

> **Wizer constraint:** `AUTH_MODE` (like all env) can only be read at **request
> time**, never at module top-level — the Wizer build snapshot has no env. So
> mode-dependent route registration is done by registering routes
> unconditionally and gating *inside* each handler (`if (!getStrategy().sessionAdmin) return c.notFound()`).

## The three modes

### `cookie-jwt` (default) — stateless HMAC JWT
`src/auth/strategies/cookieJwt.ts` wraps `src/auth/jwt.ts`. Self-contained HS256
token in an `auth_token` HttpOnly cookie. No server-side store. Requires
`SESSION_SECRET`. See the shared login flow + cookie hardening below.

### `cookie-session` — opaque server-side session
`src/auth/strategies/cookieSession.ts` wraps `src/auth/session.ts`. Opaque
`session_id` cookie → `fastedge::cache`-backed store. Enables `/manage-sessions`
(instant revocation). Store details: [session-store.md](session-store.md).

### `headers` — trusted edge-injected identity
`src/auth/strategies/headers.ts`. The edge (saml-app) has already authenticated
the user and injects identity as a request header (`AUTH_HEADER`, default
`X-Forwarded-User`). The origin trusts it directly — **no origin-side credential**,
so `issue`/`revoke` are no-ops and there is no local `/login` (`GET /login`
redirects to `/`). This is the IAP / oauth2-proxy integration pattern.

> SECURITY: header-trust is only safe when the origin is reachable solely via the
> trusted edge, which must strip any client-supplied copy of the header. This is a
> demo fixture; a real deployment would also pin the edge's identity.

### `mfa-filtered` — second factor via totp-app Rust filter (Profile A)
`src/auth/strategies/mfaFiltered.ts`. Keeps the local password login; after password OK
signs an HS256 handoff ticket (`HANDOFF_KEY`) and 303s to `TOTP_CHALLENGE_URL`. The
origin issues `auth_token` **immediately** after password (identity), but the totp-app
Rust filter blocks every protected path until `mfa_session` is also present — so a
pre-MFA `auth_token` grants nothing on its own. Adds `GET /mfa/start` (the filter's
re-challenge target when `mfa_session` expires — no re-password if `auth_token` is
still valid). `authenticate`/`issue`/`revoke` delegate to `cookieJwtStrategy`.
Full spec: [mfa-mode.md](mfa-mode.md).

### `mfa-verify` — second factor via origin JWKS proof verification (Profile B)
`src/auth/strategies/mfaVerify.ts`. No filter. After password OK, sets a short-lived
`pre_mfa` HttpOnly cookie (max-age 300s, carries username) — **no `auth_token` yet** —
signs a handoff ticket pointing back to `/mfa/return`, and 303s to `TOTP_CHALLENGE_URL`.
totp-app issues a one-time ES256 `mfa_proof` cookie; `/mfa/return` verifies it via
`createRemoteJWKSet(TOTP_JWKS_URL)` + `jwtVerify` (binding `sub` to `pre_mfa`),
then clears both temporary cookies and issues `auth_token`. `verifyMfaProof` lives in
`src/auth/sso.ts` (mirrors `verifySsoToken`; adds `sub` binding + optional
`MFA_AUDIENCE`/`MFA_ISSUER` checks). `authenticate`/`issue`/`revoke` delegate to
`cookieJwtStrategy`. Full spec: [mfa-mode.md](mfa-mode.md).

## Shared login flow & cookie hardening (cookie modes)

1. Anonymous user clicks **"Proceed to checkout"** → `GET /checkout` redirects to
   `/login?next=/checkout` (checkout is the only gated route; browsing + basket
   stay anonymous, basket is client-side).
2. `GET /login` renders the form; `POST /login` checks the password
   (constant-time) against `PASSWORD`, then `strategy.issue()` sets the credential
   and redirects to `next`.
3. The global `auth` middleware resolves the credential on every request so the
   header can show the user + Logout. `POST /logout` → `strategy.revoke()`.

Both cookie modes harden the credential cookie identically:
`HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800` (8h). The JWT is
*signed, not encrypted* (FastEdge has HMAC sign/verify, no encrypt) — username
only, never secrets.

## SSO direct verify (all modes)

When `JWKS_URL` is set, the `auth` middleware verifies `sso_session` directly on
each request (after the local strategy's `authenticate` fails or returns null).
`verifySsoToken` in `src/auth/sso.ts` validates the ES256 JWT against the JWKS
endpoint, returning `name ?? email ?? sub` as the display identity. **No secondary
credential is minted** — `sso_session` is the session, full stop.

This matches the Cloudflare Access model: the edge issues one JWT cookie
(`CF_Authorization` / `sso_session`), and the origin reads it directly. There is
no cookie exchange, no decoupled session lifetime, and no bootstrapping.

> **FastEdge caching note:** `jose`'s `createRemoteJWKSet` caches the fetched JWK
> in module memory. FastEdge runs each request in a fresh WASM sandbox, so the
> cache is not effective here and the JWKS endpoint is hit on every SSO-authenticated
> request. On a real customer's origin (Node, Go, etc.) running long-lived processes
> this caching works correctly and is the intended model. The fixture shows the
> pattern; performance optimisation is the customer's concern.

## Logout flow

`POST /logout` (private-shop "Sign out" form) is a **two-hop chain**, one
`Set-Cookie` per response (required by the FastEdge CDN — see
`saml-app/context/SET_COOKIE.md`):

1. **Hop 1 — private-shop** (`POST /logout`): `strategy.revoke()` clears the
   local `auth_token` cookie (a no-op for SSO users who don't have one), then
   302s to `/auth/logout?redirect=/`.
2. **Hop 2 — auth-app** (`GET /auth/logout`): clears `sso_session` (`Max-Age=0`),
   302s to `/` (or a validated `?redirect=` destination).

After both hops the edge filter sees no `sso_session` on the next request and
redirects the user to the login chooser. For `headers` mode the hop-1 revoke is a
no-op (no local credential); hop 2 still clears `sso_session` and the filter
blocks immediately.

## Env var matrix

| Mode | Required | Optional |
|---|---|---|
| `cookie-jwt` | `AUTH_MODE=cookie-jwt`, `SESSION_SECRET`, `PASSWORD` | `JWKS_URL`, `SESSION_COOKIE` |
| `cookie-session` | `AUTH_MODE=cookie-session`, `PASSWORD` | `JWKS_URL`, `SESSION_COOKIE` |
| `headers` | `AUTH_MODE=headers` | `AUTH_HEADER` |
| `mfa-filtered` | `AUTH_MODE=mfa-filtered`, `SESSION_SECRET`, `PASSWORD`, `HANDOFF_KEY`, `TOTP_CHALLENGE_URL` | `TICKET_TTL`, `TOTP_ENROLL_URL`, `ENROLL_API_KEY` |
| `mfa-verify` | `AUTH_MODE=mfa-verify`, `SESSION_SECRET`, `PASSWORD`, `HANDOFF_KEY`, `TOTP_CHALLENGE_URL`, `TOTP_JWKS_URL` | `TICKET_TTL`, `MFA_PROOF_COOKIE`, `MFA_AUDIENCE`, `MFA_ISSUER`, `TOTP_ENROLL_URL`, `ENROLL_API_KEY` |

- `PASSWORD` defaults to `"authme"` if unset (cookie modes).
- `SESSION_COOKIE` is the **name of the upstream SSO cookie** to read (default
  `sso_session`) — *not* the origin's own cookie. (Pre-existing, slightly
  confusing naming; preserved to avoid breaking deployments.)
- `TICKET_TTL` defaults to `"90"` seconds (HS256 handoff ticket lifetime).
- `MFA_PROOF_COOKIE` defaults to `"mfa_proof"` (name of the ES256 proof cookie
  set by totp-app in `mfa-verify` mode).
- `MFA_AUDIENCE` / `MFA_ISSUER` — optional JWT audience/issuer checks on the
  `mfa_proof` in `mfa-verify` mode; omit to skip those claims checks.
- If `AUTH_MODE` is unset/invalid, the app defaults to `cookie-jwt` so a bare app
  behaves like the original private-shop.

## Deployed apps (same wasm, different env)

| App | appId | `AUTH_MODE` | URL |
|---|---|---|---|
| private-shop | `847882` | `cookie-jwt` | https://private-shop-4732724.fastedge.cdn.gc.onl/ |
| private-shop-session | `848393` | `headers` *(see note)* | https://private-shop-session-4732724.fastedge.cdn.gc.onl/ |

> **Note:** `848393` is named `private-shop-session` but is currently set to
> `AUTH_MODE=headers` — it is the origin for the `saml-app` **header** integration demo on
> CDN resource `12642140` (`shop.godronus.xyz`), where the edge filter injects
> `X-Forwarded-User`. In `headers` mode it has no local credential, so the bare
> `private-shop-session-…fastedge` URL is not usable standalone (no edge to inject the header).
> If you need the `cookie-session` demo back, flip `AUTH_MODE=cookie-session` (and update this row).

Build once (`npm run build`); deploy the one wasm to each app with its own env.
The single magic-comment block in `index.tsx` targets the `cookie-jwt` app; the
others are deployed via the manage/deploy skill with overridden env.
