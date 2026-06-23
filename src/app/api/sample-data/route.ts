import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 6 Email Templates
const EMAIL_TEMPLATES = [
  {
    title: 'Boas-vindas ao cliente',
    description: 'Template para dar boas-vindas a novos clientes',
    body: `<p>Olá {nome},</p>

<p>Seja muito bem-vindo(a) à nossa família! 🎉</p>

<p>Estamos muito felizes em tê-lo(a) conosco. Esperamos que tenha uma experiência incrível com nossos produtos/serviços.</p>

<p>Qualquer dúvida, é só entrar em contato!</p>

<p>Atenciosamente,<br>Equipe {empresa}</p>`
  },
  {
    title: 'Confirmação de Pedido',
    description: 'Confirmação automática de pedido realizado',
    body: `<p>Olá {nome},</p>

<p>Obrigado por seu pedido! 🛒</p>

<p><strong>Detalhes do Pedido:</strong></p>
<ul>
  <li>Número do Pedido: {pedido}</li>
  <li>Data: {data}</li>
  <li>Valor Total: {valor}</li>
</ul>

<p>Você receberá um e-mail com a confirmação do envio em breve.</p>

<p>Atenciosamente,<br>Equipe {empresa}</p>`
  },
  {
    title: 'Acompanhamento de Lead',
    description: 'Acompanhamento de potenciais clientes interessados',
    body: `<p>Olá {nome},</p>

<p>Espero que esteja tudo bem!</p>

<p>Recentemente você demonstrou interesse em nossos serviços. Gostaria de ajudar com mais informações ou agendar uma conversa?</p>

<p>Estamos à disposição!</p>

<p>Atenciosamente,<br>{seu_nome}<br>{cargo}</p>`
  },
  {
    title: 'Agradecimento por Compra',
    description: 'Agradecimento após a confirmação do pagamento',
    body: `<p>Olá {nome},</p>

<p>Muito obrigado por sua compra! 🙏</p>

<p>Seu pedido está sendo processado e logo chegará até você.</p>

<p>Qualquer problema, é só retornar este e-mail.</p>

<p>Atenciosamente,<br>Equipe {empresa}</p>`
  },
  {
    title: 'Recuperação de Carrinho Abandonado',
    description: 'Lembrete sobre carrinho de compras não finalizado',
    body: `<p>Olá {nome},</p>

<p>Esqueceu algo? Seu carrinho ainda está cheio de produtos incríveis! 🛍️</p>

<p>Finalize sua compra agora e não perca as ofertas.</p>

<p>Se precisar de ajuda, é só falar!</p>

<p>Atenciosamente,<br>Equipe {empresa}</p>`
  },
  {
    title: 'Pesquisa de Satisfação',
    description: 'Pesquisa rápida para avaliar a experiência do cliente',
    body: `<p>Olá {nome},</p>

<p>Como foi sua experiência com a {empresa}? 🤔</p>

<p>Sua opinião é muito importante para nós! Poderia responder uma pesquisa rápida de 2 minutos?</p>

<p>Agradecemos imensamente!</p>

<p>Atenciosamente,<br>Equipe {empresa}</p>`
  }
];

