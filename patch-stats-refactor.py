filepath = "/www/wwwroot/coexsistemas.techvoz.com.br/src/app/(dashboard)/inbox/stats/page.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# === Patch 1: Add useMemo import ===
old1 = "import { useEffect, useState, useCallback } from 'react'"
new1 = "import { useEffect, useState, useCallback, useMemo } from 'react'"

if old1 not in content:
    print("SKIP Patch 1 - already has useMemo")
else:
    content = content.replace(old1, new1, 1)
    print("OK Patch 1 - added useMemo import")

# === Patch 2: Add rawMessages and rawConvChannelMap states ===
old2 = "  const [whatsappChannels, setWhatsappChannels] = useState<{ id: string; name: string }[]>([])\n  const [selectedWhatsappChannel, setSelectedWhatsappChannel] = useState<string>('all')\n  const supabase = createClient()"
new2 = """  const [whatsappChannels, setWhatsappChannels] = useState<{ id: string; name: string }>([])
  const [selectedWhatsappChannel, setSelectedWhatsappChannel] = useState<string>('all')
  const [rawMessages, setRawMessages] = useState<Array<{ sender_type: string; recipient_read_at: string | null; created_at: string; conversation_id: string }>>([])
  const [rawConvChannelMap, setRawConvChannelMap] = useState<Map<string, { type: string; name: string; channel_id: string | null; account_id: string }>>(new Map())
  const supabase = createClient()"""

if old2 not in content:
    print("SKIP Patch 2 - already done, checking alternate")
    # try without type annotation issue
    old2b = "  const [whatsappChannels, setWhatsappChannels] = useState<{ id: string; name: string }[]>([])"
    if old2b in content:
        print("Found whatsappChannels state - doing targeted patch")
else:
    content = content.replace(old2, new2, 1)
    print("OK Patch 2 - added raw states")

# === Patch 3: Refactor fetchStats to store raw data and not filter ===
# Find the fetchStats callback and rewrite it so it fetches all data and stores raw data
# Then use useMemo to filter/group

old3 = """  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const now = new Date()
      const periodDays: Record<Period, number> = {
        day: 90,
        week: 90,
        month: 365,
        year: 1825,
      }
      const startDate = subDays(now, periodDays[period])

      const { data: messagesData, error: err } = await supabase
        .from('messages')
        .select('sender_type, recipient_read_at, created_at, conversation_id')
        .gte('created_at', startDate.toISOString())
        .eq('sender_type', 'agent')
        .order('created_at', { ascending: true })

      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }

      if (!messagesData || messagesData.length === 0) {
        setStats([])
        setTotals({ total: 0, unread: 0, readRate: 0 })
        setLoading(false)
        return
      }

      const convIds = [...new Set(messagesData.map(m => m.conversation_id))]

      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, account_id, channel_id')
        .in('id', convIds)

      const channelIds = [...new Set((conversations || []).map(c => c.channel_id).filter(Boolean))] as string[]
      const { data: channels } = channelIds.length > 0
        ? await supabase.from('channels').select('id, type, name').in('id', channelIds)
        : { data: [] }

      const channelMap = new Map<string, { type: string; name: string }>()
      if (channels) {
        for (const ch of channels) {
          channelMap.set(ch.id, { type: ch.type, name: ch.name })
        }
      }

      const convChannelMap = new Map<string, { type: string; name: string; channel_id: string | null; account_id: string }>()

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
      }

      const filteredMessages = messagesData.filter(m => {
        const ch = convChannelMap.get(m.conversation_id)
        const matchesChannel = channelFilter === 'all' || (ch ? ch.type === channelFilter : channelFilter === 'whatsapp')
        if (!matchesChannel) return false
        if (channelFilter === 'whatsapp' && selectedWhatsappChannel !== 'all') {
          return ch ? ch.channel_id === selectedWhatsappChannel : false
        }
        return true
      })

      const groups = new Map<string, { total: number; unread: number; start: string; end: string; phone: string }>()

      for (const msg of filteredMessages) {
        const d = parseISO(msg.created_at)
        const ch = convChannelMap.get(msg.conversation_id)
        const label = ch ? channelLabel(ch) : 'WhatsApp'

        let periodKey: string
        let periodStart: string
        let periodEnd: string

        if (period === 'day') {
          periodKey = format(d, 'yyyy-MM-dd')
          periodStart = periodKey + 'T00:00:00'
          periodEnd = periodKey + 'T23:59:59'
        } else if (period === 'week') {
          const sw = startOfWeek(d, { weekStartsOn: 0 })
          periodKey = format(sw, 'yyyy-MM-dd')
          periodStart = periodKey + 'T00:00:00'
          periodEnd = periodKey + 'T23:59:59'
        } else if (period === 'month') {
          periodKey = format(d, 'yyyy-MM')
          const sm = startOfMonth(d)
          periodStart = periodKey + '-01T00:00:00'
          periodEnd = periodKey + '-28T23:59:59'
        } else {
          periodKey = format(d, 'yyyy')
          periodStart = periodKey + '-01-01T00:00:00'
          periodEnd = periodKey + '-12-31T23:59:59'
        }

        const groupKey = label + '|' + periodKey
        if (!groups.has(groupKey)) {
          groups.set(groupKey, { total: 0, unread: 0, start: periodStart, end: periodEnd, phone: label })
        }
        const g = groups.get(groupKey)!
        g.total++
        if (!msg.recipient_read_at) g.unread++
      }

      const rows: StatsRow[] = []
      let grandTotal = 0
      let grandUnread = 0

      for (const [groupKey, val] of groups) {
        const pipeIdx = groupKey.indexOf('|')
        const periodLabel = groupKey.slice(pipeIdx + 1)
        const read = val.total - val.unread
        const readRate = val.total > 0 ? Math.round((read / val.total) * 100) : 0
        rows.push({
          label: periodLabel,
          phone: val.phone,
          total: val.total,
          unread: val.unread,
          readRate,
          periodStart: val.start,
          periodEnd: val.end,
        })
        grandTotal += val.total
        grandUnread += val.unread
      }

      rows.sort((a, b) => {
        const cmp = b.label.localeCompare(a.label)
        if (cmp !== 0) return cmp
        return a.phone.localeCompare(b.phone)
      })
      setStats(rows)
      setTotals({
        total: grandTotal,
        unread: grandUnread,
        readRate: grandTotal > 0 ? Math.round(((grandTotal - grandUnread) / grandTotal) * 100) : 0,
      })
    } catch (e: any) {
      setError(e?.message || 'Erro inesperado')
    }
    setLoading(false)
  }, [period, channelFilter, selectedWhatsappChannel, supabase])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])"""

