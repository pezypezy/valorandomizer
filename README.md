# Valorandomizer

A VALORANT team picker with two independent workflows:

- **Random Pick** builds a five-agent squad from a chosen role composition, with lock and reroll controls.
- **Pro Pick** draws one or two same-map compositions from past pro matches and stores local match results.

## Stack

- Next.js 16 App Router + React 19 + TypeScript
- Tailwind CSS v4 and Motion
- next-intl v4 (`ja` default, `en`, `ko`)
- OpenNext for Cloudflare Workers
- Orbitron and Zen Kaku Gothic New through `next/font`
- Agent data and Riot assets fetched from [valorant-api.com](https://valorant-api.com)

## Local development

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`; the bare root redirects to `/ja`.

## Quality commands

```bash
pnpm check        # lint + route/type generation + TypeScript + unit tests
pnpm build        # production Next.js build
pnpm cf:build     # OpenNext Cloudflare build
pnpm agents:sync  # refresh the roster and agent images
```

Run `pnpm check` and `pnpm build` before merging. The Next.js build does not run ESLint.

## Routes and structure

- `app/[locale]/page.tsx` — mode selection
- `app/[locale]/random/page.tsx` — Random Pick; loads only the random picker client code
- `app/[locale]/pro/page.tsx` — Pro Pick; loads the larger pro dataset only on this route
- `lib/picker.ts` — role-aware random team domain logic
- `lib/pro-pick-draw.ts` — same-map Pro Pick draw logic
- `lib/pro-pick-records.ts` — validated, failure-safe browser history store
- `lib/agents.ts` — generated roster; do not edit by hand
- `scripts/fetch-agents.ts` — roster/image synchronization

The locale segment is statically generated for Japanese, English, and Korean. A Next.js config redirect handles only the bare root because Next.js 16 Proxy runs on Node and is not used in the current Cloudflare setup.

## Deployment

OpenNext configuration lives in `open-next.config.ts`; Worker configuration lives in `wrangler.jsonc`.

```bash
pnpm preview
pnpm deploy
```

## Review and backlog

The current technical review, completed improvements, remaining risks, and proposed sprint order are in [`docs/REVIEW.md`](docs/REVIEW.md).

## Credits

Agent names, portraits, and icons are property of Riot Games. They are sourced through the community [valorant-api.com](https://valorant-api.com) API.
