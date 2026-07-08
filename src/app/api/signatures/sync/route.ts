import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { documentId } = await req.json()
  if (!documentId) return NextResponse.json({ error: "documentId é obrigatório" }, { status: 400 })

  const { data: doc } = await supabase
    .from("signature_documents")
    .select("id, provider_document_id, account_id")
    .eq("id", documentId)
    .maybeSingle()

  if (!doc) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
  if (!doc.provider_document_id) return NextResponse.json({ error: "Documento não possui ID do provedor" }, { status: 400 })

  const { data: settings } = await supabase
    .from("zapsign_settings")
    .select("api_key, enabled")
    .eq("account_id", doc.account_id)
    .maybeSingle()

  if (!settings?.api_key || !settings?.enabled) {
    return NextResponse.json({ error: "Zapsign não configurado" }, { status: 400 })
  }

  try {
    const zapRes = await fetch(`https://api.zapsign.com.br/api/v1/docs/${doc.provider_document_id}/`, {
      headers: { "Authorization": `Bearer ${settings.api_key}` },
    })

    if (!zapRes.ok) {
      return NextResponse.json({ error: "Falha ao consultar Zapsign" }, { status: 502 })
    }

    const zapData = await zapRes.json() as Record<string, unknown>
    const zapStatus = zapData.status as string | undefined

    const statusMap: Record<string, string> = {
      "signed": "signed",
      "refused": "cancelled",
      "expired": "expired",
      "deleted": "cancelled",
      "sent": "sent",
      "viewed": "sent",
      "finished": "signed",
    }

    const newStatus = zapStatus ? statusMap[zapStatus] : null
    if (!newStatus) {
      return NextResponse.json({ received: true, message: "Status não mapeado: " + zapStatus })
    }

    const update: Record<string, string | null> = { status: newStatus }
    if (newStatus === "signed") {
      update.signed_at = new Date().toISOString()
    }

    const { error } = await supabase.from("signature_documents").update(update).eq("id", doc.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ received: true, status: newStatus })
  } catch {
    return NextResponse.json({ error: "Erro ao conectar com Zapsign" }, { status: 502 })
  }
}
