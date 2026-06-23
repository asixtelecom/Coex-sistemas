import { createClient } from "@/lib/supabase/client"

export interface ZapsignSettings {
  id: string
  account_id: string
  api_key: string | null
  enabled: boolean
}

export interface SendDocumentInput {
  account_id: string
  deal_id?: number | null
  contact_id?: number | null
  title: string
  description?: string
  file_url: string
  file_name: string
  signer_name: string
  signer_email: string
  signer_phone?: string
}

export async function getZapsignSettings(accountId: string): Promise<ZapsignSettings | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from("zapsign_settings")
    .select("*")
    .eq("account_id", accountId)
    .maybeSingle()
  return data
}

export async function saveZapsignSettings(accountId: string, settings: Partial<ZapsignSettings>) {
  const supabase = createClient()
  const existing = await getZapsignSettings(accountId)
  if (existing) {
    return supabase.from("zapsign_settings").update(settings).eq("account_id", accountId)
  }
  return supabase.from("zapsign_settings").insert({ account_id: accountId, ...settings })
}

export async function createSignatureDocument(input: SendDocumentInput) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from("signature_documents")
    .insert({
      account_id: input.account_id,
      deal_id: input.deal_id || null,
      contact_id: input.contact_id || null,
      title: input.title,
      description: input.description || null,
      file_url: input.file_url,
      file_name: input.file_name,
      signer_name: input.signer_name,
      signer_email: input.signer_email,
      signer_phone: input.signer_phone || null,
      status: "pending",
      created_by: user?.id || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function listSignatureDocuments(accountId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from("signature_documents")
    .select("*")
    .eq("account_id", accountId)
    .eq("deleted", false)
    .order("created_at", { ascending: false })
  return data || []
}