new3 = """  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const now = new Date()
      const periodDays: Record<Period, number> = {
        day: 90,
        week: 90,
        month: 365,
        year: 1825,
      }
      const startDate = subDays(now, periodDays[period])

      const { data: messagesData, error: err } = await supabase
        .from('messages')
        .select('sender_type, recipient_read_at, created_at, conversation_id')
        .gte('created_at', startDate.toISOString())
        .eq('sender_type', 'agent')
        .order('created_at', { ascending: true })

      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }

      if (!messagesData || messagesData.length === 0) {
        setRawMessages([])
        setRawConvChannelMap(new Map())
        setLoading(false)
        return
      }

      const convIds = [...new Set(messagesData.map(m => m.conversation_id))]

      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, account_id, channel_id')
        .in('id', convIds)

      const channelIds = [...new Set((conversations || []).map(c => c.channel_id).filter(Boolean))] as string[]
      const { data: channels } = channelIds.length > 0
        ? await supabase.from('channels').select('id, type, name').in('id', channelIds)
        : { data: [] }

      const channelMap = new Map<string, { type: string; name: string }>()
      if (channels) {
        for (const ch of channels) {
          channelMap.set(ch.id, { type: ch.type, name: ch.name })
        }
      }

      const newConvChannelMap = new Map<string, { type: string; name: string; channel_id: string | null; account_id: string }>()

      if (conversations) {
        for (const c of conversations) {
          const ch = c.channel_id ? channelMap.get(c.channel_id) : undefined
          if (ch) {
            newConvChannelMap.set(c.id, { type: ch.type, name: ch.name, channel_id: c.channel_id, account_id: c.account_id })
          } else {
            newConvChannelMap.set(c.id, { type: 'whatsapp', name: 'WhatsApp', channel_id: null, account_id: c.account_id })
          }
        }
      }

      setRawMessages(messagesData)
      setRawConvChannelMap(newConvChannelMap)
    } catch (e: any) {
      setError(e?.message || 'Erro inesperado')
    }
    setLoading(false)
  }, [period, supabase])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Compute stats client-side whenever filter or raw data changes
  useEffect(() => {
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
    }

    const filteredMessages = rawMessages.filter(m => {
      const ch = rawConvChannelMap.get(m.conversation_id)
      const matchesChannel = channelFilter === 'all' || (ch ? ch.type === channelFilter : channelFilter === 'whatsapp')
      if (!matchesChannel) return false
      if (channelFilter === 'whatsapp' && selectedWhatsappChannel !== 'all') {
        return ch ? ch.channel_id === selectedWhatsappChannel : false
      }
      return true
    })

    const groups = new Map<string, { total: number; unread: number; start: string; end: string; phone: string }>()

    for (const msg of filteredMessages) {
      const d = parseISO(msg.created_at)
      const ch = rawConvChannelMap.get(msg.conversation_id)
      const label = ch ? channelLabel(ch) : 'WhatsApp'

      let periodKey: string
      let periodStart: string
      let periodEnd: string

      if (period === 'day') {
        periodKey = format(d, 'yyyy-MM-dd')
        periodStart = periodKey + 'T00:00:00'
        periodEnd = periodKey + 'T23:59:59'
      } else if (period === 'week') {
        const sw = startOfWeek(d, { weekStartsOn: 0 })
        periodKey = format(sw, 'yyyy-MM-dd')
        periodStart = periodKey + 'T00:00:00'
        periodEnd = periodKey + 'T23:59:59'
      } else if (period === 'month') {
        periodKey = format(d, 'yyyy-MM')
        const sm = startOfMonth(d)
        periodStart = periodKey + '-01T00:00:00'
        periodEnd = periodKey + '-28T23:59:59'
      } else {
        periodKey = format(d, 'yyyy')
        periodStart = periodKey + '-01-01T00:00:00'
        periodEnd = periodKey + '-12-31T23:59:59'
      }

      const groupKey = label + '|' + periodKey
      if (!groups.has(groupKey)) {
        groups.set(groupKey, { total: 0, unread: 0, start: periodStart, end: periodEnd, phone: label })
      }
      const g = groups.get(groupKey)!
      g.total++
      if (!msg.recipient_read_at) g.unread++
    }

    const rows: StatsRow[] = []
    let grandTotal = 0
    let grandUnread = 0

    for (const [groupKey, val] of groups) {
      const pipeIdx = groupKey.indexOf('|')
      const periodLabel = groupKey.slice(pipeIdx + 1)
      const read = val.total - val.unread
      const readRate = val.total > 0 ? Math.round((read / val.total) * 100) : 0
      rows.push({
        label: periodLabel,
        phone: val.phone,
        total: val.total,
        unread: val.unread,
        readRate,
        periodStart: val.start,
        periodEnd: val.end,
      })
      grandTotal += val.total
      grandUnread += val.unread
    }

    rows.sort((a, b) => {
      const cmp = b.label.localeCompare(a.label)
      if (cmp !== 0) return cmp
      return a.phone.localeCompare(b.phone)
    })
    setStats(rows)
    setTotals({
      total: grandTotal,
      unread: grandUnread,
      readRate: grandTotal > 0 ? Math.round(((grandTotal - grandUnread) / grandTotal) * 100) : 0,
    })
  }, [rawMessages, rawConvChannelMap, channelFilter, selectedWhatsappChannel, period])"""

