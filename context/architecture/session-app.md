# Session Variant — Server-Side Session Login

**Branch:** `private-shop-session` (branch from `private-shop` — gets the full
working shop for free, then swap `src/auth/` only).
**Status:** Complete. Deployed at `https://private-shop-session-4732724.fastedge.cdn.gc.onl/` (appId `848393`).

Represents a classic customer whose login is **stateful**: the server holds the
session; the cookie carries only an opaque id (PHP `$_SESSION`, Rails, Django,
`express-session` style).

## Mechanism

- On login, the server creates a session record `{ sessionId → user, expiry }`
  and sends the client an **opaque random `sessionId`** cookie.
- On each request, the server **looks up** that id in its store to recover the
  identity. Identity is never in the cookie.
- Server-side revocation is instant (delete the record) — the main advantage over
  stateless JWTs.

## The storage problem on FastEdge (and our stand-in)

FastEdge gives app code **no writable persistent store**: `KvStore` is
read-only from app code; there's no DB; WASM keeps nothing in memory between
requests. A *real* customer has their own Redis/DB behind their origin.

For this fixture we back the session store with **`fastedge::cache`** (`Cache`)
as a stand-in. This is illustrative, not how a production customer would do it —
must be called out in any docs/demo.

## The `fastedge::cache` Cache API — what it actually is

**Important:** this is NOT the browser `caches.open()` / Cache Storage API.
It is a FastEdge-specific static class — completely different interface.

```ts
import { Cache } from "fastedge::cache";
```

It is a **POP-local key/value store with TTL**. All methods are static and return
`Promise`. The full method surface is:

| Method | Signature |
|--------|-----------|
| `Cache.get(key)` | `(key: string) => Promise<CacheEntry \| null>` |
| `Cache.exists(key)` | `(key: string) => Promise<boolean>` |
| `Cache.set(key, value, options?)` | `(key: string, value: CacheValue, options?: WriteOptions) => Promise<void>` |
| `Cache.delete(key)` | `(key: string) => Promise<void>` |
| `Cache.expire(key, options)` | `(key: string, options: WriteOptions) => Promise<boolean>` |
| `Cache.incr(key, delta?)` | `(key: string, delta?: number) => Promise<number>` |
| `Cache.decr(key, delta?)` | `(key: string, delta?: number) => Promise<number>` |
| `Cache.getOrSet(key, populate, options?)` | coalesced miss-fill |

`WriteOptions`: pass exactly one of `{ ttl: number }` (seconds), `{ ttlMs: number }`, or `{ expiresAt: number }` (Unix epoch seconds).

`CacheValue` accepted by `set`: `string | ArrayBuffer | ArrayBufferView | ReadableStream | Response`.

`CacheEntry` (returned by `get`): `.text()`, `.json()`, `.arrayBuffer()` — all return `Promise` but resolve immediately (bytes already in memory).

### Key constraint: no listing or scanning (but purgePrefix IS available)

`Cache.purgePrefix(prefix)` and `Cache.purge()` **do exist** in the real API
(the old MCP plugin docs were wrong about this). But there is still **no `scan()`
or `list()`** — you cannot enumerate keys from app code.

`Cache.purge()` — deletes all entries for the app, returns `Promise<number>` (count).
`Cache.purgePrefix(prefix)` — deletes all entries whose keys start with `prefix`,
returns `Promise<number>`.

**Consequence for listing:** to support a `/manage-sessions` page that lists
individual sessions, we must still maintain our own **session index** — a separate
Cache entry storing session metadata as JSON. The index is updated on login and
logout, and pruned lazily when the manage page loads (drops entries where the
underlying session key has TTL-expired).

`purgePrefix` handles bulk deletion natively — no need to iterate the index for
that operation.

## Key naming

All entries use the prefix `private-shop-sessions:` to namespace them:

| Key | Content |
|-----|---------|
| `private-shop-sessions:{uuid}` | `{ username, createdAt }` JSON, TTL = 8h |
| `private-shop-sessions:_index` | `string[]` JSON array of live UUIDs, no TTL |

The index is the source of truth for the manage page. Natural expiry of individual
session entries (Cache TTL) means the index can contain stale IDs — these are
pruned lazily when `listSessions()` is called (it probes each ID and drops ones
where `Cache.get()` returns null).

