import re

def patch_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    modified = False
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new)
            modified = True
            print(f"[OK] Patched {filepath}")
        else:
            print(f"[WARN] Target string not found in {filepath}")
            # Try to show a hint
            hint = old.strip()[:60]
            if hint in content:
                print(f"  Found a partial match for hint: {hint}")
            else:
                print(f"  Hint not found: {hint}")
                
    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

# ----------------- 1. Sync Route -----------------
sync_path = "/www/wwwroot/coexsistemas.techvoz.com.br/src/app/api/whatsapp/templates/sync/route.ts"
sync_old_1 = """    const { data: config, error: configError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('account_id', accountId)
      .single()

    if (configError || !config) {
      return NextResponse.json(
        {
          error:
            'WhatsApp not configured. Connect your WhatsApp Business account in Settings first.',
        },
        { status: 400 },
      )
    }

    if (!config.waba_id) {
      return NextResponse.json(
        {
          error:
            'WABA (WhatsApp Business Account) ID missing. Re-connect your account in Settings.',
        },
        { status: 400 },
      )
    }

    const accessToken = decrypt(config.access_token)

    const metaTemplates: MetaTemplate[] = []
    let nextUrl:
      | string
      | null = `${META_API_BASE}/${config.waba_id}/message_templates?limit=100&fields=id,name,language,status,category,components,quality_score`
    const PAGE_CAP = 20
    let pageCount = 0

    while (nextUrl && pageCount < PAGE_CAP) {
      pageCount++
      const metaRes: Response = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!metaRes.ok) {
        let metaErr = `Meta API error: ${metaRes.status}`
        try {
          const body = await metaRes.json()
          if (body?.error?.message) metaErr = body.error.message
        } catch {
          // response wasn't JSON — keep the fallback
        }
        return NextResponse.json({ error: metaErr }, { status: 502 })
      }

      const metaBody: {
        data?: MetaTemplate[]
        paging?: { next?: string }
      } = await metaRes.json()
      if (metaBody.data) metaTemplates.push(...metaBody.data)
      nextUrl = metaBody.paging?.next ?? null
    }

    let inserted = 0
    let updated = 0
    const errors: { name: string; language: string; message: string }[] = []

    for (const t of metaTemplates) {"""

sync_new_1 = """    const { data: configs, error: configError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('account_id', accountId)

    if (configError || !configs || configs.length === 0) {
      return NextResponse.json(
        {
          error:
            'WhatsApp not configured. Connect your WhatsApp Business account in Settings first.',
        },
        { status: 400 },
      )
    }

    let inserted = 0
    let updated = 0
    const errors: { name: string; language: string; message: string }[] = []
    let totalTemplatesCount = 0
    let isTruncated = false

    for (const config of configs) {
      if (!config.waba_id || !config.access_token) {
        continue
      }

      let accessToken: string
      try {
        accessToken = decrypt(config.access_token)
      } catch (err) {
        console.error('Failed to decrypt access token for config:', config.id, err)
        continue
      }

      const metaTemplates: MetaTemplate[] = []
      let nextUrl:
        | string
        | null = `${META_API_BASE}/${config.waba_id}/message_templates?limit=100&fields=id,name,language,status,category,components,quality_score`
      const PAGE_CAP = 20
      let pageCount = 0

      while (nextUrl && pageCount < PAGE_CAP) {
        pageCount++
        const metaRes: Response = await fetch(nextUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        if (!metaRes.ok) {
          let metaErr = `Meta API error: ${metaRes.status}`
          try {
            const body = await metaRes.json()
            if (body?.error?.message) metaErr = body.error.message
          } catch {
            // response wasn't JSON — keep the fallback
          }
          errors.push({
            name: `WABA ID ${config.waba_id}`,
            language: 'ALL',
            message: metaErr,
          })
          break
        }

        const metaBody: {
          data?: MetaTemplate[]
          paging?: { next?: string }
        } = await metaRes.json()
        if (metaBody.data) metaTemplates.push(...metaBody.data)
        nextUrl = metaBody.paging?.next ?? null
      }

      if (pageCount >= PAGE_CAP && nextUrl !== null) {
        isTruncated = True
      }

      totalTemplatesCount += metaTemplates.length

      for (const t of metaTemplates) {"""

sync_old_2 = """    return NextResponse.json({
      success: errors.length === 0,
      total: metaTemplates.length,
      inserted,
      updated,
      errors,
      truncated: pageCount >= PAGE_CAP && nextUrl !== null,
    })"""

sync_new_2 = """    } // end of config loop

    return NextResponse.json({
      success: errors.length === 0,
      total: totalTemplatesCount,
      inserted,
      updated,
      errors,
      truncated: isTruncated,
    })"""

patch_file(sync_path, [(sync_old_1, sync_new_1), (sync_old_2, sync_new_2)])


# ----------------- 2. Submit Route -----------------
submit_path = "/www/wwwroot/coexsistemas.techvoz.com.br/src/app/api/whatsapp/templates/submit/route.ts"
submit_old = """      const { data: config, error: configError } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('account_id', accountId)
        .single()"""