if old3 in content:
    content = content.replace(old3, new3, 1)
    print("OK Patch 3 - refactored fetchStats to store raw data and compute stats in separate useEffect")
else:
    print("FAIL Patch 3 - old3 not found in content")
    # Try to find partial match
    if "const fetchStats = useCallback" in content:
        print("  fetchStats exists but content differs")
    else:
        print("  fetchStats NOT found at all")

# === Patch 4: Fix whatsappChannels useState type (remove [] at end) ===
old4 = "  const [whatsappChannels, setWhatsappChannels] = useState<{ id: string; name: string }[]>([])"
new4 = "  const [whatsappChannels, setWhatsappChannels] = useState<Array<{ id: string; name: string }>>([])"
if old4 in content:
    content = content.replace(old4, new4, 1)
    print("OK Patch 4 - fixed whatsappChannels type")
else:
    print("SKIP Patch 4")

# === Patch 5: Add rawMessages and rawConvChannelMap states ===
old5 = "  const [selectedWhatsappChannel, setSelectedWhatsappChannel] = useState<string>('all')\n  const supabase = createClient()"
new5 = """  const [selectedWhatsappChannel, setSelectedWhatsappChannel] = useState<string>('all')
  const [rawMessages, setRawMessages] = useState<Array<{ sender_type: string; recipient_read_at: string | null; created_at: string; conversation_id: string }>>([])
  const [rawConvChannelMap, setRawConvChannelMap] = useState<Map<string, { type: string; name: string; channel_id: string | null; account_id: string }>>(new Map())
  const supabase = createClient()"""
if old5 in content:
    content = content.replace(old5, new5, 1)
    print("OK Patch 5 - added rawMessages and rawConvChannelMap states")
else:
    print("SKIP Patch 5 - already added or not found")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("\nDone! File saved.")
