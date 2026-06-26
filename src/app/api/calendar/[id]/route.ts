import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const { error } = await supabase
    .from("calendar_events")
    .update({
      title: body.title,
      description: body.description || null,
      location: body.location || null,
      event_type: body.event_type || "event",
      color: body.color || undefined,
      all_day: body.all_day || false,
      start_at: body.start_at,
      end_at: body.end_at || null,
      status: body.status || "scheduled",
      reminders: body.reminders || [],
    })
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

  const { id } = await params

  const { error } = await supabase
    .from("calendar_events")
    .update({ deleted: true })
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
