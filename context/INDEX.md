# privateShop — Context Index

> **How to use this folder:** Read *this index*, then open **only** the file(s)
> relevant to your task. You do **not** need to read the whole `context/` tree to
> help. Each file is one focused concept. Follow the pointers below.

## What this app actually is

`privateShop` is **not a product**. It is a **test fixture** — a stand-in for a
customer's existing website that already has login. We build **two variants** of
it (JWT-based and session-based) to prove that Gcore's `saml-app` can enhance a
customer's login from the edge, regardless of which auth mechanism they already
use. See [architecture/overview.md](architecture/overview.md) first if you're new.

## Map

### architecture/ — how things fit together
- [overview.md](architecture/overview.md) — the product vision, where `saml-app`
  fits, the edge-integration model, and why two fixture apps exist. **Start here.**
- [jwt-app.md](architecture/jwt-app.md) — the **JWT variant** (this `private-shop`
  branch): stateless HMAC JWT in an HttpOnly cookie via `hono/jwt`. The login flow.
- [session-app.md](architecture/session-app.md) — the **server-side session
  variant** (`private-shop-session` branch, complete): opaque session id + `fastedge::cache`-backed store. Deployed at `https://private-shop-session-4732724.fastedge.cdn.gc.onl/`.

### design/ — decisions and trade-offs
- [session-vs-jwt.md](design/session-vs-jwt.md) — the two auth approaches compared,
  industry norms, and why a real customer would have one or the other.
- [why-two-apps.md](design/why-two-apps.md) — rationale for building both variants
  as fixtures, and what each one proves about `saml-app` integration.
- [fixture-vs-example.md](design/fixture-vs-example.md) — **realism fixture vs
  teaching example**: why the noisy shop stays standalone, why `saml-app` ships its
  own minimal example, and the auth/website separation that's on the critical path.
- [decisions.md](design/decisions.md) — locked decisions log (token format, where
  credentials live, what gets gated).

### development-state.md — current progress + roadmap
- [development-state.md](development-state.md) — what's built, what's next, and the
  branch plan across both variants and `saml-app`.

## Quick task → file routing
- *"Implement / change login here"* → architecture/jwt-app.md + design/decisions.md
- *"Add JWKS / ES256 verification so saml-app cookie variant works"* → **support_jwks.md** (complete task spec)
- *"Why session vs JWT? / which is better?"* → design/session-vs-jwt.md
- *"Should this ship inside saml-app? / is it too noisy?"* → design/fixture-vs-example.md
- *"What is this app for? / how does saml-app use it?"* → architecture/overview.md
- *"What's done / what's the plan?"* → development-state.md
