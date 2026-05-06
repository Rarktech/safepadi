# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Persistent Memory

Extended bot structure documentation, feedback rules, and project context are stored in Claude Code's memory at:
`C:\Users\user\.claude\projects\C--Users-user-Desktop-safepadi\memory\`

Key memory files:
- `MEMORY.md` — index of all memory entries
- `feedback_bot_prompts_preservation.md` — **CRITICAL**: never change bot messages, prompts, menus, or flows
- `project_bot_structure_telegram.md` — full Telegram bot menus, wizard steps, and button labels
- `project_bot_structure_discord.md` — full Discord bot modal flows, buttons, and messages
- `project_bot_structure_whatsapp.md` — WhatsApp Flows, interactive menus, and smart txn flow
- `project_bot_structure_apple.md` — Apple Business JivoChat state machine and 8-step wizard
- `project_bot_structure_instagram.md` — Instagram quick reply registration flow and postback handlers

Always read relevant memory files before modifying any bot code.

## Project Overview

**Safeeely** is an AI-powered escrow platform for social media trades, freelance gigs, and crypto. Users register via messaging bots (Telegram, Discord, WhatsApp, Instagram, Apple Business) and use a unique **safetag** (handle) across the platform. The backend is a REST API backed by Supabase (Postgres). The frontend is a Next.js web app.

## Monorepo Structure

npm workspaces monorepo under `packages/`:

| Package | Port | Description |
|---|---|---|
| `packages/api` | 3000 | Express REST API — the source of truth for all business logic |
| `packages/frontend` | 3001 | Next.js 16 web app (dashboard, pay pages, admin, marketplace) |
| `packages/shared` | — | Shared TypeScript types and Supabase client (must be built before other packages) |
| `packages/telegram` | 10000 | Telegraf bot with wizard scenes |
| `packages/discord` | — | Discord.js bot |
| `packages/whatsapp` | 10001 | Express webhook server for WhatsApp Cloud API + Flows |
| `packages/instagram` | 10002 | Instagram Messenger webhook bot |
| `packages/apple_business` | 10003 | Apple Messages for Business via JivoChat |

## Development Commands

Run from the repo root:

```bash
# Start services individually (development with hot reload)
npm run dev:api
npm run dev:frontend
npm run dev:telegram
npm run dev:whatsapp
npm run dev:instagram
npm run dev:apple

# Start production builds
npm run start:api
npm run start:discord
npm run start:apple

# Build (shared must be built first)
npm run build:all   # builds shared, api, telegram, discord

# Expose local ports via Pinggy tunnels (needed for bot webhooks)
npm run tunnel:api
npm run tunnel:whatsapp
npm run tunnel:instagram
npm run tunnel:apple
```

Frontend lint: `npm run lint` inside `packages/frontend`.

There are no automated tests (`"test": "exit 1"` in root).

## Key Architecture Patterns

### All bots call the API — never Supabase directly

Every bot (Telegram, Discord, WhatsApp, etc.) communicates exclusively with `packages/api` over HTTP using `API_URL`. The bots never import or query Supabase themselves. Only `packages/api` and `packages/shared` touch the database.

### Shared package path alias

All backend packages resolve `@safepal/shared` to `../shared/src/index` via `tsconfig.json` paths. When the API is running in dev mode with `ts-node`, this resolution works at runtime. For a production build, `packages/shared` must be compiled first (`npm run build -w packages/shared`).

### Transaction state machine

Transactions progress through these statuses (defined in `packages/shared/src/types.ts`):
`PENDING_SELLER_ACCEPTANCE` → `ACCEPTED` → `PAID` → `AWAITING_PROOF` / `COMPLETED_BY_SELLER` → `COMPLETED` (or `DISPUTED` / `CANCELLED` / `REFUNDED`)

Two transaction types exist: `ONE_TIME` and `MILESTONE`. Milestone transactions have a `milestones` sub-array, each with its own status (`PENDING` → `COMPLETED` → `RELEASED`).

### Notification system

`packages/api/src/services/notifications.ts` → `sendNotification(platform, platformId, message, options?, imageUrl?)` — called after every status change to push messages back to users on their respective platforms (Telegram Bot API, Discord DMs, WhatsApp Cloud API, Apple/JivoChat).

### Smart Transaction AI (Gemini)

`packages/shared/src/ai/smartTransaction.ts` uses Gemini to parse free-text or transcribed voice messages into a `SmartTransactionDraft`. Both Telegram and Discord bots use this. The draft is stored in the bot session and, once confirmed, is handed into the standard wizard flow.

### Frontend auth

The frontend uses Supabase Auth (email magic link / OTP). `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in `packages/frontend/.env.local`. The admin section (`/admin/*`) has its own `AuthProvider` component.

### Telegram localhost workaround

Telegram Bot API rejects inline keyboard URLs containing `localhost`. Any URL built for Telegram replaces `localhost` with `127.0.0.1` at the point of construction (see `packages/telegram/src/bot.ts`).

### Discord profile caching

The Discord bot (`packages/discord/src/bot.ts`) caches `GET /profiles/by_platform/discord/:id` responses for 5 minutes via an Axios interceptor to avoid duplicate calls when buttons are clicked.

## Environment Variables

A single `.env` file at the repo root is loaded by all backend packages in development (`dotenv.config({ path: '../../.env' })`). The frontend reads `packages/frontend/.env.local`.

Key variables:

| Variable | Used by |
|---|---|
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | `packages/shared` (server-side) |
| `SUPABASE_ANON_KEY` | frontend (client-side) |
| `API_URL` / `INTERNAL_API_URL` | all bots → `http://localhost:3000/api` locally |
| `REVIEWS_URL` | all bots → `http://localhost:3001` locally |
| `TELEGRAM_BOT_TOKEN` | telegram bot + notification service |
| `DISCORD_BOT_TOKEN` | discord bot + notification service |
| `WHATSAPP_TOKEN` | whatsapp bot + notification service |
| `GEMINI_API_KEY` | smart transaction AI |
| `FLUTTERWAVE_*` | payment processing in api |
| `OPAY_*` | OPay payment gateway |
| `JIVO_PROVIDER_ID` / `JIVO_TOKEN` | apple_business bot |

## API Route Summary

All routes are prefixed `/api/`:

- `/profiles` — registration, profile lookup by safetag or platform ID, KYC, balance, badges
- `/transactions` — create, list, status update (PATCH `/transactions/:id/status`), milestone status, proof upload
- `/payments` — Flutterwave/OPay webhook and initiation
- `/withdrawals` — payout requests
- `/reviews` — leave and fetch reviews/ratings
- `/disputes` — open/resolve disputes; AI-mediated via `packages/api/src/services/gemini.ts`
- `/referrals` — referral stats and card image generation (Puppeteer)
- `/receipts` — PDF/PNG receipt generation (Puppeteer)
- `/admin` — admin management endpoints
- `/auth` — account binding and blocking
- `/marketplace` — listings and jobs

## Deployment

Deployed on Render. The render build script (`render-build.sh`) installs deps, builds `packages/shared`, and pre-installs the Puppeteer Chrome binary. Each bot and the API are separate Render services with `NODE_ENV=production`.
