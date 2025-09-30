# Personal Stability Assistant (PSA)

Next.js (App Router) + TypeScript + Tailwind frontend for a single‑user Personal Stability Assistant. Rituals are dynamic (each with its own n8n webhook). Chat keeps only the last 100 messages in client state; saved messages are stored separately in state for demo (swap for real persistence later).

## Quick start

1. Node 18+ required.
2. Install deps:
   ```bash
   npm install
   ```
3. Run dev server:
   ```bash
   npm run dev
   ```
4. Open http://localhost:3000

## Pages

- `/chat` — Chat UI. Rituals render with a badge and buttons.
- `/schedule` — 24-hour schedule with appointments and reminder checkboxes.
- `/emotions` — Track emotional state throughout the day.
- `/missions` — Saved missions/tasks list.
- `/saved` — Saved messages list.
- `/settings` — Tone, clear chat, fallback webhook, webhook test.

## Environment variables

See `.env.local.example` for a complete template. Key variables:

- `DATABASE_URL` or `NEON_DATABASE_URL` — PostgreSQL connection (required for appointments and reminders)
- `NOTIFY_WEBHOOK_URL` — n8n webhook for sending appointment reminders
- `SCHEDULER_TOKEN` — Security token for the scheduler endpoint
- `SCHEDULER_TZ` — Timezone for scheduling (default: UTC)
- `NEXT_PUBLIC_FALLBACK_WEBHOOK` — Webhook for general chat messages
- `PUSHCUT_TOKEN` — Reserved for future iOS notifications (n8n flow)
- `GPT_API_KEY` — Reserved for n8n flows calling GPT

## Appointment Reminders

The app supports automatic reminders for appointments via n8n webhooks. See **[REMINDERS_SETUP.md](./REMINDERS_SETUP.md)** for detailed setup instructions including:

- How to configure reminder checkboxes (1h, 30m, 10m, at start)
- Setting up the scheduler with Vercel Cron or external services
- Configuring your n8n webhook to receive reminder notifications
- Testing and troubleshooting

## Local mocks

- API mocks (in‑memory only):
  - `GET/POST /api/messages` — returns last 100 messages (mocked); POST echoes a reply.
  - `GET/POST/PUT/DELETE /api/rituals` — rituals CRUD mock.
  - `POST /api/inject-ritual` — inject a ritual message (used by n8n later).
  - `POST /api/rituals/action` — simulate a ritual button action reply.

Replace with real persistence (Supabase, Vercel KV, Notion via n8n, etc.) for production.

## Manual testing (Step 12)

- Add a ritual:
  1) Go to `/schedule`, fill in name and (optional) webhook URL, pick trigger type, and set buttons.
  2) Save. Ritual should appear in the list.

- Trigger via chat:
  1) Go to `/chat` and type `/start <ritualId>` (use the ritual `id` displayed in state or the one you created).
  2) If a webhook is set, PSA POSTs to it with `{ ritualId, context: last10, tone }`.
  3) If no webhook or CORS blocked, PSA calls the local mock `/api/inject-ritual` and injects a ritual message.

- Button actions:
  1) Click a ritual button in the chat.
  2) If a webhook exists, PSA POSTs `{ ritualId, action, timestamp }`.
  3) Otherwise, local mock `/api/rituals/action` returns follow‑up text, which is injected into chat.

- Message trimming:
  1) Send >100 messages.
  2) Zustand `addMessage` keeps the last 100 only.

## Deploying

- Deploy to Vercel: https://vercel.com/docs
  - Set environment variables in the project settings (no secrets in code).

## Notes

- This repo uses simple in‑memory mocks for API routes (`lib/mockdb.ts`) so state resets on server restart.
- To switch to real n8n endpoints, set the ritual `webhook` URLs in `/schedule` and optionally configure `NEXT_PUBLIC_FALLBACK_WEBHOOK` or set the fallback in `/settings`.
