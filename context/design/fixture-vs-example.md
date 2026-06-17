# Design — Realism Fixture vs Teaching Example

A distinction that governs **where this app's code should live and how much noise
is acceptable.** There are two different jobs hiding in "demo the integration",
and one artifact cannot be great at both.

## The two jobs

| | **Realism fixture** | **Teaching example** |
|---|---|---|
| Job | *Prove* `saml-app` works against a believable site | *Teach* a customer how to integrate |
| Noise (products, basket, theme) | A **feature** — real customer sites are noisy | A **liability** — every non-auth line is one the reader must skip |
| Form | A full, realistic app (this `privateShop`) | A deliberately tiny app: ~1 public + 1 protected page |
| Audience | Us (internal E2E / acceptance) | Customers |
| Lives | Standalone, in this monorepo | Inside `saml-app` (`examples/`) |

A shop rich enough to be a convincing proof is too noisy to teach from; a thing
stripped down enough to teach cleanly is no longer a realistic proof. Trying to
serve both with one artifact is the core mistake to avoid.

## What the category actually ships

Auth0, Clerk, NextAuth, Lucia, WorkOS all ship `examples/` with **intentionally
tiny** apps (often public-page + protected-page), one per framework/scenario — the
app is boring so auth is the star. **None ship a full shop.** Docs-only is also
insufficient: integration docs not backed by a runnable example rot and aren't
trusted. The norm is **minimal runnable example + docs.**

## Decision

1. **`privateShop` stays a standalone realism fixture** (where it is now). Its
   noise is justified *here* — it's the believable-customer E2E proof.
2. **`saml-app` ships its own purpose-built minimal example** — tiny app, **both
   auth variants visible side by side** (directory per variant sharing a small
   shell) + docs. *This*, not the shop, is the clean "what you change" artifact.
3. **Do not fold the noisy shop into `saml-app`.** The only coupling is "it proves
   it works" — too weak a reason to drag a whole e-commerce app + build/deploy into
   the auth repo.

## Consequences

- **Branches vs directories:** branches suit the realism fixture (each branch =
  one simulated customer). The *teaching* artifact needs both variants visible at
  once → **directories, not branches.** A reader can't diff two branches.
- **The both-variants teaching load migrates** to the minimal `saml-app` example.
  Once that example shows both JWT and session cleanly, the pressure to maintain
  two full `privateShop` branches drops — we may keep just one realistic E2E
  target (e.g. JWT). Not deciding that now. See [why-two-apps.md](why-two-apps.md).

## On the critical path *now* (regardless of final homes)

**Isolate the auth surface from the website code** in `privateShop` so it collapses
to a handful of clearly-labelled files (`middleware`, `auth/jwt`, the `/login`
route). Reasons:
- The stated deliverable — *"what a customer must change to integrate"* — **is**
  that file list.
- Once auth is cleanly isolated, lifting it into a minimal `saml-app` example is
  near-trivial, so the final-home decision can wait.
