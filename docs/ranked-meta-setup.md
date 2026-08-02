# Ranked-meta private beta setup

This guide activates the password-protected ranked-meta beta after the code has been deployed to the repository.

## Prerequisites

- Node.js 22 or newer
- pnpm
- access to the Cloudflare account that owns the `valorandomizer` Worker
- Wrangler authentication (`pnpm exec wrangler login`) or `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`

Riot credentials are optional for the first UI/AI test. Without them, the beta uses clearly labelled sample statistics and the ten-minute live collector skips itself.

## Automated setup

From the repository root:

```bash
pnpm install
pnpm meta:setup
```

The command:

1. verifies Wrangler authentication;
2. creates the `valorandomizer` D1 database in the Asia-Pacific location when the `DB` binding does not exist;
3. asks Wrangler to add the generated D1 binding to `wrangler.jsonc`;
4. applies every migration under `migrations/` to the remote database;
5. securely prompts for the shared beta password;
6. generates and uploads a random session-signing secret;
7. uploads `RIOT_API_KEY` only when that environment variable is supplied.

The shared password must be at least 12 characters. It is entered with masked terminal input and is piped to Wrangler rather than placed in a command-line argument.

Wrangler secret updates create a new Worker version. The setup script does not deploy the local source tree unless `--deploy` is supplied.

## Windows PowerShell

Interactive setup:

```powershell
pnpm install
pnpm meta:setup
```

Non-interactive password input for a private terminal session:

```powershell
$env:META_BETA_PASSWORD = "your-shared-password"
pnpm meta:setup
Remove-Item Env:META_BETA_PASSWORD
```

Do not put the password in a committed `.env` file, shell history, issue, or chat message.

## Useful options

Prepare D1 and migrations without changing Worker secrets:

```bash
pnpm meta:setup -- --skip-secrets
```

Prepare resources, configure secrets, and deploy afterward:

```bash
pnpm meta:setup -- --deploy
```

Show help without contacting Cloudflare:

```bash
pnpm meta:setup -- --help
```

## After the command finishes

Wrangler updates `wrangler.jsonc` with the real D1 database UUID. Review the change and commit it:

```bash
git diff -- wrangler.jsonc
git add wrangler.jsonc
git commit -m "Bind ranked-meta D1 database"
```

When `--deploy` was not used, deploy after reviewing the generated binding:

```bash
pnpm deploy
```

Participants normally unlock the feature from the home-page **AI Composition**
card and continue to:

```text
https://valo-randomizer.com/ja/ai-composition
```

Operators can instead open the direct login/dashboard route:

```text
https://valo-randomizer.com/ja/meta-beta
```

Both routes use the same protected dashboard. The direct route redirects an
unauthenticated browser to `/ja/meta-beta/login`; the participant route returns
an unauthenticated browser to the home-page access card.

## Riot collection

Live collection additionally requires:

- an approved Riot production application and `RIOT_API_KEY` secret;
- the official Riot recent-match and match-detail endpoints for the supported routes;
- optionally, a `RIOT_MATCH_DETAIL_BUDGET` Worker variable between 1 and 250 (default 120).

When the API key is absent, authentication, sample statistics, D1 quota accounting, and Workers AI testing can still operate. The ten-minute collector logs that Riot collection is disabled and exits without failing the site.

The global aggregate dataset does not persist player names, Riot IDs, or PUUIDs. See [`global-ranked-data-source.md`](global-ranked-data-source.md) for the route, privacy, and source-acceptance requirements.