export async function GET() {
  try {
    // Get the first account
    const { data: accounts, error: accountError } = await supabase
      .from('accounts')
      .select('id')
      .limit(1);
    
    if (accountError || !accounts || accounts.length === 0) {
      return NextResponse.json({ error: 'No account found' }, { status: 400 });
    }
    
    const accountId = accounts[0].id;

    // Sample channels to create (all 6 channels)
    const channelsToCreate = [
      { type: 'whatsapp', name: 'WhatsApp' },
      { type: 'instagram', name: 'Instagram' },
      { type: 'messenger', name: 'Messenger' },
      { type: 'telegram', name: 'Telegram' },
      { type: 'webchat', name: 'Webchat' },
      { type: 'linkedin', name: 'LinkedIn' }
    ];

    const createdChannels: any[] = [];
    for (const channel of channelsToCreate) {
      // Check if channel exists
      const { data: existingChannel } = await supabase
        .from('channels')
        .select('*')
        .eq('account_id', accountId)
        .eq('type', channel.type)
        .maybeSingle();

      if (existingChannel) {
        createdChannels.push(existingChannel);
      } else {
        const { data: newChannel, error: channelError } = await supabase
          .from('channels')
          .insert({
            account_id: accountId,
            type: channel.type,
            name: channel.name,
            status: 'connected'
          })
          .select()
          .single();

        if (channelError) {
          console.error('Error creating channel:', channelError);
          continue;
        }
        createdChannels.push(newChannel);
      }
    }

    // Sample contacts (one for each channel)
    const contacts = [
      { name: 'Carlos Souza', phone: '+5511999991111', channelType: 'whatsapp' },
      { name: 'João Pereira', phone: '@joao_instagram', channelType: 'instagram' },
      { name: 'Beatriz Lima', phone: '1234567890', channelType: 'messenger' },
      { name: 'Fernanda Mendes', phone: '@fernanda_telegram', channelType: 'telegram' },
      { name: 'Maria Silva', phone: 'maria@webchat.com', channelType: 'webchat' },
      { name: 'Ana Costa', phone: 'ana.costa@linkedin.com', channelType: 'linkedin' }
    ];

    const createdContacts: any[] = [];
    for (const contact of contacts) {
      // Check if contact exists
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('*')
        .eq('account_id', accountId)
        .eq('phone', contact.phone)
        .maybeSingle();

      if (existingContact) {
        createdContacts.push({ ...existingContact, channelType: contact.channelType });
      } else {
        const { data: newContact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            account_id: accountId,
            name: contact.name,
            phone: contact.phone
          })
          .select()
          .single();

        if (contactError) {
          console.error('Error creating contact:', contactError);
          continue;
        }
        createdContacts.push({ ...newContact, channelType: contact.channelType });
      }
    }

    // Sample conversations and messages for all channels
    const sampleConversations = [
      // WhatsApp
      {
        contact: createdContacts.find(c => c.channelType === 'whatsapp'),
        channel: createdChannels.find(c => c.type === 'whatsapp'),
        messages: [
          'Olá! Gostaria de agendar um atendimento.',
          'Claro! Qual dia e horário você prefere?',
          'Que tal esta quarta-feira às 14h?',
          'Perfeito! Já reservei o seu horário.',
          'Obrigado! Até lá.'
        ]
      },
      // Instagram
      {
        contact: createdContacts.find(c => c.channelType === 'instagram'),
        channel: createdChannels.find(c => c.type === 'instagram'),
        messages: [
          'Ei! Vi o seu post sobre o novo produto, parece incrível!',
          'Obrigado pelo feedback! O produto já está disponível para compra.',
          'Legal, quais são as opções de pagamento?',
          'Aceitamos cartão, Pix e boleto bancário.',
          'Perfeito! Vou fazer o pedido agora.'
        ]
      },
      // Messenger
      {
        contact: createdContacts.find(c => c.channelType === 'messenger'),
        channel: createdChannels.find(c => c.type === 'messenger'),
        messages: [
          'Olá! Preciso de ajuda com o meu pedido.',
          'Claro! Qual o número do seu pedido?',
          'É o #12345.',
          'Vou verificar o status para você.',
          'Obrigado pela ajuda!'
        ]
      },
      // Telegram
      {
        contact: createdContacts.find(c => c.channelType === 'telegram'),
        channel: createdChannels.find(c => c.type === 'telegram'),
        messages: [
          'Boa tarde! Quero saber sobre os planos de assinatura.',
          'Temos planos mensais e anuais com desconto!',
          'Qual o valor do plano anual?',
          'O plano anual custa R$ 299,90 com 20% de desconto.',
          'Ótimo! Vou aderir.'
        ]
      },
      // Webchat
      {
        contact: createdContacts.find(c => c.channelType === 'webchat'),
        channel: createdChannels.find(c => c.type === 'webchat'),
        messages: [
          'Olá! Gostaria de saber mais sobre os seus serviços.',
          'Claro! Nossos serviços incluem atendimento personalizado e suporte 24h.',
          'Perfeito! Vou entrar em contato mais tarde para discutir detalhes.',
          'Fico no aguardo! Qualquer dúvida, é só chamar.'
        ]
      },
      // LinkedIn
      {
        contact: createdContacts.find(c => c.channelType === 'linkedin'),
        channel: createdChannels.find(c => c.type === 'linkedin'),
        messages: [
          'Boa tarde! Gostaria de propor uma parceria comercial.',
          'Boa tarde! Fico feliz com seu contato. Podemos agendar uma reunião?',
          'Claro, que tal amanhã às 15h?',
          'Perfeito! Enviarei o link da reunião em breve.'
        ]
      }
    ];

    for (const convData of sampleConversations) {
      if (!convData.contact || !convData.channel) continue;

      // Check if conversation already exists
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('*')
        .eq('account_id', accountId)
        .eq('contact_id', convData.contact.id)
        .eq('channel_id', convData.channel.id)
        .maybeSingle();

      if (existingConv) {
        console.log('Conversation already exists, skipping');
        continue;
      }

      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          account_id: accountId,
          user_id: accountId,
          contact_id: convData.contact.id,
          channel_id: convData.channel.id,
          status: 'open'
        })
        .select()
        .single();

      if (convError) {
        console.error('Error creating conversation:', convError);
        continue;
      }

      // Create messages with proper timestamps (spaced out)
      let timestamp = new Date();
      for (let i = 0; i < convData.messages.length; i++) {
        const isCustomer = i % 2 === 0;
        await supabase.from('messages').insert({
          conversation_id: conversation.id,
          channel_id: convData.channel.id,
          sender_type: isCustomer ? 'customer' : 'agent',
          content_type: 'text',
          content_text: convData.messages[i],
          created_at: timestamp.toISOString()
        });
        // Space messages 5-15 minutes apart
        timestamp = new Date(timestamp.getTime() - (Math.random() * 10 + 5) * 60000);
      }

      // Update conversation last message and unread count
      await supabase.from('conversations')
        .update({ 
          last_message_text: convData.messages[convData.messages.length - 1],
          unread_count: Math.floor(Math.random() * 3) // Random unread count 0-2
        })
        .eq('id', conversation.id);
    }

    // Create email templates
    for (const template of EMAIL_TEMPLATES) {
      const { data: existingTemplate } = await supabase
        .from('mailbox_templates')
        .select('id')
        .eq('account_id', accountId)
        .eq('title', template.title)
        .maybeSingle();

      if (!existingTemplate) {
        await supabase.from('mailbox_templates').insert({
          account_id: accountId,
          title: template.title,
          description: template.description,
          body: template.body,
          is_public: true
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Sample data created! Conversations, contacts, channels, and email templates.',
      channels: createdChannels.map(c => ({ type: c.type, name: c.name })),
      contacts: createdContacts.map(c => ({ name: c.name, channel: c.channelType })),
      templates: EMAIL_TEMPLATES.map(t => ({ title: t.title }))
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to create sample data' }, { status: 500 });
  }
}
