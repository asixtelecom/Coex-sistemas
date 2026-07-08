import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Lazy, shared service-role client for automation engine work.
// Mirrors the pattern used by the webhook handler
// (src/app/api/whatsapp/webhook/route.ts).
let _adminClient: SupabaseClient | null = null

export function supabaseAdmin(): SupabaseClient {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return _adminClient
}

let _internalAdminClient: SupabaseClient | null = null

const INTERNAL_SUPABASE_URL = process.env.SUPABASE_INTERNAL_URL || 'http://127.0.0.1:54321';

export function supabaseInternalAdmin(): SupabaseClient {
  if (!_internalAdminClient) {
    _internalAdminClient = createClient(
      INTERNAL_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return _internalAdminClient
}
