# Deployment Guide for Vercel

This is a clean source folder ready for GitHub and Vercel deployment.

## Quick Deploy Steps

### 1. Push to GitHub

```bash
cd psa-source4
git init
git add .
git commit -m "Initial commit - PSA with appointment reminders"
git branch -M main
git remote add origin https://github.com/yourusername/psa.git
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings
5. Click "Deploy"

### 3. Configure Environment Variables in Vercel

Go to Project Settings → Environment Variables and add:

**Required:**
```
DATABASE_URL=postgresql://user:pass@host:5432/db
SCHEDULER_TOKEN=FDS46eDFH43gdsDFGH4hgdhdfh
```

**For Reminders:**
```
FALLBACK_BASIC_USER=myuser
FALLBACK_BASIC_PASS=33Fts35198737!
SCHEDULER_TZ=Europe/Brussels
```

**Optional:**
```
NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
APP_ORIGIN=https://your-app.vercel.app
```

### 4. Setup n8n Scheduler

Since Vercel free tier doesn't support minute-level cron jobs, use n8n:

1. Create new workflow in n8n: "PSA Scheduler"
2. Add **Schedule Trigger** node (every 1 minute)
3. Add **HTTP Request** node:
   - URL: `https://your-app.vercel.app/api/scheduler/tick`
   - Header: `X-Scheduler-Token: FDS46eDFH43gdsDFGH4hgdhdfh`
4. Activate the workflow

See **N8N_SCHEDULER_SETUP.md** for detailed instructions and workflow JSON.

### 5. Configure Webhook in App

1. Visit your deployed app: `https://your-app.vercel.app`
2. Go to `/settings`
3. Set "Notifications Webhook": `https://wb87020.vps.webdock.cloud/webhook/ntf`
4. Click "Save Settings"

## What's Included

- ✅ All source code (app, components, lib)
- ✅ Configuration files (next.config.js, tailwind.config.js, etc.)
- ✅ Vercel cron configuration (vercel.json)
- ✅ Documentation (README.md, REMINDERS_SETUP.md)
- ✅ Environment template (.env.local.example)
- ❌ No node_modules (Vercel installs automatically)
- ❌ No .next build folder (Vercel builds automatically)
- ❌ No .env.local (set in Vercel dashboard)

## How It Works After Deployment

Once deployed and n8n scheduler is active:

1. **n8n triggers scheduler every minute** - via Schedule Trigger workflow
2. **Scheduler checks for due reminders** - queries appointments database
3. **Reminders trigger at configured times** - calls reminders API
4. **Webhooks are called** - notifications sent to your n8n webhook
5. **Database persistence** - using your Neon/Postgres connection

## Testing After Deployment

1. Create an appointment with a reminder
2. Wait for the reminder time
3. Check your n8n webhook logs
4. Verify notification was received

## Troubleshooting

**Scheduler not running?**
- Check n8n workflow is **Activated**
- Verify n8n executions show runs every minute
- Check HTTP Request response in n8n execution logs
- Verify `SCHEDULER_TOKEN` matches in both places

**Reminders not firing?**
- Verify `SCHEDULER_TOKEN` is set in Vercel
- Check webhook URL is saved in Settings page
- Verify timezone is correct (`SCHEDULER_TZ`)
- Check Vercel function logs for errors

**Database errors?**
- Verify `DATABASE_URL` is correct
- Check Neon/Postgres connection is active
- Ensure database allows connections from Vercel IPs

## Support

See full documentation:
- **REMINDERS_SETUP.md** - Complete reminder system guide
- **README.md** - App overview and features
- **test-reminder.md** - Testing instructions
