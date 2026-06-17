# Design — Locked Decisions

Decisions already made for the **JWT variant** (`private-shop` branch). Change only
with the user's say-so.

| # | Decision | Choice | Notes |
|---|---|---|---|
| 1 | Token format | **JWT via `hono/jwt` (HS256)** | Standard format, built into Hono. |
| 2 | Where credentials live | **`getEnv`** | `BOB_PASSWORD`, `TANYA_PASSWORD`, and a `SESSION_SECRET` (JWT signing key) as env vars. (`getSecret` is the platform-blessed alternative; env chosen for this example.) |
| 3 | What requires login | **Checkout only** | Browse + basket stay anonymous; login forced at "Proceed to checkout". |
| 4 | Users | **`bob`, `tanya`** | Hardcoded usernames; passwords verified against env vars. No DB. |
| 5 | SSO bootstrap via JWKS | **`JWKS_URL` env var triggers SSO bootstrap** | When set, `jwtAuth` verifies the `sso_session` cookie once via JWKS (ES256, `jose`), mints own `auth_token` (HS256), and sets it in the response. All subsequent requests use the local HS256 fast path — no per-request JWKS fetch. Own-auth flow (`SESSION_SECRET`/`PASSWORD`) is unchanged and additive. |

## Implied / standard choices (not yet ratified — confirm if it matters)

- Cookie hardening: `HttpOnly; Secure; SameSite=Lax; Path=/` + short `Max-Age`.
- Constant-time password comparison.
- JWT payload holds **username only** (signed-not-encrypted; nothing secret in it).
- `?next=` redirect param to return the user to checkout after login.

## Deferred (discuss before building)

- **Session variant** storage backed by the **Cache API** — agreed as an
  example-only stand-in; mechanics/trade-offs not yet designed. See
  [../architecture/session-app.md](../architecture/session-app.md).
