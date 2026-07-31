# Ranked-meta private beta setup

This guide activates the password-protected ranked-meta beta after the code has been deployed to the repository.

## Prerequisites

- Node.js 22 or newer
- pnpm
- access to the Cloudflare account that owns the `valorandomizer` Worker
- Wrangler authentication (`pnpm exec wrangler login`) or `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`

Riot credentials are optional for the first UI/AI test. Without them, the beta uses clearly labelled sample statistics and the hourly live collector skips itself.

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

Then open the private URL directly:

```text
https://valo-randomizer.com/ja/meta-beta
```

The beta is intentionally absent from the public site header.

## Riot collection

Live collection additionally requires:

- an approved Riot production application and API key;
- the approved VALORANT routing host configured as `RIOT_VAL_BASE_URL`;
- consented player PUUIDs inserted through the approved RSO/consent flow.

When those values are absent, authentication, sample statistics, D1 quota accounting, and Workers AI testing can still operate. The hourly collector logs that Riot collection is disabled and exits without failing the site.

Do not register an account that has not explicitly opted in. The initial ten-person dataset is a cohort test, not representative Japan-wide statistics.
