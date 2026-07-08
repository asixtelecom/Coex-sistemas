import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { data: doc } = await supabase
    .from("signature_documents")
    .select("id, file_name, account_id, provider_document_id")
    .eq("id", id)
    .maybeSingle()

  if (!doc) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })

  // Try to get the signed PDF from Zapsign API
  if (doc.provider_document_id) {
    const { data: settings } = await supabase
      .from("zapsign_settings")
      .select("api_key, enabled")
      .eq("account_id", doc.account_id)
      .maybeSingle()

    if (settings?.api_key && settings?.enabled) {
      try {
        const zapRes = await fetch(
          `https://api.zapsign.com.br/api/v1/docs/${doc.provider_document_id}/`,
          { headers: { "Authorization": `Bearer ${settings.api_key}` } },
        )
        if (zapRes.ok) {
          const zapData = await zapRes.json() as Record<string, unknown>
          const signedFileUrl = zapData.signed_file as string | undefined
          if (signedFileUrl) {
            return NextResponse.redirect(signedFileUrl)
          }
        }
      } catch {
        // fallback to storage
      }
    }
  }

  // Fallback: find the file in Supabase Storage
  if (!doc.file_name) {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 })
  }

  const safeName = doc.file_name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80)

  const { data: files } = await supabase.storage
    .from("signature-documents")
    .list(`account-${doc.account_id}`, { limit: 100 })

  if (!files) {
    return NextResponse.json({ error: "Arquivo não encontrado no storage" }, { status: 404 })
  }

  const match = files.find((f) => f.name.endsWith(`-${safeName}`))

  if (!match) {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 })
  }

  const filePath = `account-${doc.account_id}/${match.name}`

  // Use service role to generate download URL
  const adminSupabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: signedUrlData } = await adminSupabase.storage
    .from("signature-documents")
    .createSignedUrl(filePath, 300)

  if (!signedUrlData?.signedUrl) {
    return NextResponse.json({ error: "Erro ao gerar link de download" }, { status: 500 })
  }

  return NextResponse.redirect(signedUrlData.signedUrl)
}
