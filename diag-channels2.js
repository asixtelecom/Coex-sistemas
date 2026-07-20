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
  // Get all distinct channel_ids from conversations
  const { data: convs } = await supabase
    .from('conversations')
    .select('channel_id')
    .limit(1000);
  
  const allChannelIds = [...new Set((convs || []).map(c => c.channel_id).filter(Boolean))];
  console.log('All distinct channel_ids in conversations:', allChannelIds.length, 'ids');
  
  // Get ALL channels (not just whatsapp)
  const { data: allChannels } = await supabase
    .from('channels')
    .select('id, type, name')
    .in('id', allChannelIds);
  
  console.log('\n=== All channels that match conversations ===');
  console.log(JSON.stringify(allChannels, null, 2));
  
  // Find orphan channel_ids (not in channels table)
  const knownIds = new Set((allChannels || []).map(c => c.id));
  const orphanIds = allChannelIds.filter(id => !knownIds.has(id));
  console.log('\n=== Orphan channel_ids (in conversations but NOT in channels table) ===');
  console.log(JSON.stringify(orphanIds, null, 2));
}

main().catch(console.error);
