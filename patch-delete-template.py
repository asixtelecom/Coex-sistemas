filepath = "/www/wwwroot/coexsistemas.techvoz.com.br/src/app/api/whatsapp/templates/[id]/route.ts"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_delete_block = """    if (existing.meta_template_id && !isDryRun()) {
      const { data: configs, error: configError } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('account_id', accountId)
        .limit(1)
      const config = configs?.[0]
      if (configError || !config || !config.waba_id) {
        return NextResponse.json(
          { error: 'WhatsApp not configured — cannot delete on Meta.' },
          { status: 400 },
        )
      }
      const accessToken = decrypt(config.access_token)
      try {
        await deleteMessageTemplate({
          wabaId: config.waba_id,
          accessToken,
          name: existing.name,
          metaTemplateId: existing.meta_template_id,
        })
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Meta delete failed.'
        return NextResponse.json({ error: message }, { status: 502 })
      }
    }"""

new_delete_block = """    if (existing.meta_template_id && !isDryRun()) {
      const { data: configs, error: configError } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('account_id', accountId)

      if (configs && configs.length > 0) {
        for (const config of configs) {
          if (!config.waba_id || !config.access_token) continue
          try {
            const accessToken = decrypt(config.access_token)
            await deleteMessageTemplate({
              wabaId: config.waba_id,
              accessToken,
              name: existing.name,
              metaTemplateId: existing.meta_template_id,
            })
          } catch (e) {
            console.error(`Meta delete failed for WABA ${config.waba_id}:`, e)
            // Silently continue to try other WABAs and allow local deletion
          }
        }
      }
    }"""

# Also update the local deletion error message to be more friendly since Meta deletion failures are ignored
old_local_del_err = """    if (delErr) {
      return NextResponse.json(
        {
          error: `Deleted on Meta but failed to delete locally: ${delErr.message}.`,
        },
        { status: 500 },
      )
    }"""

new_local_del_err = """    if (delErr) {
      return NextResponse.json(
        {
          error: `Failed to delete template locally: ${delErr.message}.`,
        },
        { status: 500 },
      )
    }"""

if old_delete_block in content:
    content = content.replace(old_delete_block, new_delete_block)
    print("SUCCESS: Updated Meta deletion block")
else:
    print("ERROR: Meta deletion block not found")

if old_local_del_err in content:
    content = content.replace(old_local_del_err, new_local_del_err)
    print("SUCCESS: Updated local deletion error message")
else:
    print("ERROR: Local deletion error message not found")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("File written.")
