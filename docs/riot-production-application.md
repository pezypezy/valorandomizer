# Riot Production API / RSO application brief

This document is an internal application draft for Valorandomizer. Update dates, screenshots, and live URLs before submitting it through the Riot Developer Portal.

## Product

**Name:** Valorandomizer  
**Website:** https://valo-randomizer.com  
**Repository:** https://github.com/pezypezy/valorandomizer  
**Initial audience:** a private Japanese VALORANT group of approximately ten consenting participants  
**Planned expansion:** larger Japanese opt-in cohort, then the language regions already supported by the site

Valorandomizer is an unofficial VALORANT community application. Its existing public features generate random custom-game compositions and draw compositions from manually curated past professional matches. The ranked-meta beta adds delayed, retrospective composition statistics and an AI explanation interface.

## Requested Riot access

- Production-level VALORANT application access
- Riot Sign On (RSO) client
- `account-v1` access for identifying the player who completed RSO
- `val-match-v1` access for the opted-in player's match list and match details
- `val-content-v1` access for current map/content identifiers

The service will use the routing host and credentials assigned by Riot. No client secret or Riot API key is exposed to the browser.

## User flow

1. A participant opens the password-protected beta.
2. The participant reviews the beta privacy and data-use notice.
3. The participant chooses **Link Riot Account**.
4. The application redirects the participant to Riot Sign On using the approved client ID and redirect URI.
5. After Riot returns an authorization code, the server exchanges it using the approved RSO client method.
6. The server calls `/riot/account/v1/accounts/me` to identify the account that explicitly opted in.
7. The participant confirms inclusion in the anonymous ranked-composition cohort.
8. The server stores the PUUID only in an operational tracking table and polls that account's official VALORANT match history.
9. Match data is reduced to anonymous team-level composition statistics.
10. The participant can later unlink their account and stop future collection.

The current repository contains the post-consent collector and statistical pipeline. The RSO authorization/callback routes will be activated only after Riot provides the approved client credentials and implementation requirements.

## Data used

Operational account table:

- PUUID
- Riot routing region
- consent timestamp
- enabled/disabled state
- polling timestamps and operational error state

Anonymous match/statistics tables:

- match ID for deduplication
- match start time
- patch and map
- competitive rank bucket based on the team's median tier
- five-agent team composition
- win/loss and round score
- recommendation eligibility and exclusion reason

## Data not displayed or retained in statistical rows

- Riot password or login credentials
- player display name or Riot ID
- public player profile or player-level match history
- opponent scouting information
- chat messages
- round-event coordinates
- live match state
- real-time tactical recommendations
- hardware identifiers or precise location

Free-form AI chat text is not stored in D1. Only responses to three predefined, non-personal quick prompts may be cached for up to twelve hours to reduce repeated AI requests.

## Output

The application displays delayed, aggregate composition recommendations by map and rank:

- **Theory:** stable and widely used composition with strong corrected performance
- **Off-meta:** sufficiently sampled, lower-pick-rate composition with strong corrected performance
- **Solo queue:** composition emphasizing commonly played agents and lower coordination requirements

Numeric claims come from the application's stored aggregate data. AI does not calculate or invent win rates; it receives precomputed statistics and explains them.

## Statistical safeguards

- current patch only
- rolling seven-day window
- Bayesian shrinkage toward the global average
- Wilson lower confidence bound
- minimum match-count and active-day requirements
- daily volatility scoring
- duplicate-match prevention
- structural exclusions such as no controller, three or more duelists, duplicate agents, invalid team size, and malformed data
- distinctness checks between the three recommendation categories

The initial ten-person cohort is explicitly labelled as a cohort test and is not presented as representative Japan-wide data. Broader claims will not be shown without sufficient approved data coverage.

## No prohibited real-time or scouting use

Valorandomizer does not:

- inspect the current opposing team;
- show another player's profile before or during a match;
- provide a live overlay;
- read current-match telemetry;
- issue immediate movement, ability, or purchase instructions;
- rank individual participants publicly;
- expose non-opted-in player data.

Recommendations are retrospective and composition-level. They are intended for pre-match discussion and learning, not dynamic in-game assistance.

## Consent, unlinking, and deletion

- Collection is disabled by default through `RIOT_RSO_COLLECTION_ENABLED=false`.
- Only records marked `source_type='rso'` may remain enabled.
- Database triggers automatically disable non-RSO records.
- The participant can request unlinking and removal from future polling.
- The operational PUUID record will be deleted or disabled on unlink.
- Already incorporated anonymous aggregates may remain when they cannot identify the participant.
- Retention periods will be reviewed before public expansion.

## Security and abuse controls

- password-protected private beta
- signed seven-day HttpOnly session cookie
- login and chat rate limits
- server-side Riot and AI credentials
- token-free rejection of unrelated questions and prompt-injection attempts
- daily Workers AI limits for the group and per browser session
- no raw SQL access from the model
- no AI tools with write access
- Cloudflare D1 prepared statements and match-ID deduplication

## Public notices

The website includes:

- Riot unofficial fan-project notice
- legal and intellectual-property notice
- general privacy description
- ranked-meta beta privacy notice
- explicit opt-in cohort scope
- disclosure that the service is not endorsed, sponsored, or affiliated with Riot Games

## Reviewer test path

1. Open `https://valo-randomizer.com/ja/meta-beta`.
2. Enter the reviewer password supplied privately in the Developer Portal application notes.
3. Change the map and rank filters.
4. Review the clearly labelled sample or D1-backed recommendation cards.
5. Try a predefined quick prompt and a free-form VALORANT composition question.
6. Try an unrelated question to confirm it is rejected without an AI request.
7. Review the collection-status and quota panels.
8. Open the linked beta privacy notice.

## Remaining activation steps after approval

- configure the approved RSO client ID, secret/private key, redirect URI, and token method;
- implement and test the RSO start/callback/unlink endpoints against Riot's provided instructions;
- set the approved VALORANT API routing host;
- upload `RIOT_API_KEY` as a Worker secret;
- register only accounts that completed RSO;
- change `RIOT_RSO_COLLECTION_ENABLED` from `false` to `true`;
- run the private cohort before making broader statistical claims.
