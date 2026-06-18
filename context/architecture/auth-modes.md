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
AUTH_MODE = cookie-jwt | cookie-session | headers   (default: cookie-jwt)
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

## SSO bootstrap (cookie modes only)

When `JWKS_URL` is set, the unified `auth` middleware does a one-time token
exchange: no local credential + an `sso_session` cookie present → verify it via
JWKS (ES256, `jose`, in `src/auth/sso.ts`) → `strategy.issue(...)` mints the
origin credential. Subsequent requests use the fast path. Runs globally (any
route), but the JWKS fetch only fires the one time there's an SSO cookie and no
local credential. `headers` mode skips bootstrap (the edge already did the work).

> **Open security question (logout):** the cookie modes re-exchange `sso_session`
> for an *independent* origin credential, so this app's session lifetime is
> decoupled from the edge SSO session — neither side's logout propagates to the
> other. `headers` mode has no local credential, so it has no meaningful local
> logout at all (sign-out must be delegated to an edge logout endpoint that
> doesn't exist yet). Tracked in `saml-app/context/security-issues.md` → SEC-8;
> resolving it may change how this app handles cookies.

## Env var matrix

| Mode | Required | Optional |
|---|---|---|
| `cookie-jwt` | `AUTH_MODE=cookie-jwt`, `SESSION_SECRET`, `PASSWORD` | `JWKS_URL`, `SESSION_COOKIE` |
| `cookie-session` | `AUTH_MODE=cookie-session`, `PASSWORD` | `JWKS_URL`, `SESSION_COOKIE` |
| `headers` | `AUTH_MODE=headers` | `AUTH_HEADER` |

- `PASSWORD` defaults to `"authme"` if unset (cookie modes).
- `SESSION_COOKIE` is the **name of the upstream SSO cookie** to read (default
  `sso_session`) — *not* the origin's own cookie. (Pre-existing, slightly
  confusing naming; preserved to avoid breaking deployments.)
- If `AUTH_MODE` is unset/invalid, the app defaults to `cookie-jwt` so a bare app
  behaves like the original private-shop.

## Deployed apps (same wasm, different env)

| App | appId | `AUTH_MODE` | URL |
|---|---|---|---|
| private-shop | `847882` | `cookie-jwt` | https://private-shop-4732724.fastedge.cdn.gc.onl/ |
| private-shop-session | `848393` | `cookie-session` | https://private-shop-session-4732724.fastedge.cdn.gc.onl/ |
| (optional) headers demo | — | `headers` | — |

Build once (`npm run build`); deploy the one wasm to each app with its own env.
The single magic-comment block in `index.tsx` targets the `cookie-jwt` app; the
others are deployed via the manage/deploy skill with overridden env.
