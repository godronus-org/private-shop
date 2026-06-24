# privateShop — Context Index

> Read this index, then open **only** the file(s) your task needs. Each file is
> one focused concept.

## What this app is

`privateShop` is **not a product**. It is a **realism fixture** — a stand-in for a
customer's existing website that already has login — used to prove Gcore's
`saml-app` can enhance that login from the edge. Do **not** rebuild SSO/SAML here;
that lives in `saml-app`.

## Current state (2026-06-18)

- **One wasm**, with auth behavior selected at runtime by the `AUTH_MODE` env var:
  `cookie-jwt` (stateless HS256 JWT), `cookie-session` (server-side session +
  `/manage-sessions`), or `headers` (trusted edge-injected identity).
- All auth lives behind an `AuthStrategy` interface in `src/auth/`; the shop code
  is identical across modes.
- **SSO integration (P2b done):** `/login` page shows Google + GitHub SSO buttons
  (Mode B static links). When `JWKS_URL` is set, the middleware verifies
  `sso_session` directly on each request — **no secondary credential minted**
  (Cloudflare Access model, anti-pattern removed 2026-06-18).
- **Logout (P6):** `POST /logout` chains through `/auth/logout` on the auth-app.
  Two-hop, one `Set-Cookie` per response.
- Deployed as the same wasm on two apps: appId `847882` (`cookie-jwt`) and
  appId `848393` (`cookie-session`). See [architecture/auth-modes.md](architecture/auth-modes.md).

## Map

- [architecture/overview.md](architecture/overview.md) — what the app is, why it
  exists, how `saml-app` fits, the edge-integration model. **Start here if new.**
- [architecture/auth-modes.md](architecture/auth-modes.md) — **canonical** auth
  reference: the three modes, the strategy abstraction, SSO bootstrap, env vars,
  deployed apps.
- [architecture/session-store.md](architecture/session-store.md) — the
  `fastedge::cache` session store used by `cookie-session` mode.
- [architecture/mfa-mode.md](architecture/mfa-mode.md) — **PLAN (not built):** two new
  modes that keep the password step here and defer TOTP to the edge `totp-app` —
  `mfa-filtered` (Rust filter enforces; headline bolt-on) and `mfa-verify` (origin
  verifies an ES256 proof via JWKS; no filter). For the MFA integration milestone.
- [design/fixture-vs-example.md](design/fixture-vs-example.md) — why this noisy
  shop stays standalone and `saml-app` ships its own minimal example instead.

## Task → file routing

- *"How does login / auth work? change it"* → architecture/auth-modes.md
- *"Work on the session store / manage-sessions"* → architecture/session-store.md + auth-modes.md
- *"What is this app for? how does saml-app use it?"* → architecture/overview.md
- *"Should this ship inside saml-app? is it too noisy?"* → design/fixture-vs-example.md
- *"Add MFA / second factor / wire up totp-app"* → architecture/mfa-mode.md (PLAN)
