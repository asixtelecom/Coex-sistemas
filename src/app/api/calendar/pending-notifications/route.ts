import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_id")
    .eq("user_id", user.id)
    .single()

  if (!profile?.account_id) {
    return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 })
  }

  const { data: notifications } = await supabase
    .from("event_notifications")
    .select("id, event_id, reminder_minutes, created_at, event:calendar_events!inner(title, start_at, location)")
    .eq("account_id", profile.account_id)
    .is("sent_at", null)
    .order("created_at", { ascending: false })
    .limit(10)

  return NextResponse.json({ notifications: notifications ?? [] })
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { ids } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "IDs inválidos" }, { status: 400 })
  }

  await supabase
    .from("event_notifications")
    .update({ sent_at: new Date().toISOString() })
    .in("id", ids)

  return NextResponse.json({ ok: true })
}
