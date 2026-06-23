import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get("account_id")
  if (!accountId) return NextResponse.json({ error: "account_id é obrigatório" }, { status: 400 })

  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("account_id", accountId)
    .eq("deleted", false)
    .order("start_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const body = await req.json()
  const { account_id, deal_id, contact_id, title, description, location, all_day, start_at, end_at } = body

  if (!account_id || !title || !start_at) {
    return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 })
  }

  const { data, error } = await supabase.from("calendar_events").insert({
    account_id,
    deal_id: deal_id || null,
    contact_id: contact_id || null,
    title,
    description: description || null,
    location: location || null,
    all_day: all_day || false,
    start_at,
    end_at: end_at || null,
    created_by: user.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
