filepath = "/www/wwwroot/coexsistemas.techvoz.com.br/src/app/(dashboard)/inbox/stats/page.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# ----------------- PATCH 1: whatsappChannels State & useEffect Load -----------------
old_state_and_useeffect = """  const [drillDown, setDrillDown] = useState<{ label: string; contacts: UnreadContact[]; loading: boolean } | null>(null)
  const [whatsappChannels, setWhatsappChannels] = useState<{ account_id: string; display_phone: string }[]>([])
  const [selectedWhatsappChannel, setSelectedWhatsappChannel] = useState<string>('all')
  const supabase = createClient()

  useEffect(() => {
    async function loadChannels() {
      const { data } = await supabase
        .from('whatsapp_config')
        .select('account_id, display_phone, phone_number_id')
      if (data) {
        const channels = data.map(c => ({
          account_id: c.account_id,
          display_phone: c.display_phone || c.phone_number_id || 'WhatsApp',
        }))
        setWhatsappChannels(channels)
      }
    }
    loadChannels()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])"""

new_state_and_useeffect = """  const [drillDown, setDrillDown] = useState<{ label: string; contacts: UnreadContact[]; loading: boolean } | null>(null)
  const [whatsappChannels, setWhatsappChannels] = useState<{ id: string; name: string }[]>([])
  const [selectedWhatsappChannel, setSelectedWhatsappChannel] = useState<string>('all')
  const supabase = createClient()

  useEffect(() => {
    async function loadChannels() {
      const { data } = await supabase
        .from('channels')
        .select('id, name')
        .eq('type', 'whatsapp')
      if (data) {
        const channels = data.map(c => ({
          id: c.id,
          name: c.name || 'WhatsApp',
        }))
        setWhatsappChannels(channels)
      }
    }
    loadChannels()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])"""

content = content.replace(old_state_and_useeffect, new_state_and_useeffect)

# ----------------- PATCH 2: convChannelMap building & channelLabel -----------------
old_conv_map = """      const convChannelMap = new Map<string, { type: string; name: string; account_id: string }>()
      const whatsappAccountIds = new Set<string>()

      if (conversations) {
        for (const c of conversations) {
          const ch = c.channel_id ? channelMap.get(c.channel_id) : undefined
          if (ch) {
            convChannelMap.set(c.id, { type: ch.type, name: ch.name, account_id: c.account_id })
          } else {
            convChannelMap.set(c.id, { type: 'whatsapp', name: 'WhatsApp', account_id: c.account_id })
          }
          if (!ch || ch.type === 'whatsapp') {
            whatsappAccountIds.add(c.account_id)
          }
        }
      }

      const { data: configs } = await supabase
        .from('whatsapp_config')
        .select('account_id, display_phone, phone_number_id')
        .in('account_id', [...whatsappAccountIds])

      const phoneMap = new Map<string, string>()
      if (configs) {
        for (const cfg of configs) {
          const phone = cfg.display_phone || cfg.phone_number_id || 'WhatsApp'
          if (!phoneMap.has(cfg.account_id)) {
            phoneMap.set(cfg.account_id, phone)
          }
        }
      }

      const channelLabel = (ch: { type: string; name: string; account_id: string }) => {
        if (ch.type === 'whatsapp') {
          return phoneMap.get(ch.account_id) || ch.name || 'WhatsApp'
        }
        const typeNames: Record<string, string> = {
          instagram: 'Instagram',
          messenger: 'Messenger',
          telegram: 'Telegram',
          webchat: 'Webchat',
          linkedin: 'LinkedIn',
        }
        return (typeNames[ch.type] || ch.type) + ' - ' + ch.name
      }"""

new_conv_map = """      const convChannelMap = new Map<string, { type: string; name: string; channel_id: string | null; account_id: string }>()

      if (conversations) {
        for (const c of conversations) {
          const ch = c.channel_id ? channelMap.get(c.channel_id) : undefined
          if (ch) {
            convChannelMap.set(c.id, { type: ch.type, name: ch.name, channel_id: c.channel_id, account_id: c.account_id })
          } else {
            convChannelMap.set(c.id, { type: 'whatsapp', name: 'WhatsApp', channel_id: null, account_id: c.account_id })
          }
        }
      }

      const channelLabel = (ch: { type: string; name: string; channel_id: string | null; account_id: string }) => {
        if (ch.type === 'whatsapp') {
          return ch.name || 'WhatsApp'
        }
        const typeNames: Record<string, string> = {
          instagram: 'Instagram',
          messenger: 'Messenger',
          telegram: 'Telegram',
          webchat: 'Webchat',
          linkedin: 'LinkedIn',
        }
        return (typeNames[ch.type] || ch.type) + ' - ' + ch.name
      }"""

