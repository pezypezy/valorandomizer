# Valorandomizer

A **Valorant team random picker**. Set how many agents you want from each of the
four roles (Duelist / Initiator / Controller / Sentinel), then summon a random
five-agent squad — with real agent portraits and a sci-fi UI.

## Tech stack

- **Next.js 16** (App Router, Route Handlers) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (CSS-first `@theme` tokens)
- **next-intl v4** for i18n (`ja` default / `en` / `ko`), routed via `app/[locale]`
- **Cloudflare Workers** via `@opennextjs/cloudflare`
- **Cloudflare D1** for anonymous match aggregates, recommendation snapshots, and AI usage accounting
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
pnpm build         # production Next.js build
pnpm lint          # full-project ESLint validation with zero warnings
pnpm typecheck     # generate Next.js route types and run TypeScript
pnpm test          # unit tests for picker, Discord, statistics, scoring, and Riot normalization
pnpm check         # lint + typecheck + unit tests
pnpm agents:sync   # re-fetch the agent roster + portraits
pnpm cf:build      # build the OpenNext Cloudflare worker
pnpm preview       # build and preview through Wrangler
pnpm deploy        # build and deploy through Wrangler
```

## Private ranked-meta beta

The home-page **AI Composition** card is the participant-facing entry point. It
checks the shared password and then opens:

```text
/ja/ai-composition
/en/ai-composition
/ko/ai-composition
```

Operators can also use the direct administration/login entry point:

```text
/ja/meta-beta
/en/meta-beta
/ko/meta-beta
```

Both entry points render the same protected dashboard after authentication.

It contains:

- map and rank filters;
- theory, off-meta, and solo-queue-friendly recommendation cards;
- a shared-password login using a seven-day signed `HttpOnly` cookie;
- Workers AI chat with a deterministic fallback when the AI binding is unavailable;
- a token-free relevance filter that rejects unrelated questions and prompt-injection attempts before any model call;
- Cloudflare rate limiting for login and chat requests;
- D1-backed recommendation snapshots with a clearly marked sample-data fallback;
- daily AI limits of 150 requests for the whole group and 20 requests per browser session;
- a ten-minute global Riot recent-match collector and a daily 04:00 JST recommendation rebuild.

### Data scope

The live collector uses Riot's recent Competitive match endpoint for the supported `na`, `eu`, `ap`, and `kr` routes. It records discovered match IDs, retrieves details under a configurable per-run budget, deduplicates matches, and stores only the anonymous match/team fields needed for aggregate composition statistics.

Player names, Riot IDs, and PUUIDs are not persisted in the aggregate dataset. The retained fields are limited to source route/group, match ID, map, patch, time, team composition, rank bucket, winner, round score, and recommendation eligibility. See [`docs/global-ranked-data-source.md`](docs/global-ranked-data-source.md) for the source and privacy contract.

### Required secrets and variables

Set the private beta secrets:

```bash
wrangler secret put META_BETA_PASSWORD
wrangler secret put META_BETA_AUTH_SECRET
wrangler secret put RIOT_API_KEY
```

Use a random value of at least 32 bytes for `META_BETA_AUTH_SECRET`. For local development, put the same names in `.dev.vars` and do not commit that file.

The API key stays server-side and is sent only through the `X-Riot-Token` request header. Optionally configure `RIOT_MATCH_DETAIL_BUDGET` as a Worker variable (1–250, default 120) to cap detail requests in each ten-minute collection run.

Workers AI is bound as `AI` in `wrangler.jsonc` and currently uses:

```text
@cf/zai-org/glm-4.7-flash
```

Unrelated messages are rejected before the Workers AI call and do not consume AI quota. If Workers AI is unavailable or returns an error, the chat returns a rule-based explanation from the current recommendation dataset instead of breaking the page.

### D1 setup

Use the setup helper to create or discover the database, write the `DB` binding
to `wrangler.jsonc`, apply migrations, and configure secrets:

```bash
pnpm meta:setup
```

Review the generated binding before committing it. To apply migrations manually
to an already bound database, run:

```bash
wrangler d1 migrations apply valorandomizer --local
wrangler d1 migrations apply valorandomizer --remote
```

See [`docs/ranked-meta-setup.md`](docs/ranked-meta-setup.md) for non-interactive,
secret-free, and deploy options.

The schema under `migrations/` includes:

- anonymous matches and two team-result rows per match;
- daily map/rank composition statistics, including an `All` rank bucket;
- rolling recommendation snapshots;
- global and per-session AI usage counters;
- global match-discovery, ingest-run, route-group, and dataset-coverage tables;
- Riot content map aliases.

Until three recommendation rows exist for the selected map and rank, `/api/meta-beta/stats` returns clearly marked sample data. The dashboard switches automatically to `D1 snapshot` after real rows are available.

### Scheduled jobs

Cloudflare cron expressions are UTC:

- `*/10 * * * *` — discover recent Competitive matches across supported routes, fetch a bounded number of details, and rebuild affected daily statistics;
- `0 19 * * *` — at 04:00 JST, combine the current patch's last seven days and write theory, off-meta, and solo-queue recommendation snapshots.

The AI allowance follows Workers AI's daily reset boundary at `00:00 UTC`, which is `09:00 JST`. Usage counters use the same UTC date key so the UI and provider reset together.

## Recommendation safeguards

The scoring engine applies:

- Bayesian win-rate shrinkage;
- Wilson lower confidence bounds;
- minimum sample and active-day requirements;
- day-to-day volatility scoring;
- role-balance checks;
- separate scoring axes for theory, off-meta, and solo queue;
- distinctness checks so the three cards are not effectively the same composition.

Five-duelist, no-controller, duplicate-agent, undersampled, malformed, and similar role-collapse compositions may remain visible in future raw-stat tables, but they cannot become recommendation cards.

## Important files

- `lib/meta-beta/auth.ts` — password session signing and Cloudflare binding access.
- `lib/meta-beta/relevance.ts` — token-free scope and prompt-injection filter.
- `lib/meta-beta/riot-client.ts` — server-side Riot content, matchlist, and match requests.
- `lib/meta-beta/normalize-match.ts` — anonymous match/team normalization.
- `lib/meta-beta/riot-global-collector.ts` — recent-match discovery, retry/backoff, detail retrieval, and deduplication.
- `lib/meta-beta/global-ingest.ts` — provider-neutral normalization and global aggregate persistence.
- `lib/meta-beta/daily-stats.ts` — daily map/rank and `All`-rank aggregates.
- `lib/meta-beta/scoring.ts` — Bayesian/Wilson correction, exclusions, and category scores.
- `lib/meta-beta/aggregation.ts` — rolling seven-day recommendation snapshot writer.
- `lib/meta-beta/stats.ts` — D1 recommendation lookup with sample fallback.
- `lib/meta-beta/quota.ts` — D1-backed daily AI allowance reservation and status.
- `custom-worker.ts` — OpenNext fetch handler plus ten-minute collection and daily rebuild cron handlers.
- `app/api/meta-beta/` — login/logout, stats, quota, collection-status, and guarded AI endpoints.
- `components/meta/MetaBetaDashboard.tsx` — the private ranked-meta dashboard and chat UI.

## Roadmap

- **Production access** — maintain the required Riot production API approval and monitor rate limits.
- **Coverage validation** — review route/rank sample sizes, scoring behavior, and recommendation usefulness.
- **Source enrichment** — add server-cluster data only from an explicitly approved source with compatible terms.

## Credits

Agent names, portraits, and icons are property of Riot Games, fetched via the
community [valorant-api.com](https://valorant-api.com).
