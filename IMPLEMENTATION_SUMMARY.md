# Appointment Reminders Implementation Summary

## What Was Implemented

Successfully implemented automatic webhook-based reminders for appointments with configurable timing options.

## Changes Made

### 1. Enhanced Scheduler (`/app/api/scheduler/tick/route.ts`)
- Added `getDueReminders()` function to query appointments with reminder flags
- Checks current time against appointment start times minus offset
- Triggers reminders for: 1 hour, 30 mins, 10 mins before, and at start
- Calls `/api/reminders` endpoint for each due reminder
- Returns detailed response with triggered reminders count

### 2. Updated Schedule Page (`/app/schedule/page.tsx`)
- Removed immediate reminder triggering on save (was calling API right away)
- Reminders now only trigger via scheduler at appropriate times
- UI checkboxes still work - flags are saved to database
- Added comment explaining scheduler handles triggering

### 3. Created Documentation
- **REMINDERS_SETUP.md** - Complete setup guide with:
  - How the system works
  - Environment variable configuration
  - Scheduler setup options (Vercel Cron, external cron, n8n)
  - n8n webhook payload format
  - Testing instructions
  - Troubleshooting guide

- **.env.local.example** - Template for environment variables

- **vercel.json** - Vercel Cron configuration for scheduler

- **Updated README.md** - Added reminders section and updated pages list

## How It Works

```
User creates appointment with reminder checkboxes
           ↓
Reminder flags saved to database
           ↓
Scheduler runs every minute (via Vercel Cron or external cron)
           ↓
Checks for appointments with due reminders
           ↓
Calls /api/reminders for each due reminder
           ↓
Reminder API sends payload to n8n webhook
           ↓
n8n sends notification (Pushcut/Pushover/etc)
```

## Webhook Payload Format

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

## Required Setup

1. **Environment Variables**:
   ```bash
   NOTIFY_WEBHOOK_URL=https://your-n8n.com/webhook/reminders
   SCHEDULER_TOKEN=random_secure_token
   SCHEDULER_TZ=America/New_York
   DATABASE_URL=postgresql://...
   ```

2. **Scheduler** (choose one):
   - Vercel Cron (automatic with vercel.json)
   - External cron service (cron-job.org)
   - n8n scheduler workflow

3. **n8n Webhook**:
   - Create webhook to receive reminder payload
   - Format notification message
   - Send to notification service (Pushcut, etc.)

## Testing

### Test Reminder API:
```bash
curl -X POST http://localhost:3000/api/reminders \
  -H "Content-Type: application/json" \
  -d '{"appointmentId":"appt_123","offsetMinutes":30}'
```

### Test Scheduler:
```bash
curl http://localhost:3000/api/scheduler/tick \
  -H "X-Scheduler-Token: your_token"
```

## Files Modified

- `/app/api/scheduler/tick/route.ts` - Enhanced with reminder checking
- `/app/schedule/page.tsx` - Removed immediate triggering
- `/README.md` - Added reminders section

## Files Created

- `/REMINDERS_SETUP.md` - Complete setup guide
- `/.env.local.example` - Environment template
- `/vercel.json` - Vercel Cron configuration
- `/IMPLEMENTATION_SUMMARY.md` - This file

## Next Steps

1. Set up environment variables in `.env.local`
2. Configure your n8n webhook endpoint
3. Set up scheduler (Vercel Cron recommended)
4. Test with a sample appointment
5. Monitor scheduler logs for triggered reminders

## Notes

- Reminders only work with database (Neon/Postgres) - not JSON fallback
- Scheduler must run every minute for accurate timing
- Timezone configuration is critical for correct reminder times
- Dev mode (no NOTIFY_WEBHOOK_URL) returns mock responses for testing UI
