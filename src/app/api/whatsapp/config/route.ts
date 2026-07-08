import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import {
  registerPhoneNumber,
  subscribeWabaToApp,
  verifyPhoneNumber,
} from '@/lib/whatsapp/meta-api'
import { encrypt, decrypt } from '@/lib/whatsapp/encryption'

async function resolveAccountId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data?.account_id) return null
  return data.account_id as string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _adminClient: any = null
function supabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _adminClient
}

async function authGuard(): Promise<{ user: { id: string }; accountId: string } | NextResponse> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) as NextResponse
  }
  const accountId = await resolveAccountId(supabase, user.id)
  if (!accountId) {
    return NextResponse.json({ error: 'Your profile is not linked to an account.' }, { status: 403 }) as NextResponse
  }
  return { user, accountId }
}

function isNextResponse(v: unknown): v is NextResponse {
  return v instanceof NextResponse
}

async function upsertChannel(accountId: string, whatsappConfigId: string, name: string | null, displayPhone: string | null, status: string) {
  const admin = supabaseAdmin()
  const channelName = name || displayPhone || 'WhatsApp'

  const { data: existing } = await admin
    .from('channels')
    .select('id')
    .eq('type', 'whatsapp')
    .eq('account_id', accountId)
    .filter('config->>whatsapp_config_id', 'eq', whatsappConfigId)
    .maybeSingle()

  const channelData = {
    account_id: accountId,
    type: 'whatsapp' as const,
    name: channelName,
    config: { whatsapp_config_id: whatsappConfigId, display_phone: displayPhone },
    status: status === 'connected' ? 'connected' as const : 'disconnected' as const,
    is_active: true,
  }

  if (existing) {
    const { error } = await admin
      .from('channels')
      .update(channelData)
      .eq('id', existing.id)
    if (error) console.error('Error updating channel:', error)
  } else {
    const { error } = await admin
      .from('channels')
      .insert(channelData)
    if (error) console.error('Error inserting channel:', error)
  }
}

export async function GET() {
  try {
    const guard = await authGuard()
    if (isNextResponse(guard)) return guard
    const { accountId } = guard

    const supabase = await createClient()
    const { data: configs, error: configError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: true })

    if (configError) {
      console.error('Error fetching whatsapp_configs:', configError)
      return NextResponse.json({ configs: [] }, { status: 200 })
    }

    const results = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (configs ?? []).map(async (config: any) => {
        let connected = false
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let phoneInfo: any = null
        let failureReason: string | null = null

        try {
          const token = decrypt(config.access_token)
          phoneInfo = await verifyPhoneNumber({
            phoneNumberId: config.phone_number_id,
            accessToken: token,
          })
          connected = true
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          if (msg.includes('decrypt') || msg.includes('ENCRYPTION_KEY')) {
            failureReason = 'token_corrupted'
          } else {
            failureReason = 'meta_api_error'
          }
        }

        const { data: channel } = await supabaseAdmin()
          .from('channels')
          .select('id')
          .eq('type', 'whatsapp')
          .eq('account_id', accountId)
          .filter('config->>whatsapp_config_id', 'eq', config.id)
          .maybeSingle()

        return {
          ...config,
          access_token: undefined,
          verify_token: undefined,
          has_verify_token: !!config.verify_token,
          connected,
          phone_info: phoneInfo,
          channel_id: channel?.id ?? null,
          failure_reason: failureReason,
          webhook_url: config.channel_token
            ? `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/whatsapp/webhook/${config.channel_token}`
            : null,
        }
      })
    )

    return NextResponse.json({ configs: results }, { status: 200 })
  } catch (error) {
    console.error('Error in WhatsApp config GET:', error)
    return NextResponse.json({ configs: [] }, { status: 200 })
  }
}

