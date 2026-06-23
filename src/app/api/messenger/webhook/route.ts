import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('hub.mode')
    const challenge = searchParams.get('hub.challenge')
    const verifyToken = searchParams.get('hub.verify_token')

    if (mode === 'subscribe' && challenge && verifyToken) {
      const { data: channels } = await supabaseAdmin()
        .from('channels')
        .select('config')
        .eq('type', 'messenger')

      const match = channels?.some((ch: { config: Record<string, unknown> }) =>
        ch.config?.verify_token === verifyToken
      )

      if (match) {
        return new Response(challenge, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        })
      }
    }

    return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
  } catch (error) {
    console.error('Messenger webhook GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('[Messenger webhook] received:', JSON.stringify(body))

    processWebhook(body).catch(error => {
      console.error('Error processing Messenger webhook:', error)
    })

    return NextResponse.json({ status: 'received' }, { status: 200 })
  } catch (error) {
    console.error('Messenger webhook POST error:', error)
    return NextResponse.json({ status: 'received' }, { status: 200 })
  }
}

async function processWebhook(body: { entry?: Array<{ messaging?: Array<Record<string, unknown>>; changes?: Array<Record<string, unknown>> }> }) {
  if (!body.entry) return

  for (const entry of body.entry) {
    const messaging = entry.messaging
    if (!messaging) continue

    for (const event of messaging) {
      const sender = event.sender as { id: string } | undefined
      const message = event.message as { mid?: string; text?: string; attachments?: Array<{ type: string; payload: { url: string } }> } | undefined

      if (!sender?.id || !message) continue

      const admin = supabaseAdmin()

      // Find Messenger channel config
      const { data: channel } = await admin
        .from('channels')
        .select('*')
        .eq('type', 'messenger')
        .maybeSingle()

      if (!channel) {
        console.error('No Messenger channel configured')
        continue
      }

      const psid = sender.id

      // Find contact by messenger_psid
      const { data: existingContact } = await admin
        .from('contacts')
        .select('*')
        .eq('account_id', channel.account_id)
        .eq('messenger_psid', psid)
        .maybeSingle()

      let contactId: string
      if (existingContact) {
        contactId = existingContact.id
      } else {
        const { data: newContact, error: createError } = await admin
          .from('contacts')
          .insert({
            account_id: channel.account_id,
            user_id: channel.account_id,
            messenger_psid: psid,
            name: 'Messenger User',
            phone: psid,
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating contact:', createError)
          continue
        }
        contactId = newContact.id
      }

      // Find or create conversation
      const { data: existingConv } = await admin
        .from('conversations')
        .select('*')
        .eq('account_id', channel.account_id)
        .eq('contact_id', contactId)
        .eq('channel_id', channel.id)
        .maybeSingle()

      let conversationId: string
      if (existingConv) {
        conversationId = existingConv.id
      } else {
        const { data: newConv, error: convError } = await admin
          .from('conversations')
          .insert({
            account_id: channel.account_id,
            user_id: channel.account_id,
            contact_id: contactId,
            channel_id: channel.id,
          })
          .select()
          .single()

        if (convError) {
          console.error('Error creating conversation:', convError)
          continue
        }
        conversationId = newConv.id
      }

      const messageText = message.text || ''
      const msgId = message.mid || ''

      await admin.from('messages').insert({
        conversation_id: conversationId,
        channel_id: channel.id,
        sender_type: 'customer',
        content_type: 'text',
        content_text: messageText,
        message_id: msgId,
        status: 'delivered',
      })

      await admin
        .from('conversations')
        .update({
          last_message_text: messageText,
          last_message_at: new Date().toISOString(),
          unread_count: (existingConv?.unread_count || 0) + 1,
        })
        .eq('id', conversationId)
    }
  }
}