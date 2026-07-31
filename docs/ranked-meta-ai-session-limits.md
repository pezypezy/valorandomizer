# Ranked-meta AI session limits

The private ranked-meta chat uses the random nonce inside the signed private-beta session cookie as its rate-limit key.

## Enforced limits

- 3 chat requests per 60 seconds for each signed session.
- When a session exceeds that rate, Cloudflare blocks that session for 300 seconds.
- D1 separately allows at most 20 actual Workers AI calls per UTC day for each session.
- D1 also caps the whole private group at 150 actual Workers AI calls per UTC day.
- Cached quick-prompt answers do not consume the D1 AI-call allowance, although the chat endpoint rate limit still applies.

The limiter runs after session verification and before relevance checks, cache lookup, quota reservation, or a Workers AI call. Requests rejected by the limiter therefore cannot consume AI tokens.

## Scope

This is session-based protection rather than IP-based protection. A new authenticated session receives a new session key, so the global daily cap and the existing login limiter remain the backstops against attempts that create many sessions. For a broad public release, Cloudflare WAF or Turnstile can be layered on top without changing the session quota design.
