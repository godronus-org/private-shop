# AI Agent Instructions for privateShop

## Governance (REQUIRED)

Read `AGENTS.md` for company-wide agent rules. These are mandatory and override any conflicting behavior. Key rules: never go beyond the assigned task, never change code that was not asked to change, never "improve" or "optimize" without a clear request, always distinguish observations from action requests.

---

## What this app is (10-line version)

`privateShop` is a Hono SSR shop compiled to a FastEdge WASM app. It is **not a product** — it is a **realism fixture**: a stand-in for a customer's existing website that already has login, used to prove Gcore's `saml-app` can enhance that login from the edge. It is **one wasm** whose auth behavior is selected at runtime by the `AUTH_MODE` env var (`cookie-jwt` | `cookie-session` | `headers`), so a single build covers every kind of customer; deploy it as several apps with different env. Do **not** rebuild SSO/SAML here — that lives in `saml-app`. The rationale and current state live in `context/` (see below).

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
| **How does auth/login work? change it** | `context/architecture/auth-modes.md` |
| **Work on the session store / `/manage-sessions`** | `context/architecture/session-store.md` + `auth-modes.md` |
| **What is this app for? / how does `saml-app` use it?** | `context/architecture/overview.md` |
| **Should this ship inside `saml-app`? / is it too noisy?** | `context/design/fixture-vs-example.md` |

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
private-shop/
├── CLAUDE.md                       ← YOU ARE HERE
├── AGENTS.md                       ← company-wide agent rules
├── context/
│   ├── INDEX.md                    ← Read first (discovery hub + current state)
│   ├── architecture/
│   │   ├── overview.md             ← product vision, saml-app, edge model
│   │   ├── auth-modes.md           ← CANONICAL: the 3 AUTH_MODE modes + strategy
│   │   └── session-store.md        ← fastedge::cache store for cookie-session mode
│   └── design/
│       └── fixture-vs-example.md   ← realism fixture vs teaching example
├── src/
│   ├── index.tsx                   ← Hono routes + FastEdge fetch handler
│   ├── render.tsx                  ← SSR document renderer
│   ├── config.ts                   ← site theme/config
│   ├── auth/                       ← AuthStrategy interface + per-mode strategies
│   ├── components/                 ← React page/UI components (SSR)
│   └── data/                       ← product data
└── package.json
```

---

## Quick Reference

**Tech Stack:** TypeScript, Hono, React 18 (SSR), FastEdge WASM (StarlingMonkey runtime)
**Auth:** one wasm; `AUTH_MODE` env selects `cookie-jwt` (default) | `cookie-session` | `headers`

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
