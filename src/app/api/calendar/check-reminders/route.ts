import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (token !== (process.env.CRON_SECRET || process.env.AUTOMATION_CRON_SECRET)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const now = new Date();
  const inFiveMinutes = new Date(now.getTime() + 5 * 60 * 1000);

  const { data: events } = await supabaseAdmin
    .from("calendar_events")
    .select("*")
    .eq("deleted", false)
    .not("reminders", "is", null)
    .gt("reminders", "[]");

  if (!events) return NextResponse.json({ checked: true, sent: 0 });

  let sent = 0;

  for (const event of events) {
    const reminders: { minutesBefore: number }[] = event.reminders || [];
    const startAt = new Date(event.start_at);

    for (const r of reminders) {
      const reminderTime = new Date(startAt.getTime() - r.minutesBefore * 60 * 1000);

      if (reminderTime >= now && reminderTime <= inFiveMinutes) {
        const { data: existing } = await supabaseAdmin
          .from("event_notifications")
          .select("id")
          .eq("event_id", event.id)
          .eq("reminder_minutes", r.minutesBefore)
          .is("sent_at", null);

        if (existing && existing.length > 0) continue;

        await supabaseAdmin.from("event_notifications").insert({
          event_id: event.id,
          account_id: event.account_id,
          type: "notification",
          reminder_minutes: r.minutesBefore,
        });

        sent++;
      }
    }
  }

  return NextResponse.json({ checked: true, sent });
}
