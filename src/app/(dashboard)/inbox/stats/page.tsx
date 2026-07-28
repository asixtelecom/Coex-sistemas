'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { format, subDays, startOfWeek, parseISO, startOfMonth } from 'date-fns'
import { Card } from '@/components/ui/card'
import { ArrowLeft, AlertCircle, EyeOff, X, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { formatPhoneBR } from '@/lib/whatsapp/phone-utils'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import type { ChannelType } from '@/types'

type Period = 'day' | 'week' | 'month' | 'year'
type ChannelFilter = 'all' | 'whatsapp' | 'instagram' | 'messenger' | 'telegram' | 'webchat' | 'linkedin' | 'tiktok' | 'youtube'
type ChannelFilter = 'all' | string

interface ChannelRow {
  id: string
  type: string
  name: string
  status: 'connected' | 'disconnected'
  is_active: boolean
}

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

function ChannelIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case 'whatsapp':
      return (
        <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="#25D366">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      )
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="url(#ig-gradient-stats)">
          <defs>
            <linearGradient id="ig-gradient-stats" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#FFDC80" />
              <stop offset="25%" stopColor="#F77737" />
              <stop offset="50%" stopColor="#E1306C" />
              <stop offset="75%" stopColor="#C13584" />
              <stop offset="100%" stopColor="#833AB4" />
            </linearGradient>
          </defs>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
        </svg>
      )
    case 'messenger':
      return (
        <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="#0084FF">
          <path d="M12 0C5.373 0 0 4.975 0 11.111c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.974 12-11.111C24 4.975 18.627 0 12 0zm1.193 14.963l-3.056-3.259-5.963 3.259L10.732 8.4l3.131 3.259L19.752 8.4l-6.559 6.563z"/>
        </svg>
      )
    case 'telegram':
      return (
        <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="#0088cc">
          <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      )
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="#0A66C2">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      )
    default:
      return <span className={cn('h-4 w-4 flex items-center justify-center text-xs', className)}>&#x1F310;</span>
  }
}

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  messenger: 'Messenger',
  telegram: 'Telegram',
  webchat: 'Webchat',
  linkedin: 'LinkedIn',
}

function getChannelDisplayName(channel: ChannelRow): string {
  const typeLabel = CHANNEL_LABELS[channel.type] || channel.type
  const name = channel.name?.trim()
  if (name && name !== typeLabel) return `${typeLabel} - ${name}`
  return typeLabel
}

