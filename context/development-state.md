# Development State

_As of 2026-06-16._

## Where we are

### JWT variant — **complete** (`private-shop` branch)

- Hono SSR shop on FastEdge WASM (React via `renderDocument`). Pages:
  landing, products, product, basket, about, contact, login, checkout.
- **Auth surface isolated** in `src/auth/`:
  - `src/auth/jwt.ts` — `mintToken` / `verifyToken` (HS256 via `hono/jwt`)
  - `src/auth/middleware.ts` — `jwtAuth` global middleware (fast path + SSO bootstrap), `attemptLogin`, `doLogout`
  - `src/auth/sso.ts` — `verifySsoToken` (ES256 via JWKS, `jose` library)
- Login: `POST /login` validates password against `PASSWORD` env var (defaults to
  `"authme"`); any username admitted. JWT minted with `SESSION_SECRET` env var
  (required — login fails without it).
- Cookie: `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800` (8h).
- Checkout gate: `GET /checkout` redirects to `/login?next=/checkout` if no valid JWT.
- Header: shows "Hi, {user}" + Sign out when authenticated; Sign in link otherwise.
- Footer: `©` symbol is a hidden link to `/manage-sessions` (not present on JWT variant).
- Env vars on deployed app: `SESSION_SECRET`, `PASSWORD`, optionally `JWKS_URL`, `SESSION_COOKIE`.
- **SSO bootstrap mode:** set `JWKS_URL` to enable. Verifies `sso_session` via JWKS once, mints `auth_token`. See `context/architecture/jwt-app.md` § SSO bootstrap mode.
- Deployed: appId `847882`, `https://private-shop-4732724.fastedge.cdn.gc.onl/`.

### Session variant — **complete** (`private-shop-session` branch)

- Same shop as JWT variant; only `src/auth/` was replaced.
- **Auth surface** in `src/auth/`:
  - `src/auth/session.ts` — `fastedge::cache`-backed sessions (`createSession`,
    `lookupSession`, `deleteSession`, `listSessions`, `deleteAllSessions`)
  - `src/auth/middleware.ts` — `sessionAuth` global middleware, `attemptLogin`, async `doLogout`
- Sessions stored as `private-shop-sessions:{uuid}` in the POP-local Cache (8h TTL).
  An index at `private-shop-sessions:_index` (no TTL) tracks live session metadata
  for listing. `Cache.purgePrefix("private-shop-sessions:")` wipes everything including
  the index in one call.
- Cookie: opaque session id (`session_id`), same hardening as JWT variant.
- Added route: `GET /manage-sessions` — SSR admin page listing all active sessions
  with per-row Revoke and a Purge All button. Auth-gated.
- Footer: `©` symbol links to `/manage-sessions` (hidden admin entry point).
- Env vars on deployed app: `PASSWORD` only. `SESSION_SECRET` not needed.
- Deployed: appId `848393`, `https://private-shop-session-4732724.fastedge.cdn.gc.onl/`.

## Roadmap

1. ~~**JWT variant** (`private-shop` branch)~~ ✅ done
2. ~~**Session variant** (`private-shop-session` branch)~~ ✅ done
3. **`saml-app` integration + minimal example** — finish `saml-app`; slot it in
   front of `privateShop` to prove edge-enhanced login; and build the
   customer-facing **minimal** both-variants example *inside `saml-app`* (not the
   noisy shop) plus docs. See [design/fixture-vs-example.md](design/fixture-vs-example.md)
   and [architecture/overview.md](architecture/overview.md).

> Open: once the minimal `saml-app` example carries the both-variants teaching
> load, we may keep only one realism branch here (likely JWT) rather than two.
> Not decided yet.

## Note: plugin docs (`fastedge::cache`)

The `fastedge-assistant` MCP plugin reference docs for `fastedge::cache` were
outdated during development of the session variant (referenced browser
`caches.open()` / Cache Storage API; the real API is a static `Cache` class
with `purgePrefix()`). Plugin docs have been fixed by the plugin author but
not yet published. Use the `.d.ts` at
`repos/fastedge-coordinator/FastEdge-sdk-js/types/fastedge-cache.d.ts` as the
authoritative source until the updated plugin is published.

## Build / deploy quick facts

**JWT variant (`private-shop` branch):**
- Build: `npm run build` → `wasm/http/js/privateShop/http_private_shop.wasm`
- appId `847882`, `https://private-shop-4732724.fastedge.cdn.gc.onl/`
- Env vars: `SESSION_SECRET`, `PASSWORD`

**Session variant (`private-shop-session` branch):**
- Build: `npm run build` → `wasm/http/js/privateShop/http_private_shop.wasm`
- appId `848393`, `https://private-shop-session-4732724.fastedge.cdn.gc.onl/`
- Env vars: `PASSWORD` only
