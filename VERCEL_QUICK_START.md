# Vercel Quick Start - 5 Minutes to Deploy

## Step 1: Push to GitHub (2 min)

```bash
cd psa-source4
git init
git add .
git commit -m "PSA with appointment reminders"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## Step 2: Deploy to Vercel (1 min)

1. Go to https://vercel.com/new
2. Click "Import" next to your GitHub repo
3. Click "Deploy" (accept all defaults)

## Step 3: Add Environment Variables (2 min)

In Vercel Dashboard → Settings → Environment Variables, add:

```
DATABASE_URL=postgresql://your_connection_string
SCHEDULER_TOKEN=FDS46eDFH43gdsDFGH4hgdhdfh
FALLBACK_BASIC_USER=myuser
FALLBACK_BASIC_PASS=33Fts35198737!
SCHEDULER_TZ=Europe/Brussels
```

Click "Save" and **Redeploy** the project.

## Step 4: Configure Webhook (30 sec)

1. Visit your app: `https://your-app.vercel.app`
2. Go to Settings page
3. Set webhook: `https://wb87020.vps.webdock.cloud/webhook/ntf`
4. Click "Save Settings"

## Done! 🎉

Your app is now live with:
- ✅ Automatic scheduler running every minute
- ✅ Appointment reminders via webhook
- ✅ Database persistence
- ✅ All features working

## Test It

1. Create appointment for "now + 2 minutes"
2. Check "At start" reminder
3. Wait 2 minutes
4. Check your n8n webhook logs

---

**Detailed guides:**
- `DEPLOYMENT_CHECKLIST.md` - Complete checklist
- `DEPLOY.md` - Full deployment guide
- `REMINDERS_SETUP.md` - Reminder system docs
