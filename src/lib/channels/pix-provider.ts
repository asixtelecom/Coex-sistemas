import { createClient } from "@/lib/supabase/client"

export interface PixSettings {
  id: string
  account_id: string
  provider: string
  api_key: string | null
  api_url: string | null
  pix_key: string | null
  pix_key_type: string
  enabled: boolean
}

export interface CreatePixPaymentInput {
  account_id: string
  deal_id?: number | null
  contact_id?: number | null
  amount: number
  description?: string
  expires_in_minutes?: number
}

export async function getPixSettings(accountId: string): Promise<PixSettings | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from("pix_settings")
    .select("*")
    .eq("account_id", accountId)
    .maybeSingle()
  return data
}

export async function savePixSettings(accountId: string, settings: Partial<PixSettings>) {
  const supabase = createClient()
  const existing = await getPixSettings(accountId)
  if (existing) {
    return supabase.from("pix_settings").update(settings).eq("account_id", accountId)
  }
  return supabase.from("pix_settings").insert({ account_id: accountId, ...settings })
}

export async function createPixPayment(input: CreatePixPaymentInput) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from("pix_payments")
    .insert({
      account_id: input.account_id,
      deal_id: input.deal_id || null,
      contact_id: input.contact_id || null,
      amount: input.amount,
      description: input.description || null,
      status: "pending",
      created_by: user?.id || null,
      expires_at: input.expires_in_minutes
        ? new Date(Date.now() + input.expires_in_minutes * 60000).toISOString()
        : null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function listPixPayments(accountId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from("pix_payments")
    .select("*")
    .eq("account_id", accountId)
    .eq("deleted", false)
    .order("created_at", { ascending: false })
  return data || []
}
