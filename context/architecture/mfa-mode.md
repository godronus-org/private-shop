# PLAN — `AUTH_MODE=mfa-filtered` / `mfa-verify`: bolt-on MFA at the edge

> **STATUS: PLAN, not implemented.** Specs **two** new `AUTH_MODE` values for an
> implementing agent. Read `auth-modes.md` first (the canonical strategy model) — this
> extends it. The edge side is `totp-app` (`/home/gdoco/dev/gcore/backend/apps/totp-app`);
> its contract lives in that repo's `context/architecture/flow.md` + `integration.md` +
> `design/decisions.md` (D11–D20). **Do not build TOTP here** — private-shop only does
> the password step and defers enrol/verify to the edge.

## Two modes, one wasm (matches private-shop's existing model)

Just as `cookie-jwt` / `cookie-session` / `headers` are one wasm selected by `AUTH_MODE`,
we add two MFA modes — each proves a different totp-app enforcement profile (D17):

| `AUTH_MODE` | totp-app profile | Who enforces MFA | Origin work | Demonstrates |
|---|---|---|---|---|
| **`mfa-filtered`** | A | the totp-app **Rust filter** (in front of the origin) | minimal: sign a handoff ticket + 1 redirect; **no verify** | the **headline bolt-on** — attach MFA, barely touch the origin |
| **`mfa-verify`** | B | the **origin** (verifies an ES256 proof via JWKS) | more: verify proof + mint session on return | the **no-filter** option for origins that can't front with our filter |

> Mode values use `mfa-` (not `mfa_session`): `mfa_session` is the edge-internal cookie
> the *filter* checks (totp-app D13) — the origin never reads it. The origin's own
> session is always `auth_token`.

## Shared across both modes

- `localLogin = true` — both render the **normal password form** at `/login`.
- After password OK, both sign a **handoff ticket** (HS256 `HANDOFF_KEY`,
  `{ sub, next, exp: now+TICKET_TTL }`) and 303 to `TOTP_CHALLENGE_URL?t=<ticket>`. The
  ticket is the only thing shared with the edge; it proves "password passed."
- **Enrollment** (small admin/account surface): server-to-server `POST <TOTP_ENROLL_URL>`
  with `ENROLL_API_KEY`; render the returned `svgQr` (D20) for the user to scan. This is
  how the seed lands in the edge's KV. **Never** forward the `otpauth://` URI to an
  external QR service (it embeds the seed).
- **`AuthStrategy` gets one optional hook** (`src/auth/types.ts`) — when present, `/login`
  calls it **instead of** the plain `issue()+redirect`, and the strategy owns *when* the
  credential is issued (the key difference between the two modes):
  ```ts
  // If present, this strategy requires a second factor. POST /login returns this
  // Response instead of issue()+redirect; the strategy issues auth_token at the
  // correct time (now for filtered, after return for verify).
  startSecondFactor?(c: Context, user: string, next: string): Promise<Response>;
  ```
  `/login`: `if (strategy.startSecondFactor) return strategy.startSecondFactor(c, user, next); await strategy.issue(c, user); return redirect(next);`

The **issue timing differs** and is security-critical:
- `mfa-filtered` issues `auth_token` **immediately** (identity); the filter blocks access
  until `mfa_session` exists, so a pre-MFA `auth_token` grants nothing on its own.
- `mfa-verify` must **not** issue `auth_token` until the proof is verified (no filter to
  block) — it sets a `pre_mfa` marker instead and issues on `/mfa/return`.

---

## `mfa-filtered` (Profile A — the headline demo)

Deployment: totp-app HTTP app on `/auth/totp/*` **and** the totp-app **Rust filter** on
the CDN resource fronting private-shop (bypass `/auth/totp/**`, `/login`, `/mfa/start`;
protect the rest; verify `mfa_session` with `MFA_SESSION_KEY`; deny-redirect → `/mfa/start`).
Same model saml-app already runs on resources `12656511`/`12642140`.

