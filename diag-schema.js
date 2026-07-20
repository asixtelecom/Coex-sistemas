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
  // Let's get one row from whatsapp_config to see the columns
  const configs = await api('whatsapp_config?limit=1');
  console.log('whatsapp_config columns:', Object.keys(configs[0] || {}));

  // Let's get one row from channels to see the columns
  const channels = await api('channels?limit=1');
  console.log('channels columns:', Object.keys(channels[0] || {}));

  // Let's check some channels to see their properties
  const allChannels = await api('channels?select=id,type,name,account_id&limit=20');
  console.log('channels:', allChannels);

  // Let's see some conversations with non-null channel_id
  const convs = await api('conversations?select=id,account_id,channel_id&channel_id=not.is.null&limit=10');
  console.log('conversations with channel_id:', convs);
}

run().catch(console.error);
