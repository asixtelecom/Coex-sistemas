import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  const eventType = body.event_type as string | undefined
  const docToken = body.token as string | undefined

  if (!eventType || !docToken) {
    return NextResponse.json({ error: "missing event_type or token" }, { status: 400 })
  }

  const { data: doc } = await supabase
    .from("signature_documents")
    .select("id, status")
    .eq("provider_document_id", docToken)
    .maybeSingle()

  if (!doc) {
    return NextResponse.json({ error: "document not found" }, { status: 404 })
  }

  const statusMap: Record<string, string> = {
    doc_signed: "signed",
    doc_refused: "cancelled",
    doc_expired: "expired",
    doc_deleted: "cancelled",
    doc_created: "sent",
  }

  const newStatus = statusMap[eventType]
  if (!newStatus) {
    return NextResponse.json({ received: true })
  }

  const update: Record<string, string | null> = { status: newStatus }

  if (eventType === "doc_signed") {
    update.signed_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from("signature_documents")
    .update(update)
    .eq("id", doc.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