submit_new = """      const { data: configs, error: configError } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('account_id', accountId)
        .limit(1)
      const config = configs?.[0]"""

patch_file(submit_path, [(submit_old, submit_new)])


# ----------------- 3. Template ID Route -----------------
id_path = "/www/wwwroot/coexsistemas.techvoz.com.br/src/app/api/whatsapp/templates/[id]/route.ts"
id_old_1 = """      const { data: config, error: configError } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('account_id', accountId)
        .single()"""

id_new_1 = """      const { data: configs, error: configError } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('account_id', accountId)
        .limit(1)
      const config = configs?.[0]"""

id_old_2 = """      const { data: config, error: configError } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('account_id', accountId)
        .single()"""

id_new_2 = """      const { data: configs, error: configError } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('account_id', accountId)
        .limit(1)
      const config = configs?.[0]"""

patch_file(id_path, [(id_old_1, id_new_1), (id_old_2, id_new_2)])


# ----------------- 4. Broadcast Route -----------------
broadcast_path = "/www/wwwroot/coexsistemas.techvoz.com.br/src/app/api/whatsapp/broadcast/route.ts"
broadcast_old = """    const { data: config, error: configError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('account_id', accountId)
      .single()"""

broadcast_new = """    const { data: configs, error: configError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('account_id', accountId)
      .limit(1)
    const config = configs?.[0]"""

patch_file(broadcast_path, [(broadcast_old, broadcast_new)])


# ----------------- 5. React Route -----------------
react_path = "/www/wwwroot/coexsistemas.techvoz.com.br/src/app/api/whatsapp/react/route.ts"
react_old = """    const { data: config, error: configError } = await supabase
      .from('whatsapp_config')
      .select('phone_number_id, access_token')
      .eq('account_id', accountId)
      .single();"""

react_new = """    const { data: configs, error: configError } = await supabase
      .from('whatsapp_config')
      .select('phone_number_id, access_token')
      .eq('account_id', accountId)
      .limit(1);
    const config = configs?.[0];"""

patch_file(react_path, [(react_old, react_new)])


# ----------------- 6. Verify Registration Route -----------------
verify_reg_path = "/www/wwwroot/coexsistemas.techvoz.com.br/src/app/api/whatsapp/config/verify-registration/route.ts"
verify_reg_old = """  const { data: config } = await supabase
    .from('whatsapp_config')
    .select('*')
    .eq('account_id', accountId)
    .maybeSingle()"""

verify_reg_new = """  const { data: configs } = await supabase
    .from('whatsapp_config')
    .select('*')
    .eq('account_id', accountId)
    .limit(1)
  const config = configs?.[0]"""

patch_file(verify_reg_path, [(verify_reg_old, verify_reg_new)])


# ----------------- 7. Flows meta-send -----------------
flows_meta_path = "/www/wwwroot/coexsistemas.techvoz.com.br/src/lib/flows/meta-send.ts"
flows_meta_old_1 = """  const { data: config, error: configErr } = await db
    .from('whatsapp_config')
    .select('*')
    .eq('account_id', args.accountId)
    .single()"""

flows_meta_new_1 = """  const { data: configs, error: configErr } = await db
    .from('whatsapp_config')
    .select('*')
    .eq('account_id', args.accountId)
    .limit(1)
  const config = configs?.[0]"""

flows_meta_old_2 = """  const { data: config, error: configErr } = await db
    .from('whatsapp_config')
    .select('*')
    .eq('account_id', args.accountId)
    .single()"""

flows_meta_new_2 = """  const { data: configs, error: configErr } = await db
    .from('whatsapp_config')
    .select('*')
    .eq('account_id', args.accountId)
    .limit(1)
  const config = configs?.[0]"""

flows_meta_old_3 = """  const { data: config, error: configErr } = await db
    .from('whatsapp_config')
    .select('*')
    .eq('account_id', input.accountId)
    .single()"""

flows_meta_new_3 = """  const { data: configs, error: configErr } = await db
    .from('whatsapp_config')
    .select('*')
    .eq('account_id', input.accountId)
    .limit(1)
  const config = configs?.[0]"""

patch_file(flows_meta_path, [
    (flows_meta_old_1, flows_meta_new_1),
    (flows_meta_old_2, flows_meta_new_2),
    (flows_meta_old_3, flows_meta_new_3)
])


# ----------------- 8. Automations meta-send -----------------
automations_meta_path = "/www/wwwroot/coexsistemas.techvoz.com.br/src/lib/automations/meta-send.ts"
automations_meta_old = """  const { data: config, error: configErr } = await db
    .from('whatsapp_config')
    .select('*')
    .eq('account_id', input.accountId)
    .single()"""

automations_meta_new = """  const { data: configs, error: configErr } = await db
    .from('whatsapp_config')
    .select('*')
    .eq('account_id', input.accountId)
    .limit(1)
  const config = configs?.[0]"""

patch_file(automations_meta_path, [(automations_meta_old, automations_meta_new)])

print("\nAll cardinality patches processed.")
