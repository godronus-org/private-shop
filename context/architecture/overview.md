# Overview — Product Vision & Why These Apps Exist

## The real product: `saml-app` (separate project)

Located at `/home/gdoco/dev/gcore/backend/apps/saml-app` (TS / Hono, already
speaks SAML, multi-provider SSO). It is an **edge-deployed auth enhancer**: a
customer who already runs a website with its own login can put our FastEdge app
**in front of their site** to add OAuth / SSO / SAML login capability **without
rewriting their backend**.

`privateShop` does **not** rebuild any of that. Do not implement SSO/SAML here.

## What `privateShop` is: a customer stand-in / test fixture

`privateShop` simulates **"a customer's existing site that already has login."**
We build it so we have something realistic to point `saml-app` at and prove the
integration end-to-end — and to produce a concrete *"here's what you, the
customer, have to change"* guide.

It is a **realism fixture, not a shipped teaching example.** Its product noise
(products, basket, theme) is justified *because* realism is the point. The clean,
customer-facing teaching artifact is a separate, minimal example that lives in
`saml-app` — do **not** fold this noisy shop into `saml-app`. This split is the
governing decision; read [../design/fixture-vs-example.md](../design/fixture-vs-example.md).

## Why two variants

Real customers fall into two camps based on how they currently track logged-in
users. We build one fixture per camp so our integration story covers both:

| Variant | Mechanism | Lives on | Represents |
|---|---|---|---|
| **JWT app** | Stateless HMAC JWT in HttpOnly cookie (`hono/jwt`) | `private-shop` branch | Modern/edge/serverless customers |
| **Session app** | Opaque session id → server-side session store | `private-shop-session` branch | Classic stateful customers (PHP/Rails/Django-style) |

Same shop, same UI — only the auth mechanism differs. See
[../design/why-two-apps.md](../design/why-two-apps.md).

## Edge-integration model (what we're ultimately proving)

```
Browser ──▶ [ Gcore FastEdge: saml-app ] ──▶ Customer site (privateShop)
                 │
                 ├─ intercepts the login flow
                 ├─ federates to an IdP (SAML / OAuth / OIDC)
                 └─ hands the customer site an identity it already understands
                    (a JWT it can verify, or a session it can establish)
```

The key architectural fact: **issue centrally, verify everywhere.** The stateful
issuer (IdP / `saml-app` logic) lives where it can write; the customer app only
ever *verifies*. The two fixtures exercise the two verification styles.

## What "done" looks like

Both `privateShop` variants log a user in on their own, then `saml-app` is slotted
in front and demonstrably enhances each one's login with minimal customer-side
change. The fixtures are the acceptance test for `saml-app`.
