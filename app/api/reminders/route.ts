// app/api/reminders/route.ts
// Relay reminder requests to a single n8n webhook defined by NOTIFY_WEBHOOK_URL.
// Dev behavior: if NOTIFY_WEBHOOK_URL is not set, respond with ok + mocked payload.

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getById as getByIdJson } from "@/lib/appointments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // do not prerender
export const revalidate = 0; // no caching

function neonAvailable() {
  return Boolean(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL);
}

// Fetch notifications webhook URL from settings
async function getNotificationsWebhook(): Promise<string | null> {
  if (!neonAvailable()) {
    return process.env.NOTIFY_WEBHOOK_URL || null;
  }
  try {
    const sql = getDb();
    const rows = await sql`SELECT notifications_webhook FROM settings WHERE id = 'singleton' LIMIT 1`;
    const url = rows?.[0]?.notifications_webhook;
    // Fallback to env var if not in settings
    return url || process.env.NOTIFY_WEBHOOK_URL || null;
  } catch {
    return process.env.NOTIFY_WEBHOOK_URL || null;
  }
}

async function resolveAppointment(input: any) {
  const { appointmentId, title, date, start } = input || {};
  if (title && date && start) {
    return { title, date, start } as { title: string; date: string; start: string };
  }
  if (!appointmentId) return null;
  // Try resolve by id from data store
  if (!neonAvailable()) {
    const a = await getByIdJson(appointmentId);
    if (!a) return null;
    return { title: a.title, date: a.date, start: a.start };
  }
  const sql = getDb();
  const rows: any[] = await sql`
    SELECT title, to_char(date, 'YYYY-MM-DD') AS date, to_char(start, 'HH24:MI') AS start
    FROM appointments
    WHERE id = ${appointmentId}
    LIMIT 1
  `;
  const r = rows?.[0];
  if (!r) return null;
  return { title: r.title, date: r.date, start: r.start } as { title: string; date: string; start: string };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { offsetMinutes } = body || {};
    if (typeof offsetMinutes !== "number" || offsetMinutes < 0) {
      return NextResponse.json({ ok: false, error: "Invalid offsetMinutes" }, { status: 400 });
    }

    const appt = await resolveAppointment(body);
    if (!appt) {
      return NextResponse.json({ ok: false, error: "Missing appointment. Provide { title, date, start } or { appointmentId }." }, { status: 400 });
    }

    // Create a human label for the offset
    let startInLabel: string;
    if (offsetMinutes === 0) startInLabel = "now";
    else if (offsetMinutes % 60 === 0) startInLabel = `${offsetMinutes / 60}h`;
    else startInLabel = `${offsetMinutes}m`;

    const payload = {
      task: appt.title,
      date: appt.date,
      start: appt.start,
      offsetMinutes,
      startInLabel,
      source: "schedule-page",
      nowEpoch: Date.now(),
    };

    const url = await getNotificationsWebhook();
    if (!url) {
      // Dev mock
      console.log("[DEV MOCK] Reminder payload ->", payload);
      return NextResponse.json({ ok: true, mocked: true, payload });
    }

    // Build headers with optional Authorization
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const basicUser = process.env.NOTIFY_WEBHOOK_BASIC_USER || process.env.FALLBACK_BASIC_USER;
    const basicPass = process.env.NOTIFY_WEBHOOK_BASIC_PASS || process.env.FALLBACK_BASIC_PASS;
    const bearer = process.env.NOTIFY_WEBHOOK_BEARER;
    if (basicUser && basicPass) {
      const token = Buffer.from(`${basicUser}:${basicPass}`).toString("base64");
      headers["Authorization"] = `Basic ${token}`;
    } else if (bearer) {
      headers["Authorization"] = `Bearer ${bearer}`;
    }
    // Allow custom extra headers via JSON string, e.g. {"X-My-Key":"abc"}
    const extraHeadersRaw = process.env.NOTIFY_WEBHOOK_HEADERS;
    if (extraHeadersRaw) {
      try {
        const extra = JSON.parse(extraHeadersRaw) as Record<string, string>;
        for (const [k, v] of Object.entries(extra)) headers[k] = String(v);
      } catch {}
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json({ ok: false, error: `Webhook error: ${res.status} ${text}` }, { status: 502 });
    }

    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: true, forwarded: true, data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to create reminder" }, { status: 500 });
  }
}
