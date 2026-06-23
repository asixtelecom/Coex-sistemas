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
    .from("signature_documents")
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
  const { account_id, deal_id, contact_id, title, description, file_url, file_name, signer_name, signer_email, signer_phone } = body

  if (!account_id || !title || !file_url || !signer_name || !signer_email) {
    return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 })
  }

  const { data, error } = await supabase.from("signature_documents").insert({
    account_id,
    deal_id: deal_id || null,
    contact_id: contact_id || null,
    title,
    description: description || null,
    file_url,
    file_name: file_name || null,
    signer_name,
    signer_email,
    signer_phone: signer_phone || null,
    created_by: user.id,
    status: "pending",
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
