# March Madness AI

An AI-powered NCAA Tournament bracket simulator built with Next.js and Claude Haiku.

**`NEXT_PUBLIC_SHOW_SIM`** — single switch (`true` / `false`):

| Value   | Behavior |
|--------|----------|
| `true` | Bracket page: **Start simulation** + streaming sim. **Leaderboard** in nav. **`POST /api/simulate`** enabled. |
| `false` | Bracket + matchup-stats sidebar only (hosted-style). No sim API from the app. |

**If unset:** sim is **on** in `development`, **off** in `production` builds.

Site: https://www.marcharena.com (`NEXT_PUBLIC_SHOW_SIM=false`).

## How It Works (local / fork)

1. **Configure an Anthropic API key** — required when sim is on
2. **Run `pnpm dev`** — with sim on by default. To preview the no-sim UI locally: `.env.local` → `NEXT_PUBLIC_SHOW_SIM=false`. For `next start` with sim: set `NEXT_PUBLIC_SHOW_SIM=true`. Or `pnpm ai-sim-batch` / `simulateBracketLocally`
3. **Each pick uses Claude (Haiku-class)** — team profiles, KenPom stats, venue/travel context, historical seed matchup records (1985–2025), and upset indicators → structured `{ winner, reasoning }`
4. **Win probabilities** — ensemble of KenPom logistic (60%), Log5 (25%), and seed-based (15%) models
5. **Leaderboard (optional)** — Redis-backed aggregation when sims call `saveSimulationResults`

## Stack

- **Next.js 16** (App Router) + **React 19**
- **AI SDK** + **Anthropic** for structured game picks (BYOK)
- **Redis** (ioredis) for leaderboard persistence
- **Tailwind CSS 4** for styling
- **Vercel Firewall** for rate limiting (when sim API is enabled)