export async function POST(request: Request) {
  try {
    const guard = await authGuard()
    if (isNextResponse(guard)) return guard
    const { user, accountId } = guard

    const body = await request.json()
    const { id, phone_number_id, waba_id, access_token, verify_token, pin, display_phone, name } = body

    if (!access_token || !phone_number_id) {
      return NextResponse.json(
        { error: 'access_token and phone_number_id are required' },
        { status: 400 }
      )
    }

    if (pin !== undefined && pin !== null && pin !== '') {
      if (typeof pin !== 'string' || !/^\d{6}$/.test(pin)) {
        return NextResponse.json(
          { error: 'PIN must be exactly 6 digits.' },
          { status: 400 }
        )
      }
    }

    const { data: claimed, error: claimedError } = await supabaseAdmin()
      .from('whatsapp_config')
      .select('id, account_id')
      .eq('phone_number_id', phone_number_id)
      .neq('account_id', accountId)
      .maybeSingle()

    if (claimedError) {
      console.error('Error checking phone_number_id ownership:', claimedError)
      return NextResponse.json(
        { error: 'Failed to validate configuration' },
        { status: 500 }
      )
    }

    if (claimed) {
      return NextResponse.json(
        {
          error:
            'This WhatsApp phone number is already linked to another account on this instance.',
        },
        { status: 409 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let phoneInfo: any
    try {
      phoneInfo = await verifyPhoneNumber({
        phoneNumberId: phone_number_id,
        accessToken: access_token,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Meta API error'
      console.error('Meta API verification failed during save:', message)
      return NextResponse.json(
        { error: `Meta API error: ${message}` },
        { status: 400 }
      )
    }

    let encryptedAccessToken: string
    let encryptedVerifyToken: string | null | undefined = undefined
    try {
      encryptedAccessToken = encrypt(access_token)
      if ('verify_token' in body) {
        encryptedVerifyToken = body.verify_token ? encrypt(body.verify_token) : null
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown encryption error'
      console.error('Encryption failed:', message)
      return NextResponse.json(
        {
          error:
            'Failed to encrypt token. Check that ENCRYPTION_KEY is a valid 64-character hex string in your environment variables.',
        },
        { status: 500 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let existingConfig: any = null
    if (id) {
      const { data } = await supabaseAdmin()
        .from('whatsapp_config')
        .select('id, registered_at, account_id')
        .eq('id', id)
        .eq('account_id', accountId)
        .maybeSingle()
      existingConfig = data
    } else {
      const { data } = await supabaseAdmin()
        .from('whatsapp_config')
        .select('id, registered_at')
        .eq('phone_number_id', phone_number_id)
        .eq('account_id', accountId)
        .maybeSingle()
      existingConfig = data
    }

    const sameNumber = existingConfig?.registered_at != null
    let registeredAt: string | null = existingConfig?.registered_at ?? null
    let registrationError: string | null = null
    let registrationSkipped = false

    const needsRegistration = !sameNumber || (typeof pin === 'string' && pin.length > 0)
    if (needsRegistration) {
      if (!pin) {
        registrationSkipped = true
      } else {
        try {
          await registerPhoneNumber({
            phoneNumberId: phone_number_id,
            accessToken: access_token,
            pin,
          })
          registeredAt = new Date().toISOString()
        } catch (err) {
          registrationError =
            err instanceof Error ? err.message : 'Unknown Meta API error'
          console.error('Phone number /register failed:', registrationError)
        }
      }
    }

    let subscribedAppsAt: string | null = null
    if (waba_id) {
      try {
        await subscribeWabaToApp({
          wabaId: waba_id,
          accessToken: access_token,
        })
        subscribedAppsAt = new Date().toISOString()
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.warn('WABA subscribed_apps failed (non-fatal):', message)
      }
    }

    const baseRow: Record<string, unknown> = {
      phone_number_id,
      waba_id: waba_id || null,
      access_token: encryptedAccessToken,
      ...(encryptedVerifyToken !== undefined ? { verify_token: encryptedVerifyToken } : {}),
      status: registrationError ? 'disconnected' : 'connected',
      connected_at: registrationError ? null : new Date().toISOString(),
      registered_at: registrationError ? null : registeredAt,
      subscribed_apps_at: subscribedAppsAt ?? null,
      last_registration_error: registrationError,
      display_phone: display_phone || null,
      name: name || null,
      updated_at: new Date().toISOString(),
    }

    const supabase = await createClient()

    let savedId: string

    if (existingConfig) {
      const { error: updateError } = await supabase
        .from('whatsapp_config')
        .update(baseRow)
        .eq('id', existingConfig.id)

      if (updateError) {
        console.error('Error updating whatsapp_config:', updateError)
        return NextResponse.json(
          { error: 'Failed to update configuration' },
          { status: 500 }
        )
      }
      savedId = existingConfig.id as string
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('whatsapp_config')
        .insert({
          account_id: accountId,
          user_id: user.id,
          ...baseRow,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error inserting whatsapp_config:', insertError)
        return NextResponse.json(
          { error: 'Failed to save configuration' },
          { status: 500 }
        )
      }
      savedId = (inserted as Record<string, unknown>).id as string
    }

    await upsertChannel(
      accountId,
      savedId,
      name || display_phone || null,
      display_phone || null,
      registrationError ? 'disconnected' : 'connected',
    )

    if (registrationError) {
      return NextResponse.json({
        success: false,
        saved: true,
        registered: false,
        registration_error: registrationError,
        phone_info: phoneInfo,
      })
    }

    return NextResponse.json({
      success: true,
      saved: true,
      registered: registeredAt != null,
      registration_skipped: registrationSkipped,
      phone_info: phoneInfo,
    })
  } catch (error) {
    console.error('Error in WhatsApp config POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const guard = await authGuard()
    if (isNextResponse(guard)) return guard
    const { accountId } = guard

    let configId: string | null = null
    try {
      const body = await request.json()
      configId = body?.id ?? null
    } catch {
      // No body = delete all (backward compat)
    }

    const admin = supabaseAdmin()
    const supabase = await createClient()

    if (configId) {
      const { data: config } = await admin
        .from('whatsapp_config')
        .select('id')
        .eq('id', configId)
        .eq('account_id', accountId)
        .maybeSingle()

      if (!config) {
        return NextResponse.json({ error: 'Config not found' }, { status: 404 })
      }

      const { error: chErr } = await admin
        .from('channels')
        .delete()
        .eq('type', 'whatsapp')
        .eq('account_id', accountId)
        .filter('config->>whatsapp_config_id', 'eq', configId)

      if (chErr) {
        console.error('Error deleting linked channel:', chErr)
      }

      const { error: delError } = await supabase
        .from('whatsapp_config')
        .delete()
        .eq('id', configId)
        .eq('account_id', accountId)

      if (delError) {
        console.error('Error deleting whatsapp_config:', delError)
        return NextResponse.json(
          { error: 'Failed to delete configuration' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true })
    }

    const { data: configs } = await supabase
      .from('whatsapp_config')
      .select('id')
      .eq('account_id', accountId)

    if (configs) {
      for (const cfg of configs) {
        await admin
          .from('channels')
          .delete()
          .eq('type', 'whatsapp')
          .eq('account_id', accountId)
          .filter('config->>whatsapp_config_id', 'eq', cfg.id)
      }
    }

    const { error: deleteError } = await supabase
      .from('whatsapp_config')
      .delete()
      .eq('account_id', accountId)

    if (deleteError) {
      console.error('Error deleting whatsapp_configs:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete configurations' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in WhatsApp config DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
