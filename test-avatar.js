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

const EVOLUTION_API_URL = 'http://localhost:8080';
const EVOLUTION_API_KEY = 'd1c5f40478803e0a1135907a90b559dc94d8b3c4392acc1539b9c2650d32c71b';

async function fetchAndSaveAvatar(contactId, phone) {
  console.log(`[avatar-sync] Fetching avatar for contact ${contactId}, phone ${phone}`);

  // 1. Find active instance
  const instancesResp = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
    headers: { apikey: EVOLUTION_API_KEY },
  });
  const instances = await instancesResp.json();
  console.log('[avatar-sync] Instances:', JSON.stringify(instances?.map(i => ({ name: i.name, connectionStatus: i.connectionStatus })), null, 2));

  const activeInstance = instances?.find(
    (i) => i.connectionStatus === 'open'
  );

  if (!activeInstance) {
    console.log('[avatar-sync] No active Evolution instance found. Skipping avatar fetch.');
    return;
  }

  const instanceName = activeInstance.name;
  console.log(`[avatar-sync] Using instance: ${instanceName}`);

  // 2. Normalize phone number
  let normalized = phone.replace(/\D/g, '');
  if (!normalized.startsWith('55')) {
    normalized = '55' + normalized;
  }
  // Handle Brazilian 9-digit mobile numbers (11 digits total after 55)
  // If number is like 5511947190519 (13 digits), that's already correct
  // If number is like 551194719519 (12 digits), need to add 9 after area code
  if (normalized.length === 12) {
    normalized = normalized.slice(0, 4) + '9' + normalized.slice(4);
  }
  console.log(`[avatar-sync] Normalized phone: ${normalized}`);

  // 3. Fetch profile
  const profileResp = await fetch(
    `${EVOLUTION_API_URL}/chat/fetchProfile/${instanceName}`,
    {
      method: 'POST',
      headers: {
        apikey: EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ number: normalized }),
    }
  );

  const profileRespText = await profileResp.text();
  console.log(`[avatar-sync] Profile response status: ${profileResp.status}`);
  console.log(`[avatar-sync] Profile response: ${profileRespText}`);

  let profile;
  try {
    profile = JSON.parse(profileRespText);
  } catch {
    console.log('[avatar-sync] Could not parse profile JSON');
    return;
  }

  const avatarUrl = profile?.picture || profile?.profilePictureUrl;
  if (!avatarUrl) {
    console.log('[avatar-sync] No avatar URL in profile response. Profile keys:', Object.keys(profile || {}));
    return;
  }

  console.log(`[avatar-sync] Got avatar URL: ${avatarUrl}`);

  // 4. Update in DB via Supabase
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await supabase
    .from('contacts')
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq('id', contactId);

  if (error) {
    console.error('[avatar-sync] Error updating contact avatar_url:', error);
  } else {
    console.log(`[avatar-sync] Successfully updated avatar for contact ${contactId}`);
  }
}

// Test for Cris: id=5b2e47ae-b4c1-4c21-bd8f-28ad11fa66f8, phone=5511947190519
fetchAndSaveAvatar('5b2e47ae-b4c1-4c21-bd8f-28ad11fa66f8', '5511947190519')
  .then(() => console.log('Done'))
  .catch(err => console.error('Fatal error:', err));
