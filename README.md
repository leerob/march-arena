# March Madness AI

An AI-powered NCAA Tournament bracket simulator built with Next.js and Google Gemini. Watch the full 2026 bracket unfold in real time as an AI analyst picks every game — from the First Four through the national championship — using KenPom ratings, historical seed data, and matchup context.

Try it out at https://www.marcharena.com.

## How It Works

1. **Hit "Start simulation"** — the app kicks off a durable workflow that simulates every tournament game
2. **Games stream in round by round** — results appear on the bracket as NDJSON updates, with the sidebar cycling through active matchups
3. **Each pick is made by Gemini 3 Flash** — the model receives team profiles, KenPom stats, venue/travel context, historical seed matchup records (1985–2025), and upset indicators, then returns a structured `{ winner, reasoning }` response
4. **Win probabilities** drive the analysis — an ensemble of KenPom logistic (60%), Log5 (25%), and seed-based (15%) models
5. **Results aggregate into a leaderboard** — champions, Final Four appearances, and upset wins across simulation runs, stored in Redis

## Stack

- **Next.js 16** (App Router) + **React 19**
- **AI SDK** with **Google Gemini 3 Flash** for structured game picks
- **Workflow** for durable, streaming bracket simulation
- **Redis** (ioredis) for leaderboard persistence
- **Tailwind CSS 4** for styling
- **Vercel Firewall** for rate limiting
