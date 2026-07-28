import { NextResponse } from 'next/server'
import { decrypt, encrypt, isLegacyFormat } from '@/lib/whatsapp/encryption'
import { verifyMetaWebhookSignature } from '@/lib/whatsapp/webhook-signature'
import {
  supabaseAdmin,
  processMessage,
  handleStatusUpdate,
  isTemplateWebhookField,
  handleTemplateWebhookChange,
} from '@/lib/whatsapp/webhook-shared'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ channel_token: string }> },
) {
  try {
    const { channel_token } = await params
    const url = new URL(_request.url)
    const mode = url.searchParams.get('hub.mode')
    const challenge = url.searchParams.get('hub.challenge')
    const verifyTokenParam = url.searchParams.get('hub.verify_token')

    if (mode !== 'subscribe' || !challenge || !verifyTokenParam) {
      return NextResponse.json(
        { error: 'Missing verification parameters' },
        { status: 400 }
      )
    }

    const { data: config, error: configError } = await supabaseAdmin()
      .from('whatsapp_config')
      .select('*')
      .eq('channel_token', channel_token)
      .maybeSingle()

    if (configError || !config) {
      console.error('No config found for channel_token:', channel_token, configError)
      return NextResponse.json(
        { error: 'Verification failed' },
        { status: 403 }
      )
    }

    if (!config.verify_token) {
      return NextResponse.json(
        { error: 'No verify token configured' },
        { status: 403 }
      )
    }

    try {
      const storedToken = decrypt(config.verify_token)
      if (storedToken !== verifyTokenParam) {
        return NextResponse.json(
          { error: 'Verification token mismatch' },
          { status: 403 }
        )
      }
    } catch {
      return NextResponse.json(
        { error: 'Verification token corrupt' },
        { status: 403 }
      )
    }

    if (isLegacyFormat(config.verify_token)) {
      void supabaseAdmin()
        .from('whatsapp_config')
        .update({ verify_token: encrypt(verifyTokenParam) })
        .eq('id', config.id)
        .then(({ error }: { error: unknown }) => {
          if (error) {
            console.warn(
              '[webhook/token] verify_token GCM upgrade failed:',
              (error as { message?: string })?.message ?? error,
            )
          }
        })
    }

    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  } catch (error) {
    console.error('Error in webhook GET verification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ channel_token: string }> },
) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  if (!verifyMetaWebhookSignature(rawBody, signature)) {
    console.warn('[webhook/token] rejected request with invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let body: { entry?: Array<Record<string, unknown>> }
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // channel_token shared across all numbers — identify by phone_number_id
  const firstEntry = body.entry?.[0] as
    | { changes?: Array<Record<string, unknown>> }
    | undefined
  const firstChange = firstEntry?.changes?.[0] as
    | { value?: { metadata?: { phone_number_id?: string } } }
    | undefined
  const phoneNumberId = firstChange?.value?.metadata?.phone_number_id
  if (!phoneNumberId) {
    console.error('[webhook/token] no phone_number_id in payload')
    return NextResponse.json({ error: 'Missing phone_number_id' }, { status: 400 })
  }

  processTokenWebhook(body, phoneNumberId).catch((error) => {
  const { channel_token } = await params

  processTokenWebhook(body, channel_token).catch((error) => {
    console.error('Error processing token webhook:', error)
  })

  return NextResponse.json({ status: 'received' }, { status: 200 })
}

async function processTokenWebhook(
  body: { entry?: Array<Record<string, unknown>> },
  phoneNumberId: string,
) {
  if (!body.entry) return

  const { data: configRows, error: configError } = await supabaseAdmin()
    .from('whatsapp_config')
    .select('*')
    .eq('phone_number_id', phoneNumberId)

  if (configError) {
    console.error('Error fetching config for phone_number_id:', phoneNumberId, configError)
    return
  }

  if (!configRows || configRows.length === 0) {
    console.error('No config found for phone_number_id:', phoneNumberId)
    return
  }

  if (configRows.length > 1) {
    console.error('Multiple configs found for phone_number_id:', phoneNumberId)
    return
  }

  const config = configRows[0]

  channelToken: string,
) {
  if (!body.entry) return

  const { data: config, error: configError } = await supabaseAdmin()
    .from('whatsapp_config')
    .select('*')
    .eq('channel_token', channelToken)
    .maybeSingle()

  if (configError || !config) {
    console.error('No config found for channel_token:', channelToken, configError)
    return
  }

  let channelId: string | undefined
  if (config.id) {
    const { data: channels } = await supabaseAdmin()
      .from('channels')
      .select('id')
      .eq('type', 'whatsapp')
      .eq('account_id', config.account_id)
      .filter('config->>whatsapp_config_id', 'eq', config.id)
      .maybeSingle()

    if (channels) {
      channelId = channels.id
    }
  }

  const decryptedAccessToken = decrypt(config.access_token)

  for (const entry of body.entry) {
    const changes = (entry as Record<string, unknown>).changes as Array<Record<string, unknown>> | undefined
    if (!changes) continue

    for (const change of changes) {
      const field = change.field as string | undefined
      const value = change.value as Record<string, unknown> | undefined

      if (!value) continue

      if (field && isTemplateWebhookField(field)) {
        await handleTemplateWebhookChange(
          { field, value },
          supabaseAdmin(),
        )
        continue
      }

      const statuses = value.statuses as Array<Record<string, string>> | undefined
      if (statuses) {
        for (const status of statuses) {
          await handleStatusUpdate(status as { id: string; status: string; timestamp: string; recipient_id: string })
        }
      }

      const messages = value.messages as Array<Record<string, unknown>> | undefined
      const contacts = value.contacts as Array<Record<string, unknown>> | undefined

      if (!messages || !contacts) continue

      for (let i = 0; i < messages.length; i++) {
        const message = messages[i]
        const contact = (contacts[i] || contacts[0]) as { profile: { name: string }; wa_id: string }

        await processMessage(
          message as { id: string; from: string; timestamp: string; type: string; text?: { body: string }; image?: { id: string; mime_type: string; caption?: string }; video?: { id: string; mime_type: string; caption?: string }; document?: { id: string; mime_type: string; filename?: string; caption?: string }; audio?: { id: string; mime_type: string }; sticker?: { id: string; mime_type: string }; location?: { latitude: number; longitude: number; name?: string; address?: string }; reaction?: { message_id: string; emoji: string }; interactive?: { type: 'button_reply' | 'list_reply'; button_reply?: { id: string; title: string }; list_reply?: { id: string; title: string; description?: string } }; context?: { id: string } },
          contact,
          config.account_id,
          config.user_id,
          decryptedAccessToken,
          channelId,
        )
      }
    }
  }
}
