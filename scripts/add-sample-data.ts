import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('Adding sample data...');

  // Step 1: Update channels type constraint to include linkedin
  try {
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE channels DROP CONSTRAINT IF EXISTS channels_type_check;
        ALTER TABLE channels ADD CONSTRAINT channels_type_check CHECK (type IN ('whatsapp', 'instagram', 'messenger', 'telegram', 'webchat', 'linkedin'));
      `
    });
  } catch (err) {
    console.log('Note: Could not run exec_sql (maybe not available), proceeding...');
  }

  // Step 2: Get account
  const { data: accounts, error: accountError } = await supabase
    .from('accounts')
    .select('id')
    .limit(1);
    
  if (accountError) throw accountError;
  if (!accounts || accounts.length === 0) {
    console.error('No accounts found!');
    return;
  }
  const accountId = accounts[0].id;
  console.log('Using account:', accountId);

  // Step 3: Create channels
  const channelsToCreate = [
    { type: 'webchat', name: 'Webchat' },
    { type: 'instagram', name: 'Instagram' },
    { type: 'linkedin', name: 'LinkedIn' }
  ];

  const createdChannels: any[] = [];
  for (const channel of channelsToCreate) {
    const { data: existing } = await supabase
      .from('channels')
      .select('*')
      .eq('account_id', accountId)
      .eq('type', channel.type)
      .maybeSingle();
      
    if (existing) {
      createdChannels.push(existing);
    } else {
      const { data: newChannel, error } = await supabase
        .from('channels')
        .insert({
          account_id: accountId,
          type: channel.type,
          name: channel.name,
          status: 'connected'
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error creating channel', channel.type, error);
      } else {
        createdChannels.push(newChannel);
        console.log('Created channel:', channel.type);
      }
    }
  }

  // Step 4: Create contacts
  const contactsToCreate = [
    { name: 'Maria Silva', phone: 'maria@webchat.com' },
    { name: 'João Pereira', phone: '@joao_instagram' },
    { name: 'Ana Costa', phone: 'ana.costa@linkedin.com' }
  ];

  const createdContacts: any[] = [];
  for (const contact of contactsToCreate) {
    const { data: newContact, error } = await supabase
      .from('contacts')
      .insert({
        account_id: accountId,
        name: contact.name,
        phone: contact.phone
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error creating contact', contact.name, error);
    } else {
      createdContacts.push(newContact);
      console.log('Created contact:', contact.name);
    }
  }

  // Step 5: Create conversations and messages
  const conversations = [
    {
      contactIdx: 0,
      channelType: 'webchat',
      messages: [
        'Olá! Gostaria de saber mais sobre os seus serviços.',
        'Claro! Nossos serviços incluem atendimento personalizado e suporte 24h.',
        'Perfeito! Vou entrar em contato mais tarde para discutir detalhes.',
        'Fico no aguardo! Qualquer dúvida, é só chamar.'
      ]
    },
    {
      contactIdx: 1,
      channelType: 'instagram',
      messages: [
        'Ei! Vi o seu post sobre o novo produto, parece incrível!',
        'Obrigado pelo feedback! O produto já está disponível para compra.',
        'Legal, quais são as opções de pagamento?',
        'Aceitamos cartão, Pix e boleto bancário.'
      ]
    },
    {
      contactIdx: 2,
      channelType: 'linkedin',
      messages: [
        'Boa tarde! Gostaria de propor uma parceria comercial.',
        'Boa tarde! Fico feliz com seu contato. Podemos agendar uma reunião?',
        'Claro, que tal amanhã às 15h?',
        'Perfeito! Enviarei o link da reunião em breve.'
      ]
    }
  ];

  for (const conv of conversations) {
    const contact = createdContacts[conv.contactIdx];
    const channel = createdChannels.find(c => c.type === conv.channelType);
    
    if (!contact || !channel) continue;

    // Create conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        account_id: accountId,
        user_id: accountId,
        contact_id: contact.id,
        channel_id: channel.id,
        status: 'open'
      })
      .select()
      .single();
      
    if (convError) {
      console.error('Error creating conversation for', contact.name, convError);
      continue;
    }
    console.log('Created conversation for', contact.name);

    // Create messages
    for (let i = 0; i < conv.messages.length; i++) {
      const isCustomer = i % 2 === 0;
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          channel_id: channel.id,
          sender_type: isCustomer ? 'customer' : 'agent',
          content_type: 'text',
          content_text: conv.messages[i]
        });
        
      if (msgError) {
        console.error('Error adding message', i, msgError);
      }
    }

    // Update last message
    await supabase
      .from('conversations')
      .update({
        last_message_text: conv.messages[conv.messages.length - 1],
        last_message_at: new Date().toISOString()
      })
      .eq('id', conversation.id);
  }

  console.log('Done!');
}

main().catch(console.error);
