# Design — Why Two privateShop Apps

## They are fixtures, not products

Both `privateShop` variants exist to **test and demonstrate `saml-app`**. They
simulate a customer's existing website that already has login. We do not ship them
as products; we point `saml-app` at them.

> They are **realism fixtures**, not the customer-facing teaching example. The
> "show both variants cleanly so a customer can learn the integration" job belongs
> to a separate **minimal** example inside `saml-app`. That distinction changes the
> branch strategy below — read [fixture-vs-example.md](fixture-vs-example.md).

## One fixture per login camp

Customers fall into the two camps in [session-vs-jwt.md](session-vs-jwt.md). To
prove our integration is realistic, we cover both:

- **JWT variant** (`private-shop` branch, build first) → the stateless / edge-native
  customer. See [../architecture/jwt-app.md](../architecture/jwt-app.md).
- **Session variant** (separate branch, build second) → the stateful customer. See
  [../architecture/session-app.md](../architecture/session-app.md).

Same shop, same UI — **only the auth mechanism differs.** Keeping everything else
identical isolates the variable we actually care about: how `saml-app` slots into
each auth style.

## What each one proves

- **JWT app** proves the easy path: `saml-app` hands the customer a token their
  middleware already verifies — no shared state needed.
- **Session app** proves the harder, more common enterprise path: `saml-app` must
  *establish/handoff a session* into the customer's existing session layer, not
  just mint a token.

## The deliverable they produce

Beyond passing, the fixtures yield the concrete **"what a customer must change to
integrate"** guide — one per camp. That integration story is the real output of
this whole exercise.
