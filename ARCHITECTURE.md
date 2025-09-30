# PSA Architecture with n8n Scheduler

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         n8n Instance                             │
│                                                                   │
│  ┌──────────────────┐         ┌──────────────────┐             │
│  │ Scheduler        │         │ Notification     │             │
│  │ Workflow         │         │ Webhook          │             │
│  │                  │         │                  │             │
│  │ Every 1 minute   │         │ /webhook/ntf     │             │
│  └────────┬─────────┘         └────────▲─────────┘             │
│           │                             │                        │
└───────────┼─────────────────────────────┼────────────────────────┘
            │                             │
            │ GET /scheduler/tick         │ POST (reminder payload)
            │ + Token Header              │ + Basic Auth
            │                             │
┌───────────▼─────────────────────────────┴────────────────────────┐
│                    Vercel Deployment                              │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Next.js App                            │   │
│  │                                                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │   │
│  │  │  /schedule  │  │  /settings  │  │    /chat    │      │   │
│  │  │    page     │  │    page     │  │    page     │      │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │   │
│  │                                                            │   │
│  │  ┌──────────────────────────────────────────────────┐    │   │
│  │  │              API Routes                           │    │   │
│  │  │                                                    │    │   │
│  │  │  /api/scheduler/tick  ←─ Called by n8n          │    │   │
│  │  │       ↓                                           │    │   │
│  │  │  Checks for due reminders                        │    │   │
│  │  │       ↓                                           │    │   │
│  │  │  /api/reminders  ─→ Calls n8n webhook           │    │   │
│  │  │                                                    │    │   │
│  │  │  /api/appointments  ←→ CRUD operations           │    │   │
│  │  │  /api/settings      ←→ Webhook config            │    │   │
│  │  └──────────────────────────────────────────────────┘    │   │
│  └────────────────────────────┬──────────────────────────────┘   │
│                                │                                  │
└────────────────────────────────┼──────────────────────────────────┘
                                 │
                                 │ SQL Queries
                                 │
                    ┌────────────▼────────────┐
                    │   Neon PostgreSQL       │
                    │                         │
                    │  - appointments         │
                    │  - settings             │
                    │  - messages             │
                    └─────────────────────────┘
```

## Data Flow: Reminder Trigger

### 1. n8n Scheduler Triggers (Every Minute)
```
n8n Schedule Trigger (every 1 min)
    ↓
HTTP Request: GET /api/scheduler/tick
    + Header: X-Scheduler-Token
```

### 2. Scheduler Checks Database
```
/api/scheduler/tick
    ↓
Query appointments table
    ↓
Find appointments with:
  - date = today
  - remind_1h/30m/10m/at_start = true
  - current_time matches reminder time
```

### 3. Trigger Reminders
```
For each due reminder:
    ↓
Call /api/reminders
    ↓
Fetch webhook URL from settings table
    ↓
POST to n8n webhook with payload:
{
  "task": "Meeting",
  "date": "2025-09-30",
  "start": "15:00",
  "offsetMinutes": 30,
  "startInLabel": "30m"
}
```

### 4. n8n Sends Notification
```
n8n Webhook receives payload
    ↓
Format notification message
    ↓
Send to Pushcut/Pushover/etc
    ↓
User receives notification
```

## Component Responsibilities

### n8n
- **Scheduler Workflow**: Triggers `/api/scheduler/tick` every minute
- **Notification Webhook**: Receives reminder payloads and sends notifications

### Vercel App
- **Scheduler API**: Checks for due reminders, triggers webhook calls
- **Reminders API**: Fetches webhook URL, sends notification payload
- **Appointments API**: CRUD for appointments with reminder flags
- **Settings API**: Stores webhook URL and configuration

### Database (Neon)
- **appointments table**: Stores appointments with reminder flags
- **settings table**: Stores webhook URL and app configuration
- **messages table**: Chat history (optional)

## Configuration Flow

### User Sets Webhook URL
```
User opens /settings page
    ↓
Enters webhook URL: https://wb87020.vps.webdock.cloud/webhook/ntf
    ↓
Clicks "Save Settings"
    ↓
POST /api/settings
    ↓
UPDATE settings SET notifications_webhook = '...'
```

### User Creates Appointment with Reminder
```
User opens /schedule page
    ↓
Creates appointment
    ↓
Checks reminder boxes (1h, 30m, 10m, at start)
    ↓
Clicks "Save"
    ↓
POST /api/appointments
    ↓
INSERT INTO appointments (remind_1h, remind_30m, ...)
```

## Security

### Scheduler Endpoint
- Protected by `X-Scheduler-Token` header
- Only n8n workflow has the token
- Returns 401 if token missing or invalid

### Webhook Authentication
- Uses Basic Auth from environment variables
- Credentials: `FALLBACK_BASIC_USER` / `FALLBACK_BASIC_PASS`
- Sent as `Authorization: Basic <base64>` header

### Database
- Connection via secure `DATABASE_URL`
- SSL/TLS encryption
- Hosted on Neon (managed PostgreSQL)

## Scalability

### Current Setup (Free Tier)
- ✅ n8n triggers every minute (no cost)
- ✅ Vercel function executions: ~1,440/day (well within free tier)
- ✅ Database queries: Minimal (only checks today's appointments)
- ✅ Webhook calls: Only when reminders are due

### Optimization
- Scheduler only queries appointments for current day
- Reminder flags reduce unnecessary processing
- n8n handles retries and error handling
- Vercel functions are stateless and auto-scale

## Monitoring

### n8n Dashboard
- View all scheduler executions
- Check HTTP request/response logs
- Monitor webhook delivery status
- Set up error notifications

### Vercel Dashboard
- Function logs for `/api/scheduler/tick`
- Function logs for `/api/reminders`
- Monitor execution time and errors
- Track usage and quotas

### Database
- Query execution logs in Neon dashboard
- Monitor connection pool usage
- Track query performance
