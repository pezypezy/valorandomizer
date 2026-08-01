# Global ranked composition data source

## Product requirement

The AI composition feature uses aggregate PC Competitive match statistics from every supported VALORANT route. It does not build recommendations from a signed-in player's history, tracked PUUIDs, or a small opt-in cohort.

The application stores only match-level and team-level fields needed for aggregate composition statistics:

- source, API route, route group, and optional server cluster
- match ID for deduplication
- patch, map, queue, and start time
- team rank bucket
- five-agent composition
- win/loss and round score
- recommendation eligibility flags

Player names, Riot IDs, and PUUIDs are not persisted in the aggregate dataset.

## Geography model

The database separates four concepts:

- `region = global`: the combined recommendation dataset.
- `source_route`: the API route used to retrieve the match (`na`, `eu`, `ap`, `kr`, `latam`, or `br`).
- `shard_group`: the stable public grouping (`americas`, `eu`, `ap`, or `kr`).
- `server_cluster`: a normalized data-center key such as `tokyo`, `singapore`, or `london`; `unknown` when the source does not provide one.

`na`, `latam`, and `br` map to the shared `americas` group. A match ID is opaque and is never used to infer its region or server.

Server-level statistics remain hidden until a cluster has enough matches and active days to satisfy the same confidence thresholds as the global recommendations.

## Official Riot discovery

Riot documents `/val/match/v1/recent-matches/by-queue/{queue}`. For live routes it returns match IDs completed in the recent window. The collector polls `competitive` every ten minutes, records the IDs in `global_match_discovery`, and retrieves match details with `/val/match/v1/matches/{matchId}` under a configurable per-run budget.

The collector requests:

- `na` for the shared Americas match-history deployment
- `eu`
- `ap`
- `kr`

Discovered IDs are persisted before detail retrieval, retried with backoff, deduplicated by match ID, and then normalized into the anonymous aggregate dataset. The official match payload does not expose a guaranteed server-cluster field, so Riot-sourced matches are stored with `server_cluster = unknown`.

Required runtime settings:

- `RIOT_API_KEY`: Riot production API key stored as a Cloudflare secret.
- `RIOT_MATCH_DETAIL_BUDGET`: optional number of pending match details processed per ten-minute run; clamped to 1–250 and defaulting to 120.

## External-source assessment

An external source may enrich `server_cluster` only when its terms explicitly permit large-scale aggregate analytics and derived-statistic storage.

HenrikDev exposes match metadata including `region` and `cluster`, but its published project policy requires player consent and explicitly says big analytic projects are not supported. It is therefore not an accepted production source for this feature.

Tracker Network does not offer a public VALORANT developer API and prohibits use of its internal endpoints and scraping. It is also not an accepted source.

No unofficial client endpoint, scraped website, or source with unclear licensing may be connected silently. A future provider must be approved explicitly and feed the same provider-neutral batch boundary in `lib/meta-beta/global-ingest.ts`.

## Source acceptance requirements

A production source must provide:

1. PC Competitive matches only.
2. Coverage across the required routes and rank buckets.
3. Patch and match start timestamps.
4. Complete team compositions, team results, and competitive tiers.
5. Stable match IDs for deduplication.
6. Terms that permit aggregate storage and derived statistics.
7. Enough throughput to maintain a rolling seven-day window.
8. A server-cluster field only when it is authoritative; otherwise `unknown`.

The UI and Discord bot publish recommendations only after the minimum sample and active-day thresholds are met for the selected map and rank.