```
GET /checkout            → origin: no auth_token → 303 /login?next=/checkout
POST /login (pw OK)      → issue auth_token (identity) + sign ticket, 303 → edge challenge
   … edge verifies TOTP, sets mfa_session, 303 → next …
GET /checkout (again)    → origin has auth_token; the FILTER sees valid mfa_session → allow.
                           Origin verifies NOTHING about the MFA step.
```

Strategy `src/auth/strategies/mfaFiltered.ts`: `authenticate`/`issue`/`revoke` delegate to
cookie-jwt (`src/auth/jwt.ts`); `startSecondFactor` = `issue()` then sign ticket + 303.
Plus **`GET /mfa/start`** (registered unconditionally, gated by mode): the filter's
re-challenge target — if `auth_token` valid, mint a fresh ticket → 303 to the edge (no
re-password) when `mfa_session` has expired (8h); else → `/login`.

The origin holds **no** edge keys (not even a public one); `HANDOFF_KEY` is the only
shared secret. `mfa_session` is signed/checked by the edge app and the filter only.

**Env:** `AUTH_MODE=mfa-filtered`, `PASSWORD`, `SESSION_SECRET`, `HANDOFF_KEY`,
`TOTP_CHALLENGE_URL` (+ `TOTP_ENROLL_URL`/`ENROLL_API_KEY` for enrollment). **Filter**
config on the resource: `MFA_SESSION_KEY`, bypass list, deny-redirect → `/mfa/start`.

---

## `mfa-verify` (Profile B — no-filter alternative)

No filter. The edge hands back a one-time **ES256 proof** as a host-only `mfa_proof`
cookie (same CDN host — no URL token, audit C1) and the origin verifies it.

```
POST /login (pw OK)      → set pre_mfa marker (NO auth_token yet) + sign ticket, 303 → edge
   … edge verifies TOTP, sets mfa_proof cookie (ES256, one-time, ~90s), 303 → /mfa/return …
GET /mfa/return          → verify mfa_proof via JWKS, check sub==pre_mfa + aud/iss + exp,
                           clear pre_mfa + mfa_proof, issue auth_token, 303 → next
```

Strategy `src/auth/strategies/mfaVerify.ts`: `authenticate`/`issue`/`revoke` delegate to
cookie-jwt; `startSecondFactor` sets `pre_mfa` (no issue) + ticket + 303. Plus
**`GET /mfa/return`** (registered unconditionally, gated by mode): verify the ES256
`mfa_proof` via `createRemoteJWKSet(TOTP_JWKS_URL)` + `jwtVerify(...,{algorithms:["ES256"]})`
— **reuse the `verifySsoToken` shape in `src/auth/sso.ts`** — then `issue()` and redirect.
The origin holds only the **public** JWKS; it can't forge proofs.

**Env:** `AUTH_MODE=mfa-verify`, `PASSWORD`, `SESSION_SECRET`, `HANDOFF_KEY`,
`TOTP_CHALLENGE_URL`, `TOTP_JWKS_URL` (+ enrollment vars; optional `MFA_PROOF_COOKIE`,
`MFA_AUDIENCE`/`MFA_ISSUER`). No filter.

---

## Test plan (live-test fixtures — one per mode)

`mfa-filtered`: enroll → `/checkout` anon → `/login` → password → 303 edge → code → edge
sets `mfa_session` → back to `/checkout` → **filter allows**. Negative: `auth_token` but
no `mfa_session` → filter denies; expired `mfa_session` → `/mfa/start` re-challenge (no
re-password).

`mfa-verify`: enroll → `/login` → password (no `auth_token` yet) → 303 edge → code → edge
sets `mfa_proof` → `/mfa/return` verifies → `auth_token` issued → `next`. Negative: wrong/
expired code, replayed proof (jti), `sub` mismatch, tampered proof → fail closed, no
`auth_token`.

## Governance reminders (AGENTS.md)

- Keep auth logic in `src/auth/`; do not touch website/components.
- Do not rebuild TOTP/SSO here — defer to the edge.
- Update `auth-modes.md` (add both rows + descriptions) and `context/INDEX.md` when
  implemented.
