# Global ranked composition data source

## Product requirement

The AI composition feature uses aggregate PC Competitive match statistics from every supported VALORANT shard. It does not build recommendations from a signed-in player's history, tracked PUUIDs, or a small opt-in cohort.

The application stores only match-level and team-level fields needed for aggregate composition statistics:

- source and shard
- match ID for deduplication
- patch, map, queue, and start time
- team rank bucket
- five-agent composition
- win/loss and round score
- recommendation eligibility flags

Player names, Riot IDs, and PUUIDs are not persisted in the aggregate dataset.

## Current ingestion boundary

`lib/meta-beta/global-ingest.ts` accepts provider-neutral batches containing raw match payloads and a shard label. It normalizes the payload with the existing Riot match parser, forces the aggregate dataset region to `global`, deduplicates by match ID, writes team results, records coverage, and rebuilds affected daily statistics.

The batch source must be a stable lowercase identifier. Supported shard labels are:

- `na`
- `eu`
- `ap`
- `kr`
- `latam`
- `br`

## Official API constraint

The documented VALORANT match API provides match lookup by match ID and match history lookup by PUUID. It does not document a feed that enumerates every Competitive match or every player across all ranks and shards.

Because of that constraint, the application must not claim full-world coverage until a Riot-approved or otherwise licensed source can supply match IDs or match payloads with sufficient global coverage.

## Source acceptance requirements

A production source must provide:

1. PC Competitive matches only.
2. Coverage across all supported shards and rank buckets.
3. Patch and match start timestamps.
4. Complete team compositions, team results, and competitive tiers.
5. Stable match IDs for deduplication.
6. Terms that permit aggregate storage and derived statistics.
7. Enough throughput to maintain a rolling seven-day window.

The UI and Discord bot must publish recommendations only after the minimum sample and active-day thresholds are met for the selected map and rank.
