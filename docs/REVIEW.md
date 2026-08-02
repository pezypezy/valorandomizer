# Valorandomizer review

- Review date: 2026-08-02
- Baseline: `origin/main` at `50f138f`

This review compared the earlier agile-cleanup branch with the current `main` and
ported only the improvements that were still missing. The newer routes, AI beta,
Discord sessions, SEO, and global ranked-data pipeline on `main` remain intact.

## Integrated in this review

- Split Random Pick and Pro Pick into separate client entry points while keeping
  the existing `/[locale]/random-pick` and `/[locale]/pro-pick` URLs.
- Made two-team Pro Pick draws use one shared map, including Discord sessions,
  and added deterministic tests for common-map and duplicate handling.
- Hardened Pro Pick history parsing, storage errors, cross-tab updates, size
  limits, and clear confirmation.
- Cleared stale draw results whenever counts, modes, or filters change.
- Improved keyboard focus, reduced-motion behavior, live-result announcements,
  control labels, mobile touch targets, and Japanese/Korean Pro Pick copy.
- Added full-project linting, explicit type checking, and a single `pnpm check`
  quality gate to CI.
- Added baseline response-security headers and removed the framework signature
  header.
- Updated framework and deployment dependencies and applied safe transitive
  dependency overrides.
- Aligned the ranked-meta documentation with the implemented global ten-minute
  collector and its anonymous data-retention contract.

## Verification snapshot

- `pnpm check`: passed (lint, TypeScript, 58 unit tests).
- `pnpm build`: passed; 38 pages generated.
- Browser checks: passed for mobile layout, language navigation, URL-backed
  Random/Pro state, drawing, result clearing, shared-map selection, and security
  headers.
- Local OpenNext bundling reaches the Worker packaging stage, but Windows cannot
  read one generated package symlink. The Ubuntu GitHub Actions build is the
  authoritative Cloudflare check.

## Remaining backlog

### High value

1. Add end-to-end tests for the three public pick flows, Discord sessions, and
   the private ranked-meta login/error paths.
2. Make `agents:sync` transactional: download into a temporary directory,
   validate content type and size, then replace the current assets atomically.
3. Compress or resize the agent artwork. Current portraits and icons total about
   22 MB and image optimization is disabled for the Cloudflare deployment.

### Monitor

- Production dependency audit reports the optional `sharp` package below its
  patched release. It arrives through the Next/OpenNext toolchain; forcing the
  incompatible major version is riskier than monitoring upstream updates.
- Observe route/rank sample coverage, Riot rate-limit behavior, recommendation
  stability, and the daily AI quota after production data accumulates.
- Keep the runtime versions used locally and in CI aligned when the next Node or
  pnpm upgrade is scheduled.
