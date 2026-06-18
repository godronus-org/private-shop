# Session Store — `fastedge::cache` (used by `cookie-session` mode)

How the `cookie-session` mode persists sessions. Only relevant when working on
that mode; see [auth-modes.md](auth-modes.md) for the overall model. Lives in
`src/auth/session.ts`.

## The stand-in

A real stateful customer keeps sessions in Redis/DB. FastEdge app code has **no
writable persistent store** (`KvStore` is read-only, no DB, nothing survives in
memory between requests), so this fixture backs the store with **`fastedge::cache`**
as an illustrative stand-in. Call this out in any demo — it's the *pattern*, not
production infrastructure.

## The `fastedge::cache` API — what it actually is

**Not** the browser `caches.open()` / Cache Storage API. It is a FastEdge-specific
static class — a **POP-local key/value store with TTL**. All methods are static
and return `Promise`.

```ts
import { Cache } from "fastedge::cache";
```

| Method | Signature |
|--------|-----------|
| `Cache.get(key)` | `(key) => Promise<CacheEntry \| null>` |
| `Cache.exists(key)` | `(key) => Promise<boolean>` |
| `Cache.set(key, value, options?)` | `(key, value: CacheValue, options?: WriteOptions) => Promise<void>` |
| `Cache.delete(key)` | `(key) => Promise<void>` |
| `Cache.expire(key, options)` | `(key, options: WriteOptions) => Promise<boolean>` |
| `Cache.incr(key, delta?)` / `Cache.decr(key, delta?)` | `=> Promise<number>` |
| `Cache.getOrSet(key, populate, options?)` | coalesced miss-fill |
| `Cache.purge()` | delete all app entries → `Promise<number>` |
| `Cache.purgePrefix(prefix)` | delete entries with key prefix → `Promise<number>` |

- `WriteOptions`: exactly one of `{ ttl }` (seconds), `{ ttlMs }`, `{ expiresAt }` (epoch seconds).
- `CacheValue` for `set`: `string | ArrayBuffer | ArrayBufferView | ReadableStream | Response`.
- `CacheEntry` from `get`: `.text()` / `.json()` / `.arrayBuffer()` (Promises, resolve immediately).
- **No `scan()` / `list()`** — keys cannot be enumerated from app code (which is why we keep our own index, below).

## Key naming & the index

All entries are namespaced with the prefix `private-shop-sessions:`:

| Key | Content |
|-----|---------|
| `private-shop-sessions:{uuid}` | `{ username, createdAt }` JSON, TTL = 8h |
| `private-shop-sessions:_index` | array of live session metadata, no TTL |

Since keys can't be scanned, `/manage-sessions` lists sessions from the `_index`
entry. The index is updated on login/logout and **pruned lazily** in
`listSessions()` (probes each id, drops ones whose session key has TTL-expired).
`Cache.purgePrefix("private-shop-sessions:")` wipes every session *and* the index
in one call. Instant server-side revocation (delete the entry) is this mode's key
advantage over stateless JWTs.

## Known limitations (document in any demo)

- **Per-PoP**: the cache is local to one FastEdge PoP — sessions created at
  Frankfurt don't exist at Singapore. Fine for a single-PoP demo; surfaced on the
  manage page.
- **Index races**: concurrent logins can lose index updates (read-modify-write on
  `_index` isn't atomic). Fine for a single-user fixture.
