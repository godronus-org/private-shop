# JWT Variant — Stateless `hono/jwt` Login

**Branch:** `private-shop` (this one). This is the **first** variant to build.

Represents a modern customer whose login is **stateless**: identity lives in a
signed token in the user's cookie; the server stores nothing.

## Mechanism

- On login, the server mints an **HMAC-SHA256 (HS256) JWT** containing the
  identity (e.g. `{ sub: "tanya", exp: ... }`) and sets it as a cookie.
- On each request, a Hono middleware **verifies the signature** (recomputes the
  HMAC with the server secret) and reads the identity. No server-side lookup.
- Built with `hono/jwt` (`sign` / `verify` helpers). FastEdge exposes
  `crypto.subtle` HMAC sign/verify, so this runs natively at the edge.

## Cookie

The JWT is stored in a cookie with:
- `HttpOnly` — JS cannot read it (kills XSS token theft)
- `Secure` — HTTPS only (app is served over `*.fastedge.cdn.gc.onl`)
- `SameSite=Lax` — CSRF protection for cross-site POSTs
- `Path=/` + a sane `Max-Age` (short-lived; re-login or refresh on expiry)

> Note: FastEdge has HMAC `sign`/`verify` but **no `encrypt`/`decrypt`**. The JWT
> is *signed, not encrypted* — the user can read the payload but cannot forge it.
> Never put secrets in the payload (username only).

## Login flow

1. Anonymous user clicks **"Proceed to checkout"** → redirect to
   `/login?next=/checkout`.
2. `GET /login` renders a real form (POST to `/login`).
3. `POST /login` reads the expected password (see
   [../design/decisions.md](../design/decisions.md)), compares (constant-time),
   and on success mints the JWT, sets the cookie, and redirects to `next`.
4. A Hono middleware on protected routes verifies the cookie → sets the current
   user or redirects to `/login`.
5. Header shows the user + Logout; logout clears the cookie.

## Scope of the gate

**Checkout only.** Browsing products and filling the basket stay anonymous; login
is forced at "Proceed to checkout". (Basket is client-side today.)

## SSO bootstrap mode (`JWKS_URL` env var)

When `JWKS_URL` is set, the app supports a **token exchange** bootstrap for the
`saml-app` cookie variant. The middleware has two paths:

**Fast path (no network):** `auth_token` cookie present and valid → local HS256
verify with `SESSION_SECRET` → set user, done. Zero network round-trips.

**SSO bootstrap (one network round-trip):** `auth_token` absent or invalid, AND
`JWKS_URL` set AND the SSO cookie (`sso_session` by default, or whatever
`SESSION_COOKIE` env var says) is present → fetch JWKS endpoint → verify the
cookie JWT as ES256 → on success, mint a fresh `auth_token` (HS256) and set it
in the response. Subsequent requests hit the fast path.

This lives in `src/auth/sso.ts` (`verifySsoToken`) and `src/auth/middleware.ts`
(`jwtAuth`). `src/auth/jwt.ts` is untouched.

**Env vars:**

| Var | Required | Default | Purpose |
|---|---|---|---|
| `SESSION_SECRET` | Yes | — | HS256 key for own `auth_token` (unchanged) |
| `JWKS_URL` | No | — | Full URL of saml-app JWKS endpoint; enables SSO bootstrap |
| `SESSION_COOKIE` | No | `"sso_session"` | Name of SSO cookie to read |

## Why this variant matters for `saml-app`

It proves the **stateless / edge-native** integration path: `saml-app` can hand a
customer a JWT their existing middleware already verifies — the cleanest case,
since verification needs no shared state.
