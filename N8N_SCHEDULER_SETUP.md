# n8n Scheduler Setup Guide

Since Vercel's free tier only supports daily cron jobs (not every minute), we'll use n8n to trigger the scheduler every minute instead.

## n8n Workflow Setup

### Step 1: Create New Workflow in n8n

1. Open your n8n instance
2. Click "Create new workflow"
3. Name it: "PSA Scheduler Trigger"

### Step 2: Add Schedule Trigger Node

1. Click "+" to add a node
2. Search for "Schedule Trigger"
3. Configure:
   - **Trigger Interval**: `Minutes`
   - **Minutes Between Triggers**: `1`
   - **Mode**: `Every Minute`

### Step 3: Add HTTP Request Node

1. Click "+" after the Schedule Trigger
2. Search for "HTTP Request"
3. Configure:
   - **Method**: `GET`
   - **URL**: `https://your-app.vercel.app/api/scheduler/tick`
   - **Authentication**: `None` (we'll use headers)
   
4. Under **Headers**:
   - Click "Add Header"
   - **Name**: `X-Scheduler-Token`
   - **Value**: `FDS46eDFH43gdsDFGH4hgdhdfh`

### Step 4: (Optional) Add Error Handling

1. Click "+" after HTTP Request
2. Add "IF" node to check response
3. Configure:
   - **Condition**: `{{ $json.ok }} is true`
   
4. On **false** branch, add "Send Email" or notification node to alert you

### Step 5: Activate Workflow

1. Click the toggle at the top to **Activate** the workflow
2. The workflow will now run every minute automatically

## Visual Workflow Structure

```
┌─────────────────────┐
│  Schedule Trigger   │
│  Every 1 minute     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   HTTP Request      │
│   GET /scheduler    │
│   + Token Header    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   (Optional)        │
│   Error Handler     │
└─────────────────────┘
```

## n8n Workflow JSON

You can import this workflow directly:

```json
{
  "name": "PSA Scheduler Trigger",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "minutes",
              "minutesInterval": 1
            }
          ]
        }
      },
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "method": "GET",
        "url": "https://your-app.vercel.app/api/scheduler/tick",
        "options": {
          "headers": {
            "header": [
              {
                "name": "X-Scheduler-Token",
                "value": "FDS46eDFH43gdsDFGH4hgdhdfh"
              }
            ]
          }
        }
      },
      "name": "Call Scheduler",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [450, 300]
    }
  ],
  "connections": {
    "Schedule Trigger": {
      "main": [
        [
          {
            "node": "Call Scheduler",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

## After Deployment

1. Deploy your app to Vercel
2. Get your Vercel URL (e.g., `https://psa-abc123.vercel.app`)
3. Update the n8n HTTP Request URL to your Vercel URL
4. Activate the n8n workflow
5. Done! Scheduler will run every minute via n8n

## Verification

### Check n8n Executions
1. Go to n8n → Executions
2. You should see executions every minute
3. Check the response from the scheduler endpoint

### Check Scheduler Response
The HTTP Request node should return:
```json
{
  "ok": true,
  "due": [],
  "triggered": [],
  "remindersTriggered": ["Meeting (30m)"],
  "reminderCount": 1,
  "time": "15:15"
}
```

## Troubleshooting

### n8n workflow not executing
- Check workflow is **Activated** (toggle at top)
- Verify Schedule Trigger is set to "Every 1 minute"
- Check n8n error logs

### HTTP Request fails
- Verify Vercel URL is correct
- Check `SCHEDULER_TOKEN` matches in both places
- Test URL manually in browser (should return 401 without token)

### Scheduler returns 401 Unauthorized
- Verify `X-Scheduler-Token` header is set correctly
- Check `SCHEDULER_TOKEN` environment variable in Vercel
- Ensure token matches exactly (no extra spaces)

### Reminders not triggering
- Check scheduler response shows `reminderCount > 0`
- Verify webhook URL is set in app Settings page
- Check n8n webhook logs for incoming requests
- Verify appointment has reminder checkboxes enabled

## Benefits of n8n Scheduler

✅ **No Vercel cron limitations** - Run every minute on free tier
✅ **Better monitoring** - See all executions in n8n
✅ **Easy debugging** - View request/response in n8n
✅ **Flexible** - Can add error handling, notifications, etc.
✅ **Reliable** - n8n handles retries and error handling

## Alternative: External Cron Service

If you prefer not to use n8n, you can also use:
- **cron-job.org** (free, every minute)
- **EasyCron** (free tier available)
- **Uptime Robot** (monitor + trigger)

See `REMINDERS_SETUP.md` for details on these alternatives.
