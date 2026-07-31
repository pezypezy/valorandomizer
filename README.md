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
pnpm test          # unit tests for picker, filters, statistics, scoring, and Riot normalization
pnpm agents:sync   # re-fetch the agent roster + portraits
pnpm cf:build      # build the OpenNext Cloudflare worker
pnpm preview       # build and preview through Wrangler
pnpm deploy        # build and deploy through Wrangler
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
- D1-backed recommendation snapshots with a clearly marked sample-data fallback;
- daily AI limits of 150 requests for the whole group and 20 requests per browser session;
- an hourly opt-in Riot match collector and a daily 04:00 JST recommendation rebuild.

### Data scope

The initial collector is deliberately an **opt-in cohort**, not a claim to represent every Japanese ranked match. It starts from consented players in the private VALORANT group, fetches their official Riot match histories, deduplicates shared matches, and stores only anonymous team-level statistics.

Player names and Riot IDs are not copied into the statistics tables. The retained statistical fields are limited to match ID, map, patch, time, team composition, rank bucket, winner, round score, and recommendation eligibility. The seed PUUID remains in the separate `tracked_players` operational table so the collector can poll the same consented account again.

If Riot later approves broader or RSO-backed access, the collector interface can be expanded without changing the scoring, daily aggregation, recommendation API, or dashboard.

### Required secrets and variables

Set the private beta secrets:

```bash
wrangler secret put META_BETA_PASSWORD
wrangler secret put META_BETA_AUTH_SECRET
wrangler secret put RIOT_API_KEY
```

Use a random value of at least 32 bytes for `META_BETA_AUTH_SECRET`. For local development, put the same names in `.dev.vars` and do not commit that file.

After Riot confirms the approved VALORANT routing host, configure `RIOT_VAL_BASE_URL` as a Worker variable in `wrangler.jsonc` or the Cloudflare dashboard. The API key stays server-side and is sent only through the `X-Riot-Token` request header.

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

- anonymous matches and two team-result rows per match;
- daily map/rank composition statistics, including an `All` rank bucket;
- rolling recommendation snapshots;
- global and per-session AI usage counters;
- opt-in tracked-player and collection-run operational tables;
- Riot content map aliases.

A consented seed account can be inserted after its PUUID is obtained through the approved flow:

```sql
INSERT INTO tracked_players (
  puuid, routing_region, dataset_region, source_type,
  consented_at, enabled, next_poll_at, created_at, updated_at
) VALUES (
  '<PUUID>', '<RIOT_ROUTING_REGION>', 'jp', 'rso',
  unixepoch(), 1, 0, unixepoch(), unixepoch()
);
```

Do not insert a player who has not opted in.

Until three recommendation rows exist for the selected map and rank, `/api/meta-beta/stats` returns clearly marked sample data. The dashboard switches automatically to `D1 snapshot` after real rows are available.

### Scheduled jobs

Cloudflare cron expressions are UTC:

- `17 * * * *` — poll due opt-in players every hour, deduplicate new matches, and rebuild affected daily statistics;
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
- `lib/meta-beta/collection.ts` — opt-in polling, duplicate prevention, and persistence.
- `lib/meta-beta/daily-stats.ts` — daily map/rank and `All`-rank aggregates.
- `lib/meta-beta/scoring.ts` — Bayesian/Wilson correction, exclusions, and category scores.
- `lib/meta-beta/aggregation.ts` — rolling seven-day recommendation snapshot writer.
- `lib/meta-beta/stats.ts` — D1 recommendation lookup with sample fallback.
- `lib/meta-beta/quota.ts` — D1-backed daily AI allowance reservation and status.
- `custom-worker.ts` — OpenNext fetch handler plus hourly and daily cron handlers.
- `app/api/meta-beta/` — login/logout, stats, quota, collection-status, and guarded AI endpoints.
- `components/meta/MetaBetaDashboard.tsx` — the private ranked-meta dashboard and chat UI.

## Roadmap

- **Approval/auth phase** — obtain the appropriate Riot production access and RSO flow for consented users.
- **Cohort validation phase** — run the ten-person group, review sample size, scoring behavior, and AI usefulness.
- **Japan expansion phase** — expand the consented Japanese cohort or use an approved broader data source.
- **International phase** — add the existing language regions, then worldwide coverage.

## Credits

Agent names, portraits, and icons are property of Riot Games, fetched via the
community [valorant-api.com](https://valorant-api.com).
