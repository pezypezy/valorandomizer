# Discord web-session integration

This integration keeps Valorandomizer as the UI and uses Discord only to start a short-lived session and publish the final result.

## User flow

1. A user runs `/valorandom` or `/valopropick` in Discord.
2. Discord sends the interaction to `https://valo-randomizer.com/api/discord/interactions`.
3. The app returns an ephemeral link button that only the command user can see.
4. The user creates a composition on the website.
5. The website posts the selected agent or pro-pick IDs to `/api/discord/publish`.
6. The server validates the IDs and publishes a public follow-up message through Discord's interaction webhook.

The encrypted web session expires after about 14 minutes because Discord interaction tokens are valid for 15 minutes. The session page also uses a `no-referrer` policy so its bearer URL is not included when following links away from the page.

## Discord application setup

1. Create an application in the Discord Developer Portal.
2. Install it in the test server with the `applications.commands` scope. A normal bot installation is fine.
3. Set the **Interactions Endpoint URL** to:

   `https://valo-randomizer.com/api/discord/interactions`

4. Copy the application's public key.
5. Generate a session secret with at least 32 random characters, for example:

   `openssl rand -hex 32`

## Cloudflare secrets

Set these on the deployed Worker:

```bash
pnpm wrangler secret put DISCORD_PUBLIC_KEY
pnpm wrangler secret put DISCORD_SESSION_SECRET
pnpm wrangler secret put DISCORD_ALLOWED_GUILD_ID
```

`DISCORD_ALLOWED_GUILD_ID` is optional. Set it during the private test to reject commands from every other server.

No runtime bot token or D1 database is required. The bot token is only used locally to register slash commands.

## Register the test-server commands

Set the following local environment variables, then run the registration script:

```bash
DISCORD_APPLICATION_ID=...
DISCORD_BOT_TOKEN=...
DISCORD_GUILD_ID=...
pnpm discord:register
```

Guild commands update immediately, making them suitable for the initial private test.

## Current limitation

The encrypted URL is a short-lived bearer credential. The initial Discord response is ephemeral, but anyone who receives a copied URL can use it until it expires.

The publish button is disabled in the browser after a successful post, but the URL is not server-side single-use. A user who deliberately replays the publish request can post again until the interaction token expires. Add a D1 nonce table before broad public release if strict user binding and one-time publishing are required.
