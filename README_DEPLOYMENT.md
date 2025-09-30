# 🚀 PSA Deployment - n8n Scheduler Edition

## Why n8n Scheduler?

Vercel's free tier **does not support minute-level cron jobs** (minimum is daily). Instead, we use **n8n to trigger the scheduler every minute**, which works perfectly and gives you:

✅ **Free** - No additional cost
✅ **Reliable** - n8n handles retries and errors
✅ **Visible** - See all executions in n8n dashboard
✅ **Flexible** - Easy to modify timing or add error handling

## Quick Start (5 Minutes)

### 1. Deploy to Vercel
```bash
cd psa-source4
git init && git add . && git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/repo.git
git push -u origin main
```

Then: https://vercel.com/new → Import → Deploy

### 2. Add Environment Variables (Vercel)
```
DATABASE_URL=postgresql://...
SCHEDULER_TOKEN=FDS46eDFH43gdsDFGH4hgdhdfh
FALLBACK_BASIC_USER=myuser
FALLBACK_BASIC_PASS=33Fts35198737!
SCHEDULER_TZ=Europe/Brussels
```

### 3. Setup n8n Scheduler Workflow

**Create workflow with 2 nodes:**

1. **Schedule Trigger**
   - Every 1 minute

2. **HTTP Request**
   - URL: `https://your-app.vercel.app/api/scheduler/tick`
   - Header: `X-Scheduler-Token: FDS46eDFH43gdsDFGH4hgdhdfh`

**Activate workflow** ✅

### 4. Configure App
1. Visit: `https://your-app.vercel.app/settings`
2. Set webhook: `https://wb87020.vps.webdock.cloud/webhook/ntf`
3. Save

## Done! 🎉

Your system is now:
- ✅ Checking for reminders every minute (via n8n)
- ✅ Sending notifications to your webhook
- ✅ Fully automated and reliable

## How It Works

```
n8n (every minute)
    ↓
Triggers: GET /api/scheduler/tick
    ↓
Scheduler checks database for due reminders
    ↓
Calls: POST /api/reminders (for each due reminder)
    ↓
Sends payload to your n8n webhook
    ↓
You receive notification
```

## Testing

1. Create appointment for "now + 2 minutes"
2. Check "At start" reminder
3. Wait 2 minutes
4. Check n8n webhook logs

## Documentation

- **N8N_SCHEDULER_SETUP.md** - Detailed n8n workflow setup
- **VERCEL_QUICK_START.md** - Fast deployment guide
- **DEPLOYMENT_CHECKLIST.md** - Complete checklist
- **ARCHITECTURE.md** - System architecture diagram
- **REMINDERS_SETUP.md** - Reminder system details

## Troubleshooting

**Reminders not firing?**
1. Check n8n workflow is **Activated**
2. Verify n8n executions run every minute
3. Check scheduler response in n8n logs
4. Verify webhook URL saved in app settings

**Need help?** See the detailed docs above!

---

**Pro Tip:** Once deployed, check n8n Executions tab to monitor the scheduler. You'll see it run every minute with the response showing any triggered reminders!
