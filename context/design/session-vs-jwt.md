# Design — Session-State vs JWT

The two industry-standard ways to recognise a user after they've logged in once.
HTTP is stateless, so after verifying a password you need a way to re-identify the
same user on every subsequent request. Two camps:

## 1. Server-side sessions (stateful)

- Server creates a session record (`sessionId → user, expiry`) in a store
  (Redis, DB, memory). Client gets an **opaque** `sessionId` cookie.
- Each request: server **looks up** the id to find who you are.
- Classic model: PHP `$_SESSION`, Rails, Django, `express-session`.

**Pros:** instant server-side revocation; cookie reveals nothing; identity data
stays server-side.
**Cons:** needs a fast, writable, shared store; that store is state to operate and
scale.

## 2. Stateless signed tokens (JWT)

- Server puts the identity *into* the token, **signs** it (HMAC or asymmetric),
  and sends it in the cookie. Nothing stored server-side.
- Each request: server **re-verifies the signature**. Valid signature ⇒ authentic,
  untampered.
- Model: JWT, `hono/jwt`, Rails `cookie_store`, `iron-session`.

**Pros:** zero server storage; scales infinitely; **ideal for edge/serverless**.
**Cons:** can't revoke a single token before expiry (mitigate with short
lifetimes + refresh tokens); payload is readable unless encrypted.

## Why a real customer has one or the other

- Modern / serverless / edge / SPA-API stacks → **JWT** (no session infra needed).
- Established server-rendered monoliths → **server-side sessions** (it's the
  framework default they started with).

Both are legitimate and widespread — which is exactly why we build a fixture for
each. See [why-two-apps.md](why-two-apps.md).

## Signing: HMAC vs asymmetric (relevant once `saml-app` issues tokens)

- **HS256 (HMAC, shared secret):** signer and verifier share one key. Fine when an
  app signs and verifies *its own* cookies (what the JWT fixture does).
- **RS256 / ES256 (asymmetric):** issuer signs with a private key; any number of
  apps verify with the public key, published at a JWKS endpoint
  (`/.well-known/jwks.json`). **No shared secret changes hands** — the right model
  when one issuer (`saml-app`) serves many relying parties. FastEdge supports
  RSASSA-PKCS1-v1_5 and ECDSA `verify`, so edge verification works.

## Edge fit (FastEdge)

FastEdge app code has **no writable persistent store** (KV is read-only, no DB, no
cross-request memory) but **does** have `crypto.subtle` sign/verify. ⇒ JWT
verification is native at the edge; server-side sessions need an external store
(we fake it with the Cache API in the session fixture — see
[../architecture/session-app.md](../architecture/session-app.md)).