export default function InboxStatsPage() {
  const { user, isAgent } = useAuth()
  const [period, setPeriod] = useState<Period>('month')
  const [period, setPeriod] = useState<Period>('day')
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all')
  const [channels, setChannels] = useState<ChannelRow[]>([])
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
  const { accountId } = useAuth()

  useEffect(() => {
    if (!accountId) return
    supabase
      .from('channels')
      .select('id, type, name, status, is_active')
      .eq('account_id', accountId)
      .order('type', { ascending: true })
      .then(({ data }) => {
        if (data) setChannels(data as ChannelRow[])
      })
  }, [accountId, supabase])

  const getChannelIds = useCallback(() => {
    if (channelFilter === 'all') return null
    const ids = channels.filter(c => c.id === channelFilter).map(c => c.id)
    return ids.length > 0 ? ids : null
  }, [channelFilter, channels])

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

      // For agents, only get their assigned conversations
      let allowedConvIds: string[] | null = null
      if (isAgent && user?.id) {
        const { data: myConvs } = await supabase
          .from('conversations')
          .select('id')
          .or(`assigned_agent_id.eq.${user.id},user_id.eq.${user.id}`)
        allowedConvIds = (myConvs || []).map(c => c.id)
        if (allowedConvIds.length === 0) {
          setRawMessages([])
          setRawConvChannelMap(new Map())
          setLoading(false)
          return
        }
      }

      let query = supabase
        .from('messages')
        .select('sender_type, recipient_read_at, created_at, conversation_id')
      let query = supabase
        .from('messages')
        .select('sender_type, recipient_read_at, created_at, channel_id')
        .gte('created_at', startDate.toISOString())
        .eq('sender_type', 'agent')
        .order('created_at', { ascending: true })

      if (allowedConvIds) {
        query = query.in('conversation_id', allowedConvIds)
      }

      const { data: messagesData, error: err } = await query
      const channelIds = getChannelIds()
      if (channelIds) {
        query = query.in('channel_id', channelIds)
      }

      const { data, error: err } = await query

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
  }, [period, supabase, isAgent, user?.id])
  }, [period, supabase, getChannelIds])

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
      // For agents, only get their assigned conversations
      let allowedConvIds: string[] | null = null
      if (isAgent && user?.id) {
        const { data: myConvs } = await supabase
          .from('conversations')
          .select('id')
          .or(`assigned_agent_id.eq.${user.id},user_id.eq.${user.id}`)
        allowedConvIds = (myConvs || []).map(c => c.id)
        if (allowedConvIds.length === 0) {
          setDrillDown({ label: row.label, contacts: [], loading: false })
          return
        }
      }

      let query = supabase
        .from('messages')
        .select('conversation_id')
        .eq('sender_type', 'agent')
        .is('recipient_read_at', null)
        .gte('created_at', row.periodStart)
        .lt('created_at', row.periodEnd)

      if (allowedConvIds) {
        query = query.in('conversation_id', allowedConvIds)
      const channelIds = getChannelIds()
      if (channelIds) {
        query = query.in('channel_id', channelIds)
      }

      const { data, error: err } = await query

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

  const availableChannelTypes = [...new Set(channels.map(c => c.type))]

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
        <div>
          <h1 className="text-lg font-semibold">Estatisticas de Visualizacao</h1>
          <p className="text-xs text-muted-foreground">Acompanhe a leitura das suas mensagens por canal</p>
        </div>
      </div>

      <div className="mb-4 flex gap-1.5">
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
      {availableChannelTypes.length > 0 && (
        <div className="mb-6 flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Canal:</span>
          <Select value={channelFilter} onValueChange={(val) => setChannelFilter(val as ChannelFilter)}>
            <SelectTrigger className="h-8 w-[260px]">
              <SelectValue>
                {channelFilter === 'all' ? (
                  <span className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-primary/60" />
                    Todos os Canais
                  </span>
                ) : (
                  (() => {
                    const ch = channels.find(c => c.id === channelFilter)
                    if (!ch) return 'Todos os Canais'
                    return (
                      <span className="flex items-center gap-2">
                        <ChannelIcon type={ch.type} className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{getChannelDisplayName(ch)}</span>
                        <span className={cn(
                          'ml-auto h-1.5 w-1.5 shrink-0 rounded-full',
                          ch.status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'
                        )} />
                      </span>
                    )
                  })()
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-primary/60" />
                  Todos os Canais
                </span>
              </SelectItem>
              {availableChannelTypes.map((type) => {
                const typeChannels = channels.filter(c => c.type === type)
                return typeChannels.map((ch) => (
                  <SelectItem key={ch.id} value={ch.id}>
                    <span className="flex items-center gap-2">
                      <ChannelIcon type={ch.type} className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{getChannelDisplayName(ch)}</span>
                      <span className={cn(
                        'ml-auto h-1.5 w-1.5 shrink-0 rounded-full',
                        ch.status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'
                      )} />
                    </span>
                  </SelectItem>
                ))
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <span className="text-xs font-bold text-primary">{totals.total}</span>
            </div>
            <p className="text-[11px] font-medium text-muted-foreground">Total de Msgs</p>
          </div>
          {loading ? (
            <div className="mt-1 h-4 w-16 animate-pulse rounded bg-muted" />
          ) : (
            <p className="text-2xl font-bold tabular-nums">{totals.total}</p>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10">
              <EyeOff className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <p className="text-[11px] font-medium text-muted-foreground">Nao lidas</p>
          </div>
          {loading ? (
            <div className="mt-1 h-4 w-16 animate-pulse rounded bg-muted" />
          ) : (
            <p className="text-2xl font-bold tabular-nums text-amber-500">{totals.unread}</p>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
              <span className="text-xs font-bold text-emerald-500">%</span>
            </div>
            <p className="text-[11px] font-medium text-muted-foreground">Tx de Leitura</p>
          </div>
          {loading ? (
            <div className="mt-1 h-4 w-16 animate-pulse rounded bg-muted" />
          ) : (
            <p className="text-2xl font-bold tabular-nums text-emerald-500">{totals.readRate}%</p>
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
                  <th className="pb-2.5 pt-1 text-left font-medium">Periodo</th>
                  <th className="pb-2.5 pt-1 text-right font-medium">Total</th>
                  <th className="pb-2.5 pt-1 text-right font-medium">Nao lidas</th>
                  <th className="pb-2.5 pt-1 text-right font-medium">Lidas</th>
                  <th className="pb-2.5 pt-1 text-right font-medium">% Leitura</th>
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
                    className={`border-b border-border/30 transition-colors ${
                      row.unread > 0
                        ? 'cursor-pointer hover:bg-muted/40'
                        : 'cursor-default'
                    }`}
                  >
                    <td className="py-2.5 text-left font-medium text-foreground/80">{formatLabel(row.label)}</td>
                    <td className="py-2.5 text-right tabular-nums font-medium">{row.total}</td>
                    <td className="py-2.5 text-right tabular-nums">
                      <span className={row.unread > 0 ? 'text-amber-500 font-medium underline decoration-dotted underline-offset-2' : 'text-muted-foreground'}>
                        {row.unread}
                      </span>
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-emerald-500">{row.total - row.unread}</td>
                    <td className="py-2.5 text-right">
                      <span className={`inline-flex min-w-[36px] justify-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        row.readRate >= 80 ? 'bg-emerald-500/10 text-emerald-500' :
                        row.readRate >= 50 ? 'bg-amber-500/10 text-amber-500' :
                        'bg-red-500/10 text-red-500'
                      }`}>
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
                      <p className="truncate text-[10px] text-muted-foreground/50">{formatPhoneBR(c.phone)}</p>
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
