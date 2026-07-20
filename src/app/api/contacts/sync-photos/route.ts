import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/flows/admin-client'

const EVOLUTION_API_URL = 'http://localhost:8080'
const EVOLUTION_API_KEY = 'd1c5f40478803e0a1135907a90b559dc94d8b3c4392acc1539b9c2650d32c71b'
const BATCH_SIZE = 28

/**
 * POST /api/contacts/sync-photos
 * Body: { offset?: number }
 *   offset=0  → processes contacts 1–28
 *   offset=28 → processes contacts 29–56
 *   ...
 * Returns: { processed, updated, nextOffset, total, done }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .maybeSingle()
    const accountId = profile?.account_id as string | undefined
    if (!accountId) {
      return NextResponse.json({ error: 'Your profile is not linked to an account.' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const offset = typeof body.offset === 'number' ? body.offset : 0

    // Fetch total count of contacts for this account
    const { count: totalCount } = await supabaseAdmin()
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)

    const total = totalCount ?? 0

    // Fetch the batch
    const { data: contacts } = await supabaseAdmin()
      .from('contacts')
      .select('id, phone, avatar_url')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .range(offset, offset + BATCH_SIZE - 1)

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ processed: 0, updated: 0, nextOffset: offset, total, done: true })
    }

    // Get an open Evolution instance
    let openInstanceName: string | null = null
    try {
      const instResponse = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
        headers: { apikey: EVOLUTION_API_KEY },
      })
      if (instResponse.ok) {
        const instances = (await instResponse.json()) as Array<{ connectionStatus: string; name: string }>
        const open = instances.find((i) => i.connectionStatus === 'open')
        if (open) openInstanceName = open.name
      }
    } catch {
      // ignore
    }

    let updated = 0
    const results: Array<{ id: string; phone: string; avatar_url: string | null; success: boolean }> = []

    for (const contact of contacts) {
      const phone = contact.phone
      let cleanPhone = phone.replace(/\D/g, '')
      if (cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) {
        cleanPhone = '55' + cleanPhone
      }

      let avatarUrl: string | null = null

      if (openInstanceName) {
        try {
          const profileResponse = await fetch(`${EVOLUTION_API_URL}/chat/fetchProfile/${openInstanceName}`, {
            method: 'POST',
            headers: {
              apikey: EVOLUTION_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ number: cleanPhone }),
          })

          if (profileResponse.ok) {
            const profileData = (await profileResponse.json()) as { picture?: string }
            if (profileData?.picture) {
              avatarUrl = profileData.picture
            }
          }
        } catch {
          // ignore individual failures
        }
      }

      if (avatarUrl && avatarUrl !== contact.avatar_url) {
        const { error: updateError } = await supabaseAdmin()
          .from('contacts')
          .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
          .eq('id', contact.id)

        if (!updateError) {
          updated++
        }
      }

      results.push({
        id: contact.id,
        phone: phone,
        avatar_url: avatarUrl,
        success: !!avatarUrl,
      })

      // Small delay to avoid overwhelming the Evolution API
      await new Promise((resolve) => setTimeout(resolve, 300))
    }

    const nextOffset = offset + contacts.length
    const done = nextOffset >= total

    return NextResponse.json({
      processed: contacts.length,
      updated,
      nextOffset,
      total,
      done,
      results,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
