// app/api/scheduler/tick/route.ts
// Dispatcher that runs every minute to trigger due scheduled rituals and appointment reminders.
// Secure this endpoint by sending header: X-Scheduler-Token: <token>
// Set the token in env as SCHEDULER_TOKEN.

import { NextResponse } from "next/server";
import { dueRitualIds, hhmmInTz } from "@/lib/rituals";
import { getDb } from "@/lib/db";
import type { Appointment } from "@/lib/types";

// Compare two dates at minute granularity
function sameMinute(a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate() &&
    a.getUTCHours() === b.getUTCHours() &&
    a.getUTCMinutes() === b.getUTCMinutes()
  );
}

function nowInTz(tz: string) {
  // Return a Date that represents now; we still format HH:mm using locale with tz
  return new Date();
}

function neonAvailable() {
  return Boolean(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL);
}

// Get appointments that have reminders due at the current time
async function getDueReminders(now: Date, tz: string): Promise<Array<{ appointmentId: string; title: string; date: string; start: string; offsetMinutes: number }>> {
  if (!neonAvailable()) {
    // For local dev without DB, skip reminder checks
    return [];
  }

  try {
    const sql = getDb();
    
    // Format current date and time in the target timezone
    const nowStr = now.toLocaleString("en-CA", { timeZone: tz, hour12: false });
    const [dateStr, timeStr] = nowStr.split(", ");
    const currentDate = dateStr; // YYYY-MM-DD
    const [currentHour, currentMinute] = timeStr.split(":").map(Number);
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    // Query appointments for today that have reminder flags set
    const rows: any[] = await sql`
      SELECT id, title, to_char(date, 'YYYY-MM-DD') AS date, to_char(start, 'HH24:MI') AS start,
             remind_1h, remind_30m, remind_10m, remind_at_start
      FROM appointments
      WHERE date = ${currentDate}
        AND (remind_1h = TRUE OR remind_30m = TRUE OR remind_10m = TRUE OR remind_at_start = TRUE)
    `;

    const due: Array<{ appointmentId: string; title: string; date: string; start: string; offsetMinutes: number }> = [];

    for (const row of rows) {
      const [startHour, startMinute] = row.start.split(":").map(Number);
      const startTotalMinutes = startHour * 60 + startMinute;

      // Check each reminder type
      if (row.remind_1h && currentTotalMinutes === startTotalMinutes - 60) {
        due.push({ appointmentId: row.id, title: row.title, date: row.date, start: row.start, offsetMinutes: 60 });
      }
      if (row.remind_30m && currentTotalMinutes === startTotalMinutes - 30) {
        due.push({ appointmentId: row.id, title: row.title, date: row.date, start: row.start, offsetMinutes: 30 });
      }
      if (row.remind_10m && currentTotalMinutes === startTotalMinutes - 10) {
        due.push({ appointmentId: row.id, title: row.title, date: row.date, start: row.start, offsetMinutes: 10 });
      }
      if (row.remind_at_start && currentTotalMinutes === startTotalMinutes) {
        due.push({ appointmentId: row.id, title: row.title, date: row.date, start: row.start, offsetMinutes: 0 });
      }
    }

    return due;
  } catch (e) {
    console.error("[scheduler] Error checking due reminders:", e);
    return [];
  }
}

// Trigger a reminder by calling the reminders API
async function triggerReminder(reminder: { appointmentId: string; title: string; date: string; start: string; offsetMinutes: number }): Promise<boolean> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_ORIGIN || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/reminders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointmentId: reminder.appointmentId,
        title: reminder.title,
        date: reminder.date,
        start: reminder.start,
        offsetMinutes: reminder.offsetMinutes,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("[scheduler] Error triggering reminder:", e);
    return false;
  }
}

export async function GET(req: Request) {
  try {
    const tokenHeader = process.env.SCHEDULER_TOKEN || "";
    const sent = (req.headers.get("x-scheduler-token") || "").trim();
    if (!tokenHeader || !sent || sent !== tokenHeader) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const tz = process.env.SCHEDULER_TZ || "UTC";
    const now = nowInTz(tz);
    const due = dueRitualIds(now, tz);

    const triggered: string[] = [];
    const remindersTriggered: string[] = [];

    // 1. Process ritual triggers
    for (const id of due) {
      try {
        if (id === "morning") {
          // 1) Ask the morning endpoint to compose the message
          const morningRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/morning`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ritualId: "morning", tz }),
          }).catch(async () => {
            return await fetch(new URL("/api/morning", process.env.APP_ORIGIN || "http://localhost:3000"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ritualId: "morning", tz }),
            });
          });
          if (!morningRes?.ok) continue;
          const data = await morningRes.json().catch(() => ({}));
          const msg = data?.message;
          if (msg) {
            // 2) Inject it into chat
            await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/inject-ritual`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ritualId: msg.ritualId ?? "morning",
                text: msg.text,
                buttons: msg.buttons ?? ["Done", "Snooze", "Open Urgent", "Open Schedule"],
                metadata: msg.metadata ?? {},
              }),
            }).catch(async () => {
              await fetch(new URL("/api/inject-ritual", process.env.APP_ORIGIN || "http://localhost:3000"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ritualId: msg.ritualId ?? "morning",
                  text: msg.text,
                  buttons: msg.buttons ?? ["Done", "Snooze", "Open Urgent", "Open Schedule"],
                  metadata: msg.metadata ?? {},
                }),
              });
            });
            triggered.push(id);
          }
        }
      } catch {
        // ignore and continue
      }
    }

    // 2. Process appointment reminders
    const dueReminders = await getDueReminders(now, tz);
    for (const reminder of dueReminders) {
      try {
        const success = await triggerReminder(reminder);
        if (success) {
          remindersTriggered.push(`${reminder.title} (${reminder.offsetMinutes}m)`);
        }
      } catch {
        // ignore and continue
      }
    }

    return NextResponse.json({ 
      ok: true, 
      due, 
      triggered, 
      remindersTriggered,
      reminderCount: dueReminders.length,
      time: hhmmInTz(now, tz) 
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "scheduler error" }, { status: 500 });
  }
}
