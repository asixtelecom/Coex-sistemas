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

  const formData = await req.formData()
  const account_id = formData.get("account_id") as string
  const title = formData.get("title") as string
  const signer_name = formData.get("signer_name") as string
  const signer_email = formData.get("signer_email") as string
  const description = formData.get("description") as string | null
  const signer_phone = formData.get("signer_phone") as string | null
  const file = formData.get("file") as File | null

  if (!account_id || !title || !signer_name || !signer_email) {
    return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 })
  }
  if (!file) {
    return NextResponse.json({ error: "Arquivo PDF é obrigatório" }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Arquivo muito grande. Máximo 10 MB." }, { status: 400 })
  }

  const ext = file.name.split(".").pop() || "pdf"
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80)
  const filePath = `account-${account_id}/${Date.now()}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from("signature-documents")
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: `Falha ao fazer upload: ${uploadError.message}` }, { status: 500 })
  }

  const { data: signedUrlData } = await supabase.storage
    .from("signature-documents")
    .createSignedUrl(filePath, 120)

  const fileUrl = signedUrlData?.signedUrl || ""

  let providerDocumentId: string | null = null
  let sentAt: string | null = null

  const { data: settings } = await supabase
    .from("zapsign_settings")
    .select("api_key, enabled")
    .eq("account_id", account_id)
    .maybeSingle()

  if (settings?.api_key && settings?.enabled) {
    try {
      const zapRes = await fetch("https://api.zapsign.com.br/api/v1/docs/", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${settings.api_key}`,
          "Content-Type": "application/json",
        },
          body: JSON.stringify({
            name: title,
            url_pdf: fileUrl,
            lang: "pt-br",
            signers: [
              {
                name: signer_name,
                email: signer_email,
                phone_country: "55",
                phone_number: signer_phone?.replace(/\D/g, "") || "",
                auth_mode: "assinaturaTela",
                send_automatic_email: true,
              },
            ],
          }),
      })

      if (zapRes.ok) {
        const zapData = await zapRes.json()
        providerDocumentId = zapData.token || zapData.id || null
        sentAt = new Date().toISOString()
      }
    } catch {
      // Zapsign API call failed — document saved as pending
    }
  }

  const { data, error } = await supabase.from("signature_documents").insert({
    account_id,
    title,
    description: description || null,
    file_url: fileUrl,
    file_name: file.name,
    signer_name,
    signer_email,
    signer_phone: signer_phone || null,
    provider_document_id: providerDocumentId,
    status: providerDocumentId ? "sent" : "pending",
    sent_at: sentAt,
    created_by: user.id,
  }).select().single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
