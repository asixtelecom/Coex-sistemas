const fs = require('fs');

const envPath = '/www/wwwroot/coexsistemas.techvoz.com.br/.env.local';
const dotenvContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
dotenvContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.substring(1, value.length - 1);
    else if (value.startsWith("'") && value.endsWith("'")) value = value.substring(1, value.length - 1);
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

async function api(path) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  return res.json();
}

async function run() {
  const configs = await api('whatsapp_config?select=account_id,display_phone,phone_number_id');
  
  console.log('=== whatsapp_config accounts ===');
  for (const c of configs || []) {
    console.log(`  account_id: ${c.account_id} | phone: ${c.display_phone || c.phone_number_id}`);
  }

  const convs = await api('conversations?select=id,account_id,channel_id&limit=20');

  console.log('\n=== sample conversations ===');
  for (const c of convs || []) {
    console.log(`  conv_id: ${c.id} | account_id: ${c.account_id} | channel_id: ${c.channel_id}`);
  }

  const configAccountIds = new Set((configs || []).map(c => c.account_id));
  const convAccountIds = new Set((convs || []).map(c => c.account_id));
  console.log('\n=== account_id sets ===');
  console.log('Config account_ids:', [...configAccountIds]);
  console.log('Conv account_ids:', [...convAccountIds]);
  console.log('Overlap:', [...configAccountIds].filter(id => convAccountIds.has(id)));
}

run().catch(console.error);
