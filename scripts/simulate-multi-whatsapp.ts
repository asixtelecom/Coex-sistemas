import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('=== Simulando 2 mensagens por canal WhatsApp ===\n');

  // 1. Pegar a primeira conta disponível
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id')
    .limit(1);

  if (!accounts?.length) {
    console.error('Nenhuma conta encontrada!');
    return;
  }
  const accountId = accounts[0].id;
  console.log(`Conta: ${accountId}\n`);

  // 2. Criar/pegar canais WhatsApp (Alphaville final 09, Arujá final 08)
  const channelsDef = [
    { name: 'Alphaville', display_phone: '+5511999990009', digits: '09' },
    { name: 'Arujá',      display_phone: '+5511999990008', digits: '08' },
  ];

  const channels: any[] = [];
  for (const def of channelsDef) {
    const { data: existing } = await supabase
      .from('channels')
      .select('*')
      .eq('account_id', accountId)
      .eq('type', 'whatsapp')
      .filter('config->>display_phone', 'eq', def.display_phone)
      .maybeSingle();

    if (existing) {
      console.log(`Canal já existe: ${def.name} (${def.digits})`);
      channels.push(existing);
    } else {
      const { data: ch, error } = await supabase
        .from('channels')
        .insert({
          account_id: accountId,
          type: 'whatsapp',
          name: def.name,
          config: { display_phone: def.display_phone },
          status: 'connected',
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error(`Erro ao criar canal ${def.name}:`, error.message);
        continue;
      }
      console.log(`Canal criado: ${def.name} (${def.digits}) — id: ${ch.id}`);
      channels.push(ch);
    }
  }

  if (channels.length === 0) {
    console.error('Nenhum canal disponível. Abortando.');
    return;
  }

  // 3. Criar contatos
  const contactsDef = [
    { name: 'Maria Santos', phone: '+5511911111111' },
    { name: 'João Oliveira', phone: '+5511922222222' },
  ];

  const contacts: any[] = [];
  for (const def of contactsDef) {
    const { data: c, error } = await supabase
      .from('contacts')
      .insert({
        account_id: accountId,
        name: def.name,
        phone: def.phone,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Já existe — buscar
        const { data: existing } = await supabase
          .from('contacts')
          .select('*')
          .eq('account_id', accountId)
          .eq('phone', def.phone)
          .single();
        if (existing) {
          console.log(`Contato já existe: ${def.name}`);
          contacts.push(existing);
          continue;
        }
      }
      console.error(`Erro ao criar contato ${def.name}:`, error.message);
      continue;
    }
    console.log(`Contato criado: ${def.name}`);
    contacts.push(c);
  }

  // 4. Criar conversas com mensagens
  const conversationsDef = [
    {
      channelIdx: 0,
      contactIdx: 0,
      channelLabel: 'final 09 - Alphaville',
      messages: [
        { sender: 'customer', text: 'Bom dia! Gostaria de um orçamento para mudança em Alphaville.' },
        { sender: 'agent',    text: 'Bom dia, Maria! Claro, qual o tamanho do imóvel?' },
      ],
    },
    {
      channelIdx: 1,
      contactIdx: 1,
      channelLabel: 'final 08 - Arujá',
      messages: [
        { sender: 'customer', text: 'Olá! Preciso de ajuda com uma entrega em Arujá.' },
        { sender: 'agent',    text: 'Olá, João! Pode me passar o endereço de retirada?' },
      ],
    },
  ];

  for (const def of conversationsDef) {
    const channel = channels[def.channelIdx];
    const contact = contacts[def.contactIdx];
    if (!channel || !contact) continue;

    // Verificar se já existe conversa para esse par (contact + channel)
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('*')
      .eq('account_id', accountId)
      .eq('contact_id', contact.id)
      .eq('channel_id', channel.id)
      .maybeSingle();

    let conversation: any;
    if (existingConv) {
      conversation = existingConv;
      console.log(`Conversa já existe: ${contact.name} no ${def.channelLabel}`);
    } else {
      const { data: conv, error: convErr } = await supabase
        .from('conversations')
        .insert({
          account_id: accountId,
          contact_id: contact.id,
          channel_id: channel.id,
          status: 'open',
        })
        .select()
        .single();

      if (convErr) {
        console.error(`Erro ao criar conversa para ${contact.name}:`, convErr.message);
        continue;
      }
      conversation = conv;
      console.log(`Conversa criada: ${contact.name} no ${def.channelLabel}`);
    }

    // Criar mensagens
    let lastMsgText = '';
    const now = new Date();
    for (let i = 0; i < def.messages.length; i++) {
      const msg = def.messages[i];
      const createdAt = new Date(now.getTime() - (def.messages.length - i) * 60000).toISOString();
      lastMsgText = msg.text;

      const { error: msgErr } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          channel_id: channel.id,
          sender_type: msg.sender,
          content_type: 'text',
          content_text: msg.text,
          status: msg.sender === 'agent' ? 'sent' : 'delivered',
          created_at: createdAt,
        });

      if (msgErr) {
        if (msgErr.code === '23505') continue; // duplicata, ignora
        console.error(`  Erro ao inserir msg ${i} para ${contact.name}:`, msgErr.message);
      }
    }

    // Atualizar metadados da conversa
    await supabase
      .from('conversations')
      .update({
        last_message_text: lastMsgText,
        last_message_at: new Date().toISOString(),
        unread_count: def.messages.filter(m => m.sender === 'customer').length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversation.id);

    console.log(`  ${def.messages.length} mensagens inseridas\n`);
  }

  console.log('=== Simulação concluída! Abra o inbox para ver os canais com badges "09" e "08". ===');
}

main().catch(console.error);
