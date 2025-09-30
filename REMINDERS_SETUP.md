# Appointment Reminders Setup Guide

## Overview

The PSA app now supports automatic appointment reminders that are triggered at configured times via your n8n webhook. When you create or edit an appointment in the Schedule page, you can select which reminders you want:

- **1 hour before** - Reminder sent 60 minutes before appointment start
- **30 mins before** - Reminder sent 30 minutes before appointment start  
- **10 mins before** - Reminder sent 10 minutes before appointment start
- **At start** - Reminder sent exactly when the appointment begins

## How It Works

1. **User creates/edits appointment** - In the Schedule page, check the reminder boxes you want
2. **Reminder flags are stored** - The selected reminders are saved in the database with the appointment
3. **Scheduler checks every minute** - The `/api/scheduler/tick` endpoint runs every minute (via cron job)
4. **Due reminders are triggered** - When a reminder time matches the current time, the scheduler calls `/api/reminders`
5. **Webhook is called** - The reminders API sends the notification payload to your n8n webhook

## Webhook Configuration

You can configure the notifications webhook in **two ways**:

### Option 1: Settings Page (Recommended)
1. Go to `/settings` in your app
2. Find "Notifications Webhook" field
3. Enter your webhook URL: `https://your-n8n-instance.com/webhook/reminders`
4. Click "Save Settings"

This saves the webhook URL to the database and is the preferred method.

### Option 2: Environment Variable
Add to your `.env.local` file:

```bash
# Webhook URL for sending reminders (fallback if not set in settings)
NOTIFY_WEBHOOK_URL=https://your-n8n-instance.com/webhook/reminders

# Optional: Basic Auth credentials
NOTIFY_WEBHOOK_BASIC_USER=your_username
NOTIFY_WEBHOOK_BASIC_PASS=your_password

# Optional: Bearer token (alternative to Basic Auth)
NOTIFY_WEBHOOK_BEARER=your_bearer_token

# Optional: Custom headers as JSON string
NOTIFY_WEBHOOK_HEADERS={"X-Custom-Header":"value"}

# Scheduler security token (required for production)
SCHEDULER_TOKEN=your_random_secure_token

# Timezone for scheduler (default: UTC)
SCHEDULER_TZ=America/New_York

# Database connection (required for reminders to work)
DATABASE_URL=postgresql://user:pass@host/db
# or
NEON_DATABASE_URL=postgresql://user:pass@host/db
```

## Setting Up the Scheduler

The scheduler needs to run every minute to check for due reminders. You have several options:

### Option 1: Vercel Cron Jobs (Recommended for Production)

Add to your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/scheduler/tick",
      "schedule": "* * * * *"
    }
  ]
}
```

Then set the `SCHEDULER_TOKEN` environment variable in Vercel dashboard.

### Option 2: External Cron Service (e.g., cron-job.org)

1. Sign up at https://cron-job.org or similar service
2. Create a new cron job that runs every minute
3. Set URL to: `https://your-app.vercel.app/api/scheduler/tick`
4. Add header: `X-Scheduler-Token: your_random_secure_token`
5. Set schedule to: `* * * * *` (every minute)

### Option 3: n8n Scheduler Workflow

Create an n8n workflow that:
1. Triggers every minute (Schedule Trigger node)
2. Makes HTTP Request to `/api/scheduler/tick`
3. Includes header `X-Scheduler-Token: your_token`

## n8n Webhook Payload

When a reminder is due, your n8n webhook will receive this payload:

```json
{
  "task": "Meeting with client",
  "date": "2025-09-30",
  "start": "14:30",
  "offsetMinutes": 30,
  "startInLabel": "30m",
  "source": "schedule-page",
  "nowEpoch": 1727701200000
}
```

### Payload Fields

- `task` - The appointment title
- `date` - ISO date of the appointment (YYYY-MM-DD)
- `start` - Start time in 24h format (HH:MM)
- `offsetMinutes` - How many minutes before the appointment (0, 10, 30, or 60)
- `startInLabel` - Human-readable label ("now", "10m", "30m", "1h")
- `source` - Always "schedule-page" for appointment reminders
- `nowEpoch` - Current timestamp in milliseconds

## n8n Workflow Example

Here's a basic n8n workflow structure for handling reminders:

1. **Webhook Trigger** - Receives the reminder payload
2. **Function Node** - Format the notification message:
   ```javascript
   const { task, date, start, startInLabel } = $json;
   const message = `⏰ Reminder: "${task}" starts in ${startInLabel} at ${start}`;
   return { message, task, date, start };
   ```
3. **Pushcut/Pushover/Telegram Node** - Send the notification to your device

## Testing

### Test the Reminder API Directly

```bash
curl -X POST http://localhost:3000/api/reminders \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentId": "appt_123",
    "offsetMinutes": 30
  }'
```

### Test the Scheduler Tick

```bash
curl http://localhost:3000/api/scheduler/tick \
  -H "X-Scheduler-Token: your_token"
```

Response will show triggered reminders:

```json
{
  "ok": true,
  "due": [],
  "triggered": [],
  "remindersTriggered": ["Meeting with client (30m)"],
  "reminderCount": 1,
  "time": "14:00"
}
```

## Troubleshooting

### Reminders not triggering

1. **Check database connection** - Reminders require a database (Neon/Postgres)
2. **Verify scheduler is running** - Check logs for scheduler tick calls
3. **Check timezone** - Ensure `SCHEDULER_TZ` matches your local timezone
4. **Verify webhook URL** - Test the webhook URL manually
5. **Check appointment time** - Reminders only trigger on the exact minute

### Webhook errors

1. **Check authentication** - Verify Basic Auth or Bearer token credentials
2. **Test webhook directly** - Use curl to test your n8n webhook
3. **Check n8n logs** - Look for errors in your n8n instance
4. **Verify payload format** - Ensure your n8n workflow expects the correct JSON structure

### Development mode

If `NOTIFY_WEBHOOK_URL` is not set, the reminder API will return a mock response:

```json
{
  "ok": true,
  "mocked": true,
  "payload": { ... }
}
```

This allows you to test the UI without setting up n8n.

## Database Schema

The reminders use these columns in the `appointments` table:

```sql
ALTER TABLE appointments 
  ADD COLUMN IF NOT EXISTS remind_1h BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS remind_30m BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS remind_10m BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS remind_at_start BOOLEAN NOT NULL DEFAULT FALSE;
```

These columns are automatically created when you first use the appointments API.

## Security Notes

- Always use HTTPS for webhook URLs in production
- Keep `SCHEDULER_TOKEN` secret and random (use a password generator)
- Use environment variables for all secrets, never hardcode them
- Consider rate limiting the scheduler endpoint if exposed publicly
- Validate webhook signatures if your n8n instance supports it
