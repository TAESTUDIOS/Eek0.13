# Deployment Checklist ✅

## Pre-Deployment

- [ ] Review code in `psa-source4` folder
- [ ] Verify `vercel.json` exists with cron configuration
- [ ] Check `.gitignore` excludes sensitive files
- [ ] Review environment variables needed

## GitHub Setup

- [ ] Create new GitHub repository (or use existing)
- [ ] Initialize git in `psa-source4`:
  ```bash
  cd psa-source4
  git init
  git add .
  git commit -m "Initial commit - PSA with reminders"
  ```
- [ ] Add remote and push:
  ```bash
  git remote add origin https://github.com/yourusername/your-repo.git
  git branch -M main
  git push -u origin main
  ```

## Vercel Deployment

- [ ] Go to https://vercel.com/new
- [ ] Import GitHub repository
- [ ] Verify framework preset: **Next.js**
- [ ] Click "Deploy" (initial deployment)

## Environment Variables (Vercel Dashboard)

Go to: Project Settings → Environment Variables

### Required Variables
- [ ] `DATABASE_URL` = `postgresql://...` (your Neon/Postgres URL)
- [ ] `SCHEDULER_TOKEN` = `FDS46eDFH43gdsDFGH4hgdhdfh`

### Authentication Variables
- [ ] `FALLBACK_BASIC_USER` = `myuser`
- [ ] `FALLBACK_BASIC_PASS` = `33Fts35198737!`

### Optional but Recommended
- [ ] `SCHEDULER_TZ` = `Europe/Brussels` (or your timezone)
- [ ] `NEXT_PUBLIC_BASE_URL` = `https://your-app.vercel.app`
- [ ] `APP_ORIGIN` = `https://your-app.vercel.app`

## Post-Deployment Configuration

- [ ] Visit deployed app URL
- [ ] Go to `/settings` page
- [ ] Set "Notifications Webhook": `https://wb87020.vps.webdock.cloud/webhook/ntf`
- [ ] Click "Save Settings"
- [ ] Verify settings are saved (refresh page)

## Setup n8n Scheduler

- [ ] Open n8n instance
- [ ] Create new workflow: "PSA Scheduler"
- [ ] Add Schedule Trigger node (every 1 minute)
- [ ] Add HTTP Request node:
  - URL: `https://your-app.vercel.app/api/scheduler/tick`
  - Header: `X-Scheduler-Token: FDS46eDFH43gdsDFGH4hgdhdfh`
- [ ] Activate workflow
- [ ] Check n8n Executions tab
- [ ] Verify executions run every minute
- [ ] Check HTTP response shows `ok: true`

## Test Reminders

- [ ] Create test appointment:
  - Title: "Test Reminder"
  - Date: Today
  - Time: Current time + 3 minutes
  - Check: "At start" reminder
- [ ] Wait for reminder time
- [ ] Check n8n webhook logs at: `https://wb87020.vps.webdock.cloud/webhook/ntf`
- [ ] Verify payload received:
  ```json
  {
    "task": "Test Reminder",
    "date": "2025-09-30",
    "start": "15:15",
    "offsetMinutes": 0,
    "startInLabel": "now"
  }
  ```

## Troubleshooting

### If n8n scheduler not running:
1. Check workflow is **Activated** (toggle at top)
2. Verify Schedule Trigger is set to "Every 1 minute"
3. Check n8n error logs in Executions tab
4. Test HTTP Request manually in n8n

### If reminders not firing:
1. Check Vercel Function logs for `/api/scheduler/tick`
2. Verify `SCHEDULER_TOKEN` is set correctly
3. Check timezone setting matches your location
4. Verify webhook URL is saved in app settings

### If webhook returns 401 (unauthorized):
1. Verify `FALLBACK_BASIC_USER` and `FALLBACK_BASIC_PASS` are set
2. Check n8n webhook authentication settings
3. Test webhook directly with curl

### If database errors:
1. Verify `DATABASE_URL` is correct
2. Check Neon/Postgres is accessible from Vercel
3. Ensure database has required tables (auto-created on first use)

## Success Indicators ✅

- [ ] App loads at Vercel URL
- [ ] Can create appointments in `/schedule`
- [ ] Settings page shows webhook URL
- [ ] n8n scheduler workflow is active
- [ ] n8n executions run every minute
- [ ] Scheduler returns `ok: true` response
- [ ] Test reminder triggers webhook
- [ ] n8n receives notification payload

## Next Steps

Once everything is working:
1. Set up custom domain (optional)
2. Configure production database backups
3. Monitor Vercel function usage
4. Set up error monitoring (Sentry, etc.)
5. Create more appointment reminders!

---

**Need help?** See:
- `DEPLOY.md` - Detailed deployment guide
- `REMINDERS_SETUP.md` - Reminder system documentation
- `README.md` - App overview
