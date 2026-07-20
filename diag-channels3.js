const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envPath = '/www/wwwroot/coexsistemas.techvoz.com.br/.env.local';
const dotenvContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
dotenvContent.split('\n').forEach(line => {
  const eqIndex = line.indexOf('=');
  if (eqIndex > 0) {
    const k = line.substring(0, eqIndex).trim();
    const v = line.substring(eqIndex + 1).trim();
    if (k) env[k] = v;
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // Get whatsapp channel IDs from channels table
  const { data: whatsappChannels } = await supabase
    .from('channels')
    .select('id, name')
    .eq('type', 'whatsapp');
  
  const whatsappChannelIds = (whatsappChannels || []).map(c => c.id);
  console.log('WhatsApp channel IDs in channels table:', whatsappChannelIds);

  // Get conversations that reference these whatsapp channels
  const { data: convs } = await supabase
    .from('conversations')
    .select('id, channel_id')
    .in('channel_id', whatsappChannelIds)
    .limit(20);
  
  console.log('\nConversations with whatsapp channel_ids:', convs?.length || 0);
  console.log(JSON.stringify(convs?.slice(0, 5), null, 2));

  // Now check messages - get recent agent messages 
  const { data: msgs } = await supabase
    .from('messages')
    .select('conversation_id, created_at')
    .eq('sender_type', 'agent')
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.log('\nRecent agent messages conversation_ids:');
  const msgConvIds = [...new Set((msgs || []).map(m => m.conversation_id))];
  console.log(msgConvIds);
  
  // Check which of those are whatsapp
  const { data: convDetails } = await supabase
    .from('conversations')
    .select('id, channel_id')
    .in('id', msgConvIds);
  
  console.log('\nConversation details for message convs:');
  console.log(JSON.stringify(convDetails, null, 2));
  
  const matchingWhatsapp = (convDetails || []).filter(c => whatsappChannelIds.includes(c.channel_id));
  console.log('\nOf those, WhatsApp ones:', matchingWhatsapp.length);
  console.log(JSON.stringify(matchingWhatsapp, null, 2));
}

main().catch(console.error);