content = content.replace(old_conv_map, new_conv_map)

# ----------------- PATCH 3: Filtered Messages -----------------
old_filter = """      const filteredMessages = messagesData.filter(m => {
        const ch = convChannelMap.get(m.conversation_id)
        const matchesChannel = channelFilter === 'all' || (ch ? ch.type === channelFilter : channelFilter === 'whatsapp')
        if (!matchesChannel) return false
        if (channelFilter === 'whatsapp' && selectedWhatsappChannel !== 'all') {
          return ch ? ch.account_id === selectedWhatsappChannel : false
        }
        return true
      })"""

new_filter = """      const filteredMessages = messagesData.filter(m => {
        const ch = convChannelMap.get(m.conversation_id)
        const matchesChannel = channelFilter === 'all' || (ch ? ch.type === channelFilter : channelFilter === 'whatsapp')
        if (!matchesChannel) return false
        if (channelFilter === 'whatsapp' && selectedWhatsappChannel !== 'all') {
          return ch ? ch.channel_id === selectedWhatsappChannel : false
        }
        return true
      })"""

content = content.replace(old_filter, new_filter)

# ----------------- PATCH 4: handleRowClick drillDown by channel -----------------
old_row_click = """      const { data: convs } = await supabase
        .from('conversations')
        .select('id, contact_id, contact:contacts(name, phone)')
        .in('id', convIds)

      if (!convs) {
        setDrillDown({ label: row.label, contacts: [], loading: false })
        return
      }

      const contacts: UnreadContact[] = convs.map(c => ({
        name: (c.contact as any)?.name || 'Desconhecido',
        phone: (c.contact as any)?.phone || '',
        unreadCount: data.filter(m => m.conversation_id === c.id).length,
      }))"""

new_row_click = """      const { data: convs } = await supabase
        .from('conversations')
        .select('id, contact_id, channel_id, account_id, contact:contacts(name, phone)')
        .in('id', convIds)

      if (!convs) {
        setDrillDown({ label: row.label, contacts: [], loading: false })
        return
      }

      // Fetch active channels to match the label
      const channelIds = [...new Set(convs.map(c => c.channel_id).filter(Boolean))] as string[]
      const { data: channels } = channelIds.length > 0
        ? await supabase.from('channels').select('id, type, name').in('id', channelIds)
        : { data: [] }

      const channelMap = new Map<string, { type: string; name: string }>()
      if (channels) {
        for (const ch of channels) {
          channelMap.set(ch.id, { type: ch.type, name: ch.name })
        }
      }

      const channelLabel = (ch: { type: string; name: string }) => {
        if (ch.type === 'whatsapp') {
          return ch.name || 'WhatsApp'
        }
        const typeNames: Record<string, string> = {
          instagram: 'Instagram',
          messenger: 'Messenger',
          telegram: 'Telegram',
          webchat: 'Webchat',
          linkedin: 'LinkedIn',
        }
        return (typeNames[ch.type] || ch.type) + ' - ' + ch.name
      }

      const filteredConvs = convs.filter(c => {
        const ch = c.channel_id ? channelMap.get(c.channel_id) : undefined
        const label = ch ? channelLabel(ch) : 'WhatsApp'
        return label === row.phone
      })

      const contacts: UnreadContact[] = filteredConvs.map(c => ({
        name: (c.contact as any)?.name || 'Desconhecido',
        phone: (c.contact as any)?.phone || '',
        unreadCount: data.filter(m => m.conversation_id === c.id).length,
      }))"""

content = content.replace(old_row_click, new_row_click)

# ----------------- PATCH 5: select box options using ch.id and ch.name -----------------
old_select_box = """      {channelFilter === 'whatsapp' && whatsappChannels.length > 1 && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Canal:</span>
          <div className="relative">
            <select
              value={selectedWhatsappChannel}
              onChange={(e) => setSelectedWhatsappChannel(e.target.value)}
              className="appearance-none rounded-md border border-border bg-card pl-3 pr-8 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="all">Todos os canais</option>
              {whatsappChannels.map((ch) => (
                <option key={ch.account_id} value={ch.account_id}>
                  {ch.display_phone}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      )}"""

new_select_box = """      {channelFilter === 'whatsapp' && whatsappChannels.length > 1 && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Canal:</span>
          <div className="relative">
            <select
              value={selectedWhatsappChannel}
              onChange={(e) => setSelectedWhatsappChannel(e.target.value)}
              className="appearance-none rounded-md border border-border bg-card pl-3 pr-8 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="all">Todos os canais</option>
              {whatsappChannels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      )}"""

content = content.replace(old_select_box, new_select_box)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS: patch-stats-v2.py applied successfully")
