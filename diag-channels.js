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
  // Check channels table for whatsapp
  const { data: channels } = await supabase
    .from('channels')
    .select('id, type, name')
    .eq('type', 'whatsapp');
  console.log('=== channels table (type=whatsapp) ===');
  console.log(JSON.stringify(channels, null, 2));

  // Check whatsapp_config
  const { data: wc } = await supabase
    .from('whatsapp_config')
    .select('id, phone_number, channel_id')
    .limit(10);
  console.log('\n=== whatsapp_config table ===');
  console.log(JSON.stringify(wc, null, 2));

  // Check conversations channel_id values
  const { data: convs } = await supabase
    .from('conversations')
    .select('id, channel_id, account_id')
    .limit(10);
  console.log('\n=== conversations sample ===');
  console.log(JSON.stringify(convs, null, 2));
}

main().catch(console.error);
