'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, subDays, startOfWeek, parseISO, startOfMonth } from 'date-fns'
import { Card } from '@/components/ui/card'
import { ArrowLeft, AlertCircle, EyeOff, X, ChevronDown } from 'lucide-react'
import Link from 'next/link'

type Period = 'day' | 'week' | 'month' | 'year'
type ChannelFilter = 'all' | 'whatsapp' | 'instagram' | 'messenger' | 'telegram' | 'webchat' | 'linkedin' | 'tiktok' | 'youtube'

interface StatsRow {
  label: string
  phone: string
  total: number
  unread: number
  readRate: number
  periodStart: string
  periodEnd: string
}

interface UnreadContact {
  name: string
  phone: string
  unreadCount: number
}

const MONTHS: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
}

export default function InboxStatsPage() {
  const [period, setPeriod] = useState<Period>('month')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<StatsRow[]>([])
  const [totals, setTotals] = useState({ total: 0, unread: 0, readRate: 0 })
  const [error, setError] = useState<string | null>(null)
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all')
  const [drillDown, setDrillDown] = useState<{ label: string; contacts: UnreadContact[]; loading: boolean } | null>(null)
  const [whatsappChannels, setWhatsappChannels] = useState<{ id: string; name: string }>([])
  const [selectedWhatsappChannel, setSelectedWhatsappChannel] = useState<string>('all')
  const [rawMessages, setRawMessages] = useState<Array<{ sender_type: string; recipient_read_at: string | null; created_at: string; conversation_id: string }>>([])
  const [rawConvChannelMap, setRawConvChannelMap] = useState<Map<string, { type: string; name: string; channel_id: string | null; account_id: string }>>(new Map())
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
  }, [])

  const fetchStats = useCallback(async () => {
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
  }, [rawMessages, rawConvChannelMap, channelFilter, selectedWhatsappChannel, period])

  const handleRowClick = async (row: StatsRow) => {
    if (row.unread === 0) return
    setDrillDown({ label: row.label, contacts: [], loading: true })
    try {
      const { data, error: err } = await supabase
        .from('messages')
        .select('conversation_id')
        .eq('sender_type', 'agent')
        .is('recipient_read_at', null)
        .gte('created_at', row.periodStart)
        .lt('created_at', row.periodEnd)

      if (err || !data || data.length === 0) {
        setDrillDown({ label: row.label, contacts: [], loading: false })
        return
      }

      const convIds = [...new Set(data.map(m => m.conversation_id))]

      const { data: convs } = await supabase
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
      }))

      setDrillDown({ label: row.label, contacts, loading: false })
    } catch (e) {
      setDrillDown({ label: row.label, contacts: [], loading: false })
    }
  }

  const formatLabel = (label: string) => {
    if (period === 'day') {
      const d = parseISO(label)
      return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0')
    }
    if (period === 'week') {
      const d = parseISO(label)
      return 'Sem ' + String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0')
    }
    if (period === 'month') {
      const parts = label.split('-')
      return (MONTHS[parts[1]] || parts[1]) + '/' + parts[0].slice(2)
    }
    return label
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <AlertCircle className="h-8 w-8 text-red-500 mb-3" />
        <p className="text-sm text-red-500">{error}</p>
        <Link href="/inbox" className="mt-4 text-xs text-primary hover:underline">Voltar ao Inbox</Link>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/inbox" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-semibold">Estatisticas de Visualizacao</h1>
      </div>

      <div className="mb-6 flex gap-1.5">
        {([
          { value: 'day' as const, label: 'Dia' },
          { value: 'week' as const, label: 'Semana' },
          { value: 'month' as const, label: 'Mes' },
          { value: 'year' as const, label: 'Ano' },
        ]).map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={'rounded-md px-3 py-1.5 text-xs font-medium transition-colors ' + (period === opt.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="mb-6 flex gap-1.5 flex-wrap">
        {([
          { value: 'all' as const, label: 'Todos', color: 'bg-muted text-muted-foreground' },
          { value: 'whatsapp' as const, label: 'WhatsApp', color: 'bg-emerald-500/10 text-emerald-700' },
          { value: 'instagram' as const, label: 'Instagram', color: 'bg-pink-500/10 text-pink-700' },
          { value: 'messenger' as const, label: 'Messenger', color: 'bg-blue-500/10 text-blue-700' },
          { value: 'telegram' as const, label: 'Telegram', color: 'bg-sky-500/10 text-sky-700' },
          { value: 'webchat' as const, label: 'Webchat', color: 'bg-violet-500/10 text-violet-700' },
          { value: 'linkedin' as const, label: 'LinkedIn', color: 'bg-blue-600/10 text-blue-700' },
          { value: 'tiktok' as const, label: 'TikTok', color: 'bg-black/10 text-black' },
          { value: 'youtube' as const, label: 'YouTube', color: 'bg-red-500/10 text-red-700' },
        ]).map((opt) => (
          <button
            key={opt.value}
            onClick={() => setChannelFilter(opt.value)}
            className={'rounded-md px-3 py-1.5 text-xs font-medium transition-colors ' + (channelFilter === opt.value ? 'bg-primary text-primary-foreground' : opt.color + ' hover:opacity-80')}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {channelFilter === 'whatsapp' && whatsappChannels.length > 1 && (
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
      )}

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card className="p-3">
          <p className="text-[10px] text-muted-foreground">Total de Msgs</p>
          {loading ? (
            <div className="mt-1 h-6 w-12 animate-pulse rounded bg-muted" />
          ) : (
            <p className="text-xl font-bold">{totals.total}</p>
          )}
        </Card>
        <Card className="p-3">
          <p className="text-[10px] text-muted-foreground">Nao lidas</p>
          {loading ? (
            <div className="mt-1 h-6 w-12 animate-pulse rounded bg-muted" />
          ) : (
            <p className="text-xl font-bold text-amber-500">{totals.unread}</p>
          )}
        </Card>
        <Card className="p-3">
          <p className="text-[10px] text-muted-foreground">Tx de Leitura</p>
          {loading ? (
            <div className="mt-1 h-6 w-12 animate-pulse rounded bg-muted" />
          ) : (
            <p className="text-xl font-bold text-emerald-500">{totals.readRate}%</p>
          )}
        </Card>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : stats.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">Nenhum dado no periodo</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-2 text-left font-medium">Periodo</th>
                  <th className="pb-2 text-left font-medium">Canal</th>
                  <th className="pb-2 text-right font-medium">Total</th>
                  <th className="pb-2 text-right font-medium">Nao lidas</th>
                  <th className="pb-2 text-right font-medium">Lidas</th>
                  <th className="pb-2 text-right font-medium">% Leitura</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((row, i) => (
                  <tr
                    key={row.phone + row.label + i}
                    onClick={() => handleRowClick(row)}
                    className={'border-b border-border/50 transition-colors ' + (row.unread > 0 ? 'cursor-pointer hover:bg-muted/50' : 'cursor-default')}
                  >
                    <td className="py-2 text-left text-muted-foreground">{formatLabel(row.label)}</td>
                    <td className="py-2 text-left font-medium">{row.phone}</td>
                    <td className="py-2 text-right font-medium">{row.total}</td>
                    <td className="py-2 text-right">
                      <span className={row.unread > 0 ? 'text-amber-500 cursor-pointer underline decoration-dotted underline-offset-2' : ''}>{row.unread}</span>
                    </td>
                    <td className="py-2 text-right text-emerald-500">{row.total - row.unread}</td>
                    <td className="py-2 text-right">
                      <span className={'rounded px-1.5 py-0.5 text-[10px] ' + (row.readRate >= 80 ? 'bg-emerald-500/10 text-emerald-500' : row.readRate >= 50 ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500')}>
                        {row.readRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {drillDown && (
          <div className="w-72 shrink-0 overflow-auto rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <div className="flex items-center gap-1.5">
                <EyeOff className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-medium">{formatLabel(drillDown.label)}</span>
              </div>
              <button onClick={() => setDrillDown(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {drillDown.loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : drillDown.contacts.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <p className="text-[10px] text-muted-foreground/60">Nenhum contato nao visualizou</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {drillDown.contacts.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground/80">{c.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground/50">{c.phone}</p>
                    </div>
                    <span className="shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-500">
                      {c.unreadCount} msg
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
