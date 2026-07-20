import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

async function getProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from("profiles")
    .select("account_role")
    .eq("user_id", user.id)
    .single()
  return data as { account_role: string } | null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const profile = await getProfile(supabase)
  if (profile?.account_role === "viewer" || profile?.account_role === "vistoria") {
    return NextResponse.json({ error: "Sem permissão para editar eventos" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  const updates: Record<string, unknown> = {}
  if (body.title !== undefined) updates.title = body.title
  if (body.description !== undefined) updates.description = body.description
  if (body.location !== undefined) updates.location = body.location
  if (body.event_type !== undefined) updates.event_type = body.event_type
  if (body.color !== undefined) updates.color = body.color
  if (body.all_day !== undefined) updates.all_day = body.all_day
  if (body.start_at !== undefined) updates.start_at = body.start_at
  if (body.end_at !== undefined) updates.end_at = body.end_at
  if (body.status !== undefined) updates.status = body.status
  if (body.reminders !== undefined) updates.reminders = body.reminders

  const { error } = await supabase
    .from("calendar_events")
    .update(updates)
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ updated: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const profile = await getProfile(supabase)
  if (profile?.account_role === "viewer" || profile?.account_role === "vistoria") {
    return NextResponse.json({ error: "Sem permissão para excluir eventos" }, { status: 403 })
  }

  const { id } = await params

  const { error } = await supabase
    .from("calendar_events")
    .update({ deleted: true })
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
