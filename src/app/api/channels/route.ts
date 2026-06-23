import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function supabaseAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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

    const accountId = profile?.account_id
    if (!accountId) {
      return NextResponse.json({ error: 'No account' }, { status: 403 })
    }

    const { type, config } = await request.json()
    if (!type || !config) {
      return NextResponse.json({ error: 'type and config are required' }, { status: 400 })
    }

    const validTypes = ['instagram', 'messenger', 'telegram', 'webchat']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid channel type' }, { status: 400 })
    }

    const admin = supabaseAdmin()

    const { data: existing } = await admin
      .from('channels')
      .select('id')
      .eq('account_id', accountId)
      .eq('type', type)
      .maybeSingle()

    const status = type === 'webchat'
      ? 'connected'
      : config.access_token ? 'connected' : 'disconnected'

    const channelData = {
      account_id: accountId,
      type,
      name: config.page_name || config.ig_user_id || type.charAt(0).toUpperCase() + type.slice(1),
      config,
      status,
      is_active: true,
    }

    if (existing) {
      const { error } = await admin
        .from('channels')
        .update(channelData)
        .eq('id', existing.id)

      if (error) throw error
    } else {
      const { error } = await admin
        .from('channels')
        .insert(channelData)

      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Channels API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  return POST(request)
}

export async function DELETE(request: Request) {
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

    const accountId = profile?.account_id
    if (!accountId) {
      return NextResponse.json({ error: 'No account' }, { status: 403 })
    }

    const { type } = await request.json()
    if (!type) {
      return NextResponse.json({ error: 'type is required' }, { status: 400 })
    }

    const admin = supabaseAdmin()
    const { error } = await admin
      .from('channels')
      .delete()
      .eq('account_id', accountId)
      .eq('type', type)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Channels DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}