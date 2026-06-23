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
    .from("pix_payments")
    .select("*")
    .eq("account_id", accountId)
    .eq("deleted", false)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const body = await req.json()
  const { account_id, deal_id, contact_id, amount, description, expires_in_minutes } = body

  if (!account_id || !amount) {
    return NextResponse.json({ error: "account_id e amount são obrigatórios" }, { status: 400 })
  }

  const { data, error } = await supabase.from("pix_payments").insert({
    account_id,
    deal_id: deal_id || null,
    contact_id: contact_id || null,
    amount,
    description: description || null,
    created_by: user.id,
    status: "pending",
    expires_at: expires_in_minutes
      ? new Date(Date.now() + expires_in_minutes * 60000).toISOString()
      : null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
