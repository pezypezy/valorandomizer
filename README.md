# Valorandomizer

A **Valorant team random picker**. Set how many agents you want from each of the
four roles (Duelist / Initiator / Controller / Sentinel), then summon a random
five-agent squad — with real agent portraits and a sci-fi UI.

## Tech stack

- **Next.js 16** (App Router, Route Handlers) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (CSS-first `@theme` tokens)
- **next-intl v4** for i18n (`ja` default / `en`), routed via `app/[locale]` + `proxy.ts`
- **motion** (framer-motion) + custom arwes-style frames / glow / scanlines
- **pnpm**
- Fonts: **Hikomi Font S** (display, self-hosted via `next/font/local`) + **Noto Sans JP** (body)
- Agent roster + portraits from [valorant-api.com](https://valorant-api.com) (official Riot assets)

> Theme: primary `#ff4655`, base `#1a242e`.

## Getting started

```bash
pnpm install
pnpm dev          # http://localhost:3000  (redirects to /ja)
```

Other scripts:

```bash
pnpm build         # production build
pnpm test          # unit tests for the picker logic (node:test)
pnpm agents:sync   # re-fetch the agent roster + portraits into public/agents and lib/agents.ts
```

## How it works

- `lib/roles.ts` — role definitions, accent palette, the `Agent` type, team size (5).
- `lib/agents.ts` — **auto-generated** roster (`pnpm agents:sync`). Do not edit by hand.
- `lib/picker.ts` — pure `pickTeam()` / `validateCounts()` (Fisher–Yates, role-aware, supports locked agents). Covered by `lib/picker.test.ts`.
- `components/` — `Picker` (state + controls), `RoleStepper`, `AgentCard` (reveal + lock/reroll), and `ui/` sci-fi primitives.
- `scripts/fetch-agents.ts` — downloads real portraits/icons into `public/agents/<id>/` for offline-safe serving.

## Roadmap (later phases)

- **Phase 2** — Cloudflare **D1** + **Prisma** (`@prisma/adapter-d1`); move the roster into the DB (seeded directly, no CSV) and serve it from `app/api/agents`.
- **Phase 3** — Deploy to Cloudflare via `@opennextjs/cloudflare` + GitHub Actions CI.

## Credits

Agent names, portraits, and icons are property of Riot Games, fetched via the
community [valorant-api.com](https://valorant-api.com). Display font: Hikomi Font S
(see `public/fonts/license_hikomifont_s.png`).
