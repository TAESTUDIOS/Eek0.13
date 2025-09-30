# Test Reminder System

## Quick Test Steps

### 1. Test the Reminders API Directly

Open PowerShell and run:

```powershell
# Test with a sample appointment
$body = @{
    title = "Test Meeting"
    date = "2025-09-30"
    start = "15:00"
    offsetMinutes = 30
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/reminders" -Method POST -Body $body -ContentType "application/json"
```

**Expected Response:**
- If webhook is configured: `{ ok: true, forwarded: true, data: {...} }`
- If webhook not configured: `{ ok: true, mocked: true, payload: {...} }`

### 2. Check Settings Database

Verify your webhook is saved in the database:

```powershell
# If using Neon/Postgres, connect and run:
# SELECT notifications_webhook FROM settings WHERE id = 'singleton';
```

Should return: `https://wb87020.vps.webdock.cloud/webhook/ntf`

### 3. Test the Scheduler

```powershell
# Get your SCHEDULER_TOKEN from .env.local
$token = "your_scheduler_token_here"

$headers = @{
    "X-Scheduler-Token" = $token
}

Invoke-RestMethod -Uri "http://localhost:3000/api/scheduler/tick" -Method GET -Headers $headers
```

**Expected Response:**
```json
{
  "ok": true,
  "due": [],
  "triggered": [],
  "remindersTriggered": ["Meeting Title (30m)"],
  "reminderCount": 1,
  "time": "14:30"
}
```

### 4. Create a Test Appointment

1. Go to http://localhost:3000/schedule
2. Click "Add Task"
3. Create an appointment:
   - **Title**: "Test Reminder"
   - **Date**: Today (2025-09-30)
   - **Time**: Current time + 5 minutes (e.g., if it's 14:48, set to 14:53)
   - **Duration**: 30 minutes
   - **Check**: "At start" reminder
4. Save

### 5. Wait and Check

At 14:53 (the appointment start time), the scheduler should:
1. Detect the due reminder
2. Call `/api/reminders`
3. Send payload to your webhook: `https://wb87020.vps.webdock.cloud/webhook/ntf`

### 6. Check Webhook Logs

In your n8n instance, check the webhook execution logs for:
- URL: `/webhook/ntf`
- Payload received:
```json
{
  "task": "Test Reminder",
  "date": "2025-09-30",
  "start": "14:53",
  "offsetMinutes": 0,
  "startInLabel": "now",
  "source": "schedule-page",
  "nowEpoch": 1727701980000
}
```

## Troubleshooting

### Reminders Not Firing

**Check 1: Is the scheduler running?**
```powershell
# Test scheduler endpoint
Invoke-RestMethod -Uri "http://localhost:3000/api/scheduler/tick" -Headers @{"X-Scheduler-Token"="your_token"}
```

**Check 2: Is the webhook URL saved?**
- Go to Settings page
- Verify "Notifications Webhook" field shows: `https://wb87020.vps.webdock.cloud/webhook/ntf`
- Click "Save Settings"

**Check 3: Are reminder flags saved?**
- Create appointment with reminder checkboxes
- Check database: `SELECT * FROM appointments WHERE remind_at_start = TRUE;`

**Check 4: Is the scheduler running every minute?**
- For local dev, you need to manually trigger it OR set up a cron job
- For Vercel production, it runs automatically via vercel.json

### Authorization Errors

If you see "Authorization data is wrong!":
- Verify `.env.local` has:
  ```
  FALLBACK_BASIC_USER=myuser
  FALLBACK_BASIC_PASS=33Fts35198737!
  ```
- Restart your dev server after changing .env.local

### Webhook Not Receiving Data

1. Test webhook directly:
```powershell
$body = @{
    task = "Test"
    date = "2025-09-30"
    start = "15:00"
    offsetMinutes = 0
    startInLabel = "now"
    source = "test"
    nowEpoch = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
} | ConvertTo-Json

$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("myuser:33Fts35198737!"))

Invoke-RestMethod -Uri "https://wb87020.vps.webdock.cloud/webhook/ntf" -Method POST -Body $body -ContentType "application/json" -Headers @{"Authorization"="Basic $auth"}
```

## Manual Scheduler Trigger (For Testing)

Since the scheduler needs to run every minute, for local testing you can:

**Option 1: Manual trigger in PowerShell**
```powershell
# Run this every minute manually
while ($true) {
    $token = "your_scheduler_token"
    $result = Invoke-RestMethod -Uri "http://localhost:3000/api/scheduler/tick" -Headers @{"X-Scheduler-Token"=$token}
    Write-Host "$(Get-Date -Format 'HH:mm:ss') - Reminders: $($result.reminderCount)"
    Start-Sleep -Seconds 60
}
```

**Option 2: Windows Task Scheduler**
1. Open Task Scheduler
2. Create Basic Task
3. Trigger: Daily, repeat every 1 minute
4. Action: Start a program
   - Program: `powershell.exe`
   - Arguments: `-Command "Invoke-RestMethod -Uri 'http://localhost:3000/api/scheduler/tick' -Headers @{'X-Scheduler-Token'='your_token'}"`

**Option 3: Use n8n**
Create an n8n workflow:
1. Schedule Trigger (every 1 minute)
2. HTTP Request to `http://localhost:3000/api/scheduler/tick`
3. Headers: `X-Scheduler-Token: your_token`