## Planned file structure (session variant only)

Compared to the JWT variant, only `src/auth/` changes. Everything else
(`components/`, `data/`, `render.tsx`, `config.ts`) is identical.

```
src/auth/
  session.ts        ← replaces jwt.ts
  middleware.ts     ← same filename, swapped internals
```

### `src/auth/session.ts` — the session store

Exports:
- `SESSION_COOKIE = "session_id"` (different from JWT's `"auth_token"`)
- `SESSION_TTL = 28800` (8h in seconds)
- `createSession(username) → Promise<string>` — generates UUID, Cache.set, adds to index, returns id
- `lookupSession(id) → Promise<string | null>` — Cache.get → username or null
- `deleteSession(id) → Promise<void>` — Cache.delete + remove from index
- `listSessions() → Promise<Array<{id, username, createdAt}>>` — reads index, probes each, prunes dead ids
- `deleteAllSessions() → Promise<void>` — deletes each entry + clears index

### `src/auth/middleware.ts` — same interface, different implementation

- `sessionAuth(c, next)` — replaces `jwtAuth`; reads `session_id` cookie, calls `lookupSession`, sets `c.var.user`
- `attemptLogin(username, password, c)` — calls `createSession`, sets cookie
- `doLogout(c)` — calls `deleteSession` with id from cookie, deletes cookie

### `src/index.tsx` changes

- Register `sessionAuth` middleware instead of `jwtAuth`
- Add manage-sessions routes (see below)

## The `/manage-sessions` page

An SSR admin page at `/manage-sessions`. Auth-gated (redirects to login if no
valid session). Shows:

- Table of active sessions read from the index: truncated ID, username,
  created-at timestamp, "Revoke" button per row
- "Purge All" button → `POST /manage-sessions/purge` (uses `Cache.purgePrefix`)
- Prominent note about per-PoP limitation

The index (`private-shop-sessions:_index`) stores full metadata
`Array<{id, username, createdAt}>` — so listing requires one Cache read, not N.
The manage page calls `listSessions()` which also lazily prunes stale index entries
(sessions that have TTL-expired without an explicit logout).

Implemented as a Hono SSR React page, consistent with the rest of the shop.
Uses form POSTs (no client-side fetch) — HTML-first, consistent with the login form.

### New routes in `src/index.tsx`

```
GET  /manage-sessions              → render ManageSessionsPage (auth-gated)
POST /manage-sessions/delete/:id   → deleteSession(id), redirect back
POST /manage-sessions/purge        → deleteAllSessions(), redirect to /login
```

## Env vars (session variant)

| Var | Required | Notes |
|-----|----------|-------|
| `PASSWORD` | Yes (default `"authme"`) | Unchanged from JWT variant |
| `SESSION_SECRET` | **Removed** | Not needed — no JWT signing |

## Cookie

`session_id` cookie: `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`.
Cookie carries **no identity** — only the opaque lookup key.

## Known limitations (for demo documentation)

- **Per-PoP**: Cache is local to one FastEdge PoP. Sessions created at Frankfurt
  don't exist at Singapore. In real multi-PoP deployment, users would lose sessions
  as CDN routes them to different PoPs. Acceptable for single-PoP demo; must be
  documented on the manage page and in any demo scripts.
- **Index races**: concurrent logins can lose index updates (read-modify-write on
  `_index` is not atomic). Fine for a single-user demo fixture.
- **Not production**: a real customer's session store is Redis or a DB, not a POP
  cache. The fixture is illustrative of the *pattern*, not the *infrastructure*.

## Why this variant matters for `saml-app`

It proves the **stateful** integration path: `saml-app` must be able to *establish
a session* in the customer's existing store (or hand off in a way their session
layer accepts), not just mint a token. This is the harder, more common enterprise
case. The instant-revocation demonstration (delete from index, session immediately
invalid) is the key differentiator from the JWT variant.

## Status / next steps

The plan above is agreed. The plugin reference docs for `fastedge::cache` were
found to be outdated during design (the old context mentioned `caches.open()` /
browser Cache API; the real API is the static `Cache` class above). The plugin
docs are being updated before implementation begins. Once updated, implementation
can proceed directly from this file — no further design discussion needed.
