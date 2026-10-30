# PRODUCTION READINESS

Structural checks for Gate 5 (Code Review). Each item is something to look for in a diff.
Skip categories that don't apply to the project type.

## Data Access
- [ ] **N+1 queries** — Loop fetching related records one-by-one instead of batching (e.g., `for user in users: fetch(user.posts)`)
- [ ] **Missing pagination** — Endpoint returns full table; no `limit`/`offset` or cursor
- [ ] **Unbounded queries** — `SELECT *` or `find({})` with no `WHERE`/filter on a growing table
- [ ] **Unbatched writes** — Individual `INSERT`/`UPDATE` in a loop instead of bulk operation
- [ ] **Missing indexes** — Query filters on columns with no index (check migration files)
- [ ] **No read replica usage** — Heavy read queries hitting the primary database

## Concurrency & Async
- [ ] **Race conditions** — Shared mutable state accessed from concurrent paths without locks/transactions
- [ ] **Missing `await`** — Async function called without `await`; result silently discarded
- [ ] **Unhandled promise rejections** — `.catch()` missing on fire-and-forget promises
- [ ] **Stale closures** — Callback captures a variable that changes before the callback runs (common in React effects and event listeners)
- [ ] **Deadlocks** — Two resources locked in opposite order across code paths
- [ ] **Missing transaction** — Multi-step DB write without a transaction; partial failure leaves inconsistent state

## Memory & Resources
- [ ] **Leaked event listeners** — `addEventListener` / `on()` without corresponding removal on cleanup
- [ ] **Leaked timers** — `setInterval` / `setTimeout` without `clearInterval` / `clearTimeout` on unmount or disposal
- [ ] **Leaked subscriptions** — WebSocket, observable, or pub/sub subscription without unsubscribe
- [ ] **Unbounded cache** — In-memory cache (`Map`, object) that grows without eviction or TTL
- [ ] **Missing connection pool limits** — DB/HTTP pool with no `max` setting; connections grow under load
- [ ] **Large objects in closures** — Closure holds reference to large array/buffer longer than needed

## Error Handling & Resilience
- [ ] **Swallowed errors** — Empty `catch {}` block or `catch (e) { /* ignore */ }`
- [ ] **Missing retry with backoff** — Network/API call fails once and gives up; no retry strategy
- [ ] **No timeouts** — HTTP request or DB query with no timeout; hangs indefinitely under failure
- [ ] **Cascading failures** — One service down takes everything down; no circuit breaker or fallback
- [ ] **Missing graceful shutdown** — Process exits without draining connections or finishing in-flight requests
- [ ] **Silent degradation** — Feature fails but user sees no feedback; error logged only to server

## Frontend State & UI
- [ ] **Missing loading state** — Async operation with no spinner, skeleton, or disabled button
- [ ] **Missing error state** — Network failure shows blank screen instead of error message with recovery action
- [ ] **Optimistic update without rollback** — UI updates before server confirms; no revert on failure
- [ ] **Render loops** — State update inside `useEffect` / `componentDidUpdate` triggers infinite re-renders
- [ ] **Stale UI after mutation** — Cache not invalidated after create/update/delete; user sees old data
- [ ] **Missing empty state** — List/table shows nothing when data is empty; no "No items yet" message

## Architecture
- [ ] **Circular dependencies** — Module A imports B, B imports A (directly or through a chain)
- [ ] **God modules** — Single file with 500+ lines handling multiple unrelated concerns
- [ ] **Tight coupling** — Business logic directly calls infrastructure (e.g., component calls `fetch` instead of a service)
- [ ] **Missing feature flags** — Risky or incomplete feature deployed to all users with no toggle
- [ ] **Hardcoded environment assumptions** — Code assumes `localhost`, specific ports, or file paths that differ across environments
- [ ] **Missing health check** — Service has no `/health` or readiness endpoint for orchestrator to probe
