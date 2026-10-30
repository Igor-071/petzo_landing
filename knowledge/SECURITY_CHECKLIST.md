# SECURITY CHECKLIST

OWASP Top 10 adapted for code review. Each item is something to look for in a diff.
Tags: `[web]` `[mobile]` `[backend]` `[all]` — skip items that don't match the project type.

---

## A01: Broken Access Control

- [ ] **Missing auth on endpoint** `[backend]` — Route handler has no authentication middleware
- [ ] **Missing authorization check** `[backend]` — Authenticated user can access resources they don't own (IDOR)
- [ ] **Client-side auth only** `[web]` — Access control enforced in the UI but not on the server
- [ ] **Permissive CORS** `[backend]` — `Access-Control-Allow-Origin: *` on authenticated endpoints
- [ ] **Missing CSRF protection** `[web]` — State-changing request has no CSRF token or SameSite cookie
- [ ] **Privilege escalation** `[all]` — User can modify their role or permissions via API (e.g., `{ role: "admin" }` in request body)
- [ ] **Direct object reference** `[backend]` — Resource ID in URL/body used without ownership check (`/api/users/123/data`)

## A02: Cryptographic Failures

- [ ] **Plaintext secrets in code** `[all]` — API keys, passwords, tokens hardcoded in source files
- [ ] **Secrets in client bundle** `[web]` — Server secret exposed via `NEXT_PUBLIC_`, `REACT_APP_`, or bundled config
- [ ] **Weak hashing** `[backend]` — Passwords hashed with MD5, SHA-1, or SHA-256 instead of bcrypt/scrypt/argon2
- [ ] **Missing encryption in transit** `[all]` — HTTP used for API calls or webhook endpoints instead of HTTPS
- [ ] **Sensitive data in URL** `[all]` — Tokens, passwords, or PII passed as query parameters (logged by proxies/servers)
- [ ] **`Math.random()` for security** `[all]` — Used to generate tokens, IDs, or keys; use `crypto.randomUUID()` or `crypto.getRandomValues()`

## A03: Injection

- [ ] **SQL injection** `[backend]` — String concatenation in SQL queries instead of parameterized queries
- [ ] **NoSQL injection** `[backend]` — User input passed directly to MongoDB `$where`, `$regex`, or similar operators
- [ ] **Command injection** `[backend]` — User input in `exec()`, `spawn()`, or backtick shell calls
- [ ] **Path traversal** `[backend]` — User input in `fs.readFile()`, `path.join()` without sanitizing `../` sequences
- [ ] **Template injection** `[backend]` — User input rendered in server-side templates without escaping
- [ ] **XSS (stored/reflected)** `[web]` — User input rendered as HTML via `innerHTML`, `dangerouslySetInnerHTML`, or unescaped template variables
- [ ] **Header injection** `[backend]` — User input in HTTP response headers without newline stripping

## A04: Insecure Design

- [ ] **No rate limiting** `[backend]` — Login, signup, password reset, or API endpoints have no throttle
- [ ] **Missing server-side validation** `[all]` — Input validated only on the client; server accepts anything
- [ ] **Enumeration possible** `[backend]` — Different error messages for "user not found" vs "wrong password" leak account existence
- [ ] **No account lockout** `[backend]` — Unlimited login attempts with no delay or lockout
- [ ] **Predictable resource IDs** `[backend]` — Sequential integer IDs allow enumeration; use UUIDs for external-facing IDs

## A05: Security Misconfiguration

- [ ] **Verbose error responses** `[backend]` — Stack traces, SQL errors, or internal paths leaked to client in production
- [ ] **Missing security headers** `[web]` — No `Content-Security-Policy`, `X-Content-Type-Options`, `Strict-Transport-Security`
- [ ] **Debug mode in production** `[all]` — `DEBUG=true`, verbose logging, or dev-only middleware left enabled
- [ ] **Default credentials** `[all]` — Admin/admin, test accounts, or default API keys in deployed config
- [ ] **Unnecessary features enabled** `[backend]` — GraphQL introspection, directory listing, or TRACE method in production

## A06: Vulnerable and Outdated Components

- [ ] **Known CVEs** `[all]` — Dependency has published vulnerabilities (run `npm audit` / `pip audit`)
- [ ] **Unapproved packages** `[all]` — New dependency not listed in `knowledge/DEPENDENCIES.md`
- [ ] **Pinned to vulnerable version** `[all]` — Lock file pins a dependency with a known vulnerability
- [ ] **Abandoned dependency** `[all]` — Package with no updates in 2+ years or archived repository

## A07: Identification and Authentication Failures

- [ ] **Weak session management** `[web]` — Session token in URL, no expiration, or no rotation after login
- [ ] **Missing JWT expiration** `[backend]` — JWT issued with no `exp` claim or very long TTL (>24h for access tokens)
- [ ] **JWT secret in code** `[all]` — Signing secret hardcoded instead of loaded from environment
- [ ] **No token refresh** `[web]` `[mobile]` — Only access tokens; no refresh flow; user re-enters credentials on expiry
- [ ] **Missing logout invalidation** `[backend]` — Token remains valid after user logs out (no server-side revocation)

## A08: Software and Data Integrity Failures

- [ ] **Unsigned updates** `[all]` — Auto-update mechanism with no signature verification
- [ ] **Untrusted deserialization** `[backend]` — User input passed to `JSON.parse()` then used as code, or to `eval`/`unserialize`
- [ ] **Missing subresource integrity** `[web]` — CDN scripts loaded without `integrity` attribute

## A09: Security Logging and Monitoring Failures

- [ ] **No auth event logging** `[backend]` — Login, logout, failed attempts, password changes not logged
- [ ] **Sensitive data in logs** `[all]` — Passwords, tokens, PII, or credit card numbers logged
- [ ] **No error alerting** `[backend]` — Errors logged but no alert mechanism for anomalies

## A10: Server-Side Request Forgery (SSRF)

- [ ] **Unvalidated URL input** `[backend]` — User-supplied URL fetched by the server without allowlist or scheme check
- [ ] **Internal network access** `[backend]` — Server-side fetch can reach `localhost`, `169.254.x.x`, or internal services

## Additional: Prototype Pollution

- [ ] **`__proto__` access** `[all]` — User input merged into objects via spread/`Object.assign` without sanitizing `__proto__`
- [ ] **`constructor.prototype`** `[all]` — Deep merge or recursive assignment allows overwriting prototype chain
- [ ] **Vulnerable merge libraries** `[all]` — Using `lodash.merge`, `deepmerge`, or similar without input validation
