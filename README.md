# Valorandomizer

A **Valorant team random picker**. Set how many agents you want from each of the
four roles (Duelist / Initiator / Controller / Sentinel), then summon a random
five-agent squad — with real agent portraits and a sci-fi UI.

## Tech stack

- **Next.js 16** (App Router, Route Handlers) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (CSS-first `@theme` tokens)
- **next-intl v4** for i18n (`ja` default / `en` / `ko`), routed via `app/[locale]`
- **Cloudflare Workers** via `@opennextjs/cloudflare`
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
pnpm test          # unit tests for picker and chat relevance filtering
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

It currently contains:

- map and rank filters;
- sample cards for theory, off-meta, and solo-queue-friendly compositions;
- a shared-password login using a seven-day signed `HttpOnly` cookie;
- Workers AI chat with a deterministic fallback when the AI binding is unavailable;
- a token-free relevance filter that rejects unrelated questions and prompt-injection attempts before any model call;
- Cloudflare rate limiting for login and chat requests.

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

If Workers AI is unavailable or reaches an error, the chat returns a rule-based explanation from the sample recommendation data instead of breaking the page.

The current numbers are intentionally marked as sample data. The next phase replaces them with D1-backed, current-patch, rolling seven-day Riot match statistics.

## How it works

- `lib/roles.ts` — role definitions, accent palette, the `Agent` type, team size (5).
- `lib/agents.ts` — **auto-generated** roster (`pnpm agents:sync`). Do not edit by hand.
- `lib/picker.ts` — pure `pickTeam()` / `validateCounts()` (Fisher–Yates, role-aware, supports locked agents).
- `lib/meta-beta/` — private beta authentication, relevance filtering, and sample recommendation data.
- `app/api/meta-beta/` — password login/logout and guarded Workers AI chat endpoints.
- `components/meta/MetaBetaDashboard.tsx` — the private ranked-meta dashboard and chat UI.
- `scripts/fetch-agents.ts` — downloads real portraits/icons into `public/agents/<id>/` for offline-safe serving.

## Roadmap

- **Meta data phase** — Cloudflare **D1** for normalized match/team rows, daily composition aggregates, and recommendation snapshots.
- **Riot data phase** — current-patch, rolling seven-day collection with map/rank filters and outlier correction.
- **Recommendation phase** — production theory, off-meta, and solo-queue scores with sample-size and role-balance guards.
- **Expansion phase** — Japan-first release, then existing language regions, then worldwide coverage.

## Credits

Agent names, portraits, and icons are property of Riot Games, fetched via the
community [valorant-api.com](https://valorant-api.com).
