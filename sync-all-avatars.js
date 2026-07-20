const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

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

const EVOLUTION_API_URL = 'http://localhost:8080';
const EVOLUTION_API_KEY = 'd1c5f40478803e0a1135907a90b559dc94d8b3c4392acc1539b9c2650d32c71b';

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function getActiveInstance() {
  const instancesResp = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
    headers: { apikey: EVOLUTION_API_KEY },
  });
  const instances = await instancesResp.json();
  return instances?.find(i => i.connectionStatus === 'open')?.name || null;
}

async function fetchAvatarForContact(instanceName, contactId, phone) {
  let normalized = phone.replace(/\D/g, '');
  if (!normalized.startsWith('55')) normalized = '55' + normalized;
  if (normalized.length === 12) normalized = normalized.slice(0, 4) + '9' + normalized.slice(4);

  try {
    const profileResp = await fetch(`${EVOLUTION_API_URL}/chat/fetchProfile/${instanceName}`, {
      method: 'POST',
      headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: normalized }),
    });
    const profile = await profileResp.json();
    const avatarUrl = profile?.picture || profile?.profilePictureUrl;

    if (!avatarUrl) {
      console.log(`[${phone}] No avatar found. numberExists=${profile?.numberExists}`);
      return;
    }

    const { error } = await supabase
      .from('contacts')
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', contactId);

    if (error) {
      console.error(`[${phone}] DB update error:`, error.message);
    } else {
      console.log(`[${phone}] ✅ Avatar updated: ${avatarUrl.substring(0, 80)}...`);
    }
  } catch (err) {
    console.error(`[${phone}] Error:`, err.message);
  }
}

async function run() {
  console.log('Fetching all contacts without avatar_url...');
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('id, name, phone')
    .is('avatar_url', null)
    .not('phone', 'is', null);

  if (error) { console.error('Error fetching contacts:', error); return; }
  console.log(`Found ${contacts.length} contacts without avatar.`);

  const instanceName = await getActiveInstance();
  if (!instanceName) { console.log('No active Evolution instance!'); return; }
  console.log(`Using instance: ${instanceName}\n`);

  for (const contact of contacts) {
    console.log(`Processing: ${contact.name} (${contact.phone})`);
    await fetchAvatarForContact(instanceName, contact.id, contact.phone);
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\nAll done!');
}

run().catch(console.error);
