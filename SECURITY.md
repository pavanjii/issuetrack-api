# Security

This document describes the security posture of IssueTrack API: what is protected, how, what has been verified, and what is known to be missing. It is deliberately honest about limitations.

Last reviewed: 21 November 2026.

## Scope and assumptions

- A small REST API (Node.js, Express) for tracking issues, deployed on Render behind Cloudflare and Render's proxy.
- **Single service account.** There is no user registration. One username and one bcrypt password hash are configured through environment variables.
- Data is stored in a JSON file on the server's filesystem. This is a portfolio/learning project, not a production system handling sensitive data.

## Security controls

| Control | Detail | Verification |
|---|---|---|
| Authentication | `POST /auth/token` checks the password against a bcrypt hash and returns a signed JWT. All `/issues` routes require `Authorization: Bearer <token>`. Public routes: `/`, `/health`, `/auth/token`. | Automated tests; live login and protected request confirmed on Render |
| Token validation | Tokens are signed and verified with the server secret, with the algorithm pinned to HS256. Tests cover missing, malformed, invalid, wrong-secret, expired and unsigned (`alg: none`) tokens. | Automated tests |
| Secrets handling | Credentials and the signing secret come from environment variables. `.env` is git-ignored; `.env.example` holds placeholders only. The server fails closed (HTTP 500) if auth configuration is missing. | Automated tests; `.env` confirmed absent from git history |
| Security headers | Helmet is applied first, so headers appear on all responses including 401 and 404. `X-Powered-By` is removed. | Automated tests; headers observed on the live service |
| Rate limiting | Failed logins: 10 per 15 minutes per IP (successful logins are not counted). All other routes: 100 requests per 15 minutes per IP, `/health` excluded. | Automated tests; behaviour observed on Render |
| Proxy handling | `TRUST_PROXY_HOPS=2` on Render so the limiter sees the real client IP. Verified that clients get separate counters and that a spoofed `X-Forwarded-For` header does not reset the counter. | Manual tests against the live service |
| Input validation | Title, status and priority are validated; invalid input returns 400 with details. | Automated tests |
| Error handling | Central handler returns generic messages for unexpected errors. Unknown-username and wrong-password logins return the same response body. | Automated tests |
| Transport security | HTTPS is provided by the hosting platform; `Strict-Transport-Security` is sent. | Header observed on the live service |

## Threat model (STRIDE)

| Threat | Example | Mitigation | Status |
|---|---|---|---|
| **Spoofing** | Attacker guesses or brute-forces the login; forges or replays a token | bcrypt hash; failed-login rate limit; tokens signed with a secret; tokens expire (default 1 hour); `alg: none` rejected | Mitigated, with the limitations below |
| **Tampering** | Modifying issues without authorisation; altering a token | All `/issues` routes require a valid token; signature verification; input validation | Mitigated. Any valid token can modify any issue |
| **Repudiation** | Denying a change was made | None beyond a single shared account. No audit log of who changed what | **Not mitigated** |
| **Information disclosure** | Leaking secrets, stack traces or server details | Secrets in environment only; generic error messages; `X-Powered-By` removed; same response for unknown user and wrong password | Mitigated, except the timing note below |
| **Denial of service** | Request flooding; oversized bodies | Per-IP rate limits; Express's default JSON body size limit | Partially mitigated. See limitations |
| **Elevation of privilege** | Reaching protected data without a token; using one account's token for broader access | Middleware on all `/issues` routes; single role only | Mitigated. There are no roles to escalate between |

## Known limitations

These are real gaps, not hypothetical ones.

1. **Rate-limit counters live in memory.** They reset whenever the server restarts or redeploys, and would not be shared across multiple instances. A shared store (for example Redis) would be needed for production.
2. **Limits are per IP.** Clients behind a shared IP (an office or mobile carrier network) share a counter, and an attacker with many IPs can distribute attempts.
3. **Single shared account, no revocation.** There is one set of credentials. Issued tokens cannot be revoked before they expire, short of rotating `JWT_SECRET`, which invalidates all tokens. There is no refresh-token flow.
4. **No authorisation model.** A valid token grants full read/write access to every issue.
5. **Login timing difference.** An unknown username returns before the bcrypt comparison runs, so it responds faster than a wrong password for a real username. With a single configured account the practical risk is low, but it is a username-enumeration signal.
6. **No audit logging.** There is no record of authentication attempts or data changes beyond default platform logs.
7. **JSON file storage.** There is no locking or concurrent-write protection, and on hosting with an ephemeral filesystem data may not survive restarts or redeploys. It is not suitable for data that matters.
8. **Development dependency advisories.** At the last audit, the production dependency audit was clean, while four moderate advisories remained in the development-only dependency chain (`c8`, `test-exclude`, `glob`, `minimatch`). They do not ship in production. Audits should be re-run periodically.
9. **Scanning scope:** A passive-only OWASP ZAP session was run on 21 November 2026 by browsing the public endpoints; no active scan was run. The Medium alert came from a Microsoft Edge background request (a third-party host contacted by the test browser), and the Sites tree showed the test browser also contacting other third-party hosts. The remaining Low and Informational alerts were not each traced to a specific host. Direct header checks of `/`, `/health`, `/issues` and an unknown path showed HSTS and `nosniff` present and no cookies or CORS headers. Authenticated endpoints were not scanned by ZAP and are covered by the automated tests only. Further input-validation hardening is still planned.

## Operational notes

- **Never commit `.env`** or paste secrets, hashes or tokens into issues, chat or logs. Use separate credentials and a separate `JWT_SECRET` for production and local testing.
- **Proxy hops:** `TRUST_PROXY_HOPS` depends on how many proxies sit in front of the app. It was set to 2 for Render after testing. Too low merges all clients into one counter; too high lets clients spoof their IP and evade the limiter. Re-check it if the hosting setup changes.
- **Rotating credentials:** change `AUTH_PASSWORD_HASH` and `JWT_SECRET` in the hosting dashboard and redeploy. All existing tokens become invalid.

## Reporting a vulnerability

This is a personal project. If you find a security problem, please contact the maintainer through GitHub ([github.com/pavanjii](https://github.com/pavanjii)) and avoid posting exploit details in public issues.