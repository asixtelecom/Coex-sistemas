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
        .eq('type', 'instagram')

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
    console.error('Instagram webhook GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('[Instagram webhook] received:', JSON.stringify(body))

    // Process asynchronously
    processWebhook(body).catch(error => {
      console.error('Error processing Instagram webhook:', error)
    })

    return NextResponse.json({ status: 'received' }, { status: 200 })
  } catch (error) {
    console.error('Instagram webhook POST error:', error)
    return NextResponse.json({ status: 'received' }, { status: 200 })
  }
}

async function processWebhook(body: { entry?: Array<{ changes?: Array<{ field: string; value: Record<string, unknown> }> }> }) {
  if (!body.entry) return

  for (const entry of body.entry) {
    for (const change of entry.changes || []) {
      if (change.field !== 'messages') continue

      const value = change.value as {
        sender?: { id: string; name?: string }
        message?: { mid: string; text?: string; attachments?: Array<{ type: string; payload: { url: string } }> }
      }

      if (!value.sender?.id) continue

      const admin = supabaseAdmin()

      // Find Instagram channel config
      const { data: channel } = await admin
        .from('channels')
        .select('*')
        .eq('type', 'instagram')
        .maybeSingle()

      if (!channel) {
        console.error('No Instagram channel configured')
        continue
      }

      const senderIgId = value.sender.id
      const senderName = value.sender.name || 'Instagram User'

      // Find contact by ig_id
      const { data: existingContact } = await admin
        .from('contacts')
        .select('*')
        .eq('account_id', channel.account_id)
        .eq('ig_id', senderIgId)
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
            ig_id: senderIgId,
            name: senderName,
            phone: senderIgId,
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating contact:', createError)
          continue
        }
        contactId = newContact.id
      }

      // Find or create conversation with channel_id
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

      const messageText = value.message?.text || ''
      const msgId = value.message?.mid || ''

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