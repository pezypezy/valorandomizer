# Valorandomizer

A **Valorant team random picker**. Set how many agents you want from each of the
four roles (Duelist / Initiator / Controller / Sentinel), then summon a random
five-agent squad — with real agent portraits and a sci-fi UI.

## Tech stack

- **Next.js 16** (App Router, Route Handlers) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (CSS-first `@theme` tokens)
- **next-intl v4** for i18n (`ja` default / `en` / `ko`), routed via `app/[locale]`
- **Cloudflare Workers** via `@opennextjs/cloudflare`
- **Cloudflare D1** for ranked-meta snapshots and AI usage accounting
- **Cloudflare Workers AI** for the private composition adviser
- **motion** (framer-motion) + custom arwes-style frames / glow / scanlines
- **pnpm**
- Agent roster + portraits from [valorant-api.com](https://valorant-api.com)

> Theme: primary `#ff4655`, base `#1a242e`.

## Getting started

```bash
pnpm install
pnpm dev          # http://localhost:3000  (redirects to /ja)
```

Other scripts:

```bash
pnpm build         # production build
pnpm test          # unit tests for picker, relevance filtering, stats, and quota logic
pnpm agents:sync   # re-fetch the agent roster + portraits into public/agents and lib/agents.ts
pnpm cf:build      # build for Cloudflare Workers
pnpm deploy        # deploy through OpenNext / Wrangler
```

## Private ranked-meta beta

The password-protected beta lives at:

```text
/ja/meta-beta
/en/meta-beta
/ko/meta-beta
```

It contains:

- map and rank filters;
- theory, off-meta, and solo-queue-friendly recommendation cards;
- a shared-password login using a seven-day signed `HttpOnly` cookie;
- Workers AI chat with a deterministic fallback when the AI binding is unavailable;
- a token-free relevance filter that rejects unrelated questions and prompt-injection attempts before any model call;
- Cloudflare rate limiting for login and chat requests;
- D1-backed recommendation snapshots with a sample-data fallback;
- daily AI limits of 150 requests for the whole group and 20 requests per browser session.

### Required secrets

Set both secrets before deploying:

```bash
wrangler secret put META_BETA_PASSWORD
wrangler secret put META_BETA_AUTH_SECRET
```

Use a random value of at least 32 bytes for `META_BETA_AUTH_SECRET`. For local `next dev`, put the same names in `.dev.vars` and do not commit that file.

Workers AI is bound as `AI` in `wrangler.jsonc` and currently uses:

```text
@cf/zai-org/glm-4.7-flash
```

Unrelated messages are rejected before the Workers AI call and do not consume AI quota. If Workers AI is unavailable or returns an error, the chat returns a rule-based explanation from the current recommendation dataset instead of breaking the page.

### D1 setup

Create the database:

```bash
wrangler d1 create valorandomizer
```

Copy the generated `database_id` into the commented `d1_databases` block in `wrangler.jsonc`, then apply migrations:

```bash
wrangler d1 migrations apply valorandomizer --local
wrangler d1 migrations apply valorandomizer --remote
```

The schema under `migrations/` includes:

- normalized match and team-result rows;
- daily composition statistics;
- recommendation snapshots;
- global and per-session AI usage counters.

Until three recommendation rows exist for the selected map and rank, `/api/meta-beta/stats` intentionally returns clearly marked sample data. The dashboard switches automatically to `D1 snapshot` after real rows are available.

The AI allowance follows Workers AI's daily reset boundary at `00:00 UTC`, which is `09:00 JST`. Usage counters use the same UTC date key so the UI and provider reset together.

## How it works

- `lib/roles.ts` — role definitions, accent palette, the `Agent` type, team size (5).
- `lib/agents.ts` — **auto-generated** roster (`pnpm agents:sync`). Do not edit by hand.
- `lib/picker.ts` — pure `pickTeam()` / `validateCounts()` (Fisher–Yates, role-aware, supports locked agents).
- `lib/meta-beta/auth.ts` — password session signing and Cloudflare binding access.
- `lib/meta-beta/relevance.ts` — token-free scope and prompt-injection filter.
- `lib/meta-beta/stats.ts` — D1 recommendation lookup with sample fallback.
- `lib/meta-beta/quota.ts` — D1-backed daily AI allowance reservation and status.
- `app/api/meta-beta/` — login/logout, stats, quota, and guarded Workers AI endpoints.
- `components/meta/MetaBetaDashboard.tsx` — the private ranked-meta dashboard and chat UI.
- `scripts/fetch-agents.ts` — downloads real portraits/icons into `public/agents/<id>/` for offline-safe serving.

## Roadmap

- **Riot data phase** — current-patch, rolling seven-day collection with map/rank filters and duplicate prevention.
- **Recommendation phase** — production theory, off-meta, and solo-queue scores with sample-size and role-balance guards.
- **Expansion phase** — Japan-first release, then existing language regions, then worldwide coverage.

## Credits

Agent names, portraits, and icons are property of Riot Games, fetched via the
community [valorant-api.com](https://valorant-api.com).
