# AI Agent Instructions for privateShop

## Governance (REQUIRED)

Read `AGENTS.md` for company-wide agent rules. These are mandatory and override any conflicting behavior. Key rules: never go beyond the assigned task, never change code that was not asked to change, never "improve" or "optimize" without a clear request, always distinguish observations from action requests.

---

## What this app is (10-line version)

`privateShop` is a Hono SSR shop compiled to a FastEdge WASM app. It is **not a product** — it is a **realism fixture**: a stand-in for a customer's existing website that already has login, used to prove Gcore's `saml-app` can enhance that login from the edge. We build it in two auth variants (stateless `hono/jwt`, and server-side session) so the integration story covers both kinds of customer. Do **not** rebuild SSO/SAML here — that lives in `saml-app`. The full rationale, decisions, and roadmap live in `context/` (see below).

---

## CRITICAL: Read Smart, Not Everything

**DO NOT read the whole `context/` folder upfront.** It uses a **discovery-based** layout to minimize tokens.

### Step 1: Read the Index (REQUIRED)

**First action when starting work:** Read `context/INDEX.md`.

It gives you a one-line summary of every context file plus a *task → file* routing table.

### Step 2: Read Based on Your Task (JUST-IN-TIME)

Follow the routing table in `context/INDEX.md`. Only read the file(s) relevant to your task.

| Task Type | What to Read |
|-----------|--------------|
| **Implement / change login here** | `context/architecture/jwt-app.md` + `context/design/decisions.md` |
| **Why session vs JWT? / which is better?** | `context/design/session-vs-jwt.md` |
| **What is this app for? / how does `saml-app` use it?** | `context/architecture/overview.md` |
| **Should this ship inside `saml-app`? / is it too noisy?** | `context/design/fixture-vs-example.md` |
| **Build the session variant** | `context/architecture/session-app.md` |
| **What's done / what's the plan?** | `context/development-state.md` |

---

## Anti-Patterns (What NOT to Do)

**Don't:** read every file in `context/` when the index routes you to one.
**Don't:** rebuild SSO/SAML/OAuth here — it belongs in `saml-app`.
**Don't:** fold this noisy shop into `saml-app` as its example — see `context/design/fixture-vs-example.md`.
**Don't:** edit `../../../wasm/http/js/privateShop/*.wasm` — that is a build artifact.

**Do:** read `context/INDEX.md` first — always.
**Do:** keep auth logic isolated from website code (the integration deliverable depends on it).
**Do:** update the relevant `context/` doc when you make a significant change.

---

## Context Organization

```
http/js/privateShop/
├── CLAUDE.md                       ← YOU ARE HERE
├── AGENTS.md                       ← company-wide agent rules
├── context/
│   ├── INDEX.md                    ← Read first (discovery hub)
│   ├── architecture/
│   │   ├── overview.md             ← product vision, saml-app, edge model
│   │   ├── jwt-app.md              ← JWT variant (this branch)
│   │   └── session-app.md          ← server-side session variant (future)
│   ├── design/
│   │   ├── session-vs-jwt.md       ← the two approaches + industry norms
│   │   ├── why-two-apps.md         ← fixtures rationale
│   │   ├── fixture-vs-example.md   ← realism fixture vs teaching example
│   │   └── decisions.md            ← locked decisions log
│   └── development-state.md        ← current progress + roadmap
├── src/
│   ├── index.tsx                   ← Hono routes + FastEdge fetch handler
│   ├── render.tsx                  ← SSR document renderer
│   ├── config.ts                   ← site theme/config
│   ├── components/                 ← React page/UI components (SSR)
│   └── data/                       ← product data
└── package.json
```

---

## Quick Reference

**Tech Stack:** TypeScript, Hono, React 18 (SSR), FastEdge WASM (StarlingMonkey runtime)
**Branch:** `private-shop` (JWT variant)

**Common Commands:**

| Command | Purpose |
|---------|---------|
| `npm run build` | Build → emits `http_private_shop.wasm` to `wasm/http/js/privateShop/` |
| `npm run lint` | ESLint over `src/` |
| `npm run clean` | Remove `build/` |

---

## Summary

1. Read `context/INDEX.md` first.
2. Use the routing table to find the relevant doc(s).
3. Read only what your task needs.
4. Keep auth isolated from website code.
5. Update `context/` docs after significant changes.
