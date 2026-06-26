'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, subDays, startOfWeek, parseISO, startOfMonth } from 'date-fns'
import { Card } from '@/components/ui/card'
import { ArrowLeft, AlertCircle, EyeOff, X } from 'lucide-react'
import Link from 'next/link'

type Period = 'day' | 'week' | 'month' | 'year'

interface StatsRow {
  label: string
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
  const [period, setPeriod] = useState<Period>('day')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<StatsRow[]>([])
  const [totals, setTotals] = useState({ total: 0, unread: 0, readRate: 0 })
  const [error, setError] = useState<string | null>(null)
  const [drillDown, setDrillDown] = useState<{ label: string; contacts: UnreadContact[]; loading: boolean } | null>(null)
  const supabase = createClient()

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const now = new Date()
      const periodDays: Record<Period, number> = {
        day: 14,
        week: 90,
        month: 365,
        year: 1825,
      }
      const startDate = subDays(now, periodDays[period])

      const { data, error: err } = await supabase
        .from('messages')
        .select('sender_type, recipient_read_at, created_at')
        .gte('created_at', startDate.toISOString())
        .eq('sender_type', 'agent')
        .order('created_at', { ascending: true })

      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }

      if (!data || data.length === 0) {
        setStats([])
        setTotals({ total: 0, unread: 0, readRate: 0 })
        setLoading(false)
        return
      }

      const groups = new Map<string, { total: number; unread: number; start: string; end: string }>()

      for (const msg of data) {
        const d = parseISO(msg.created_at)
        let key: string
        let periodStart: string
        let periodEnd: string

        if (period === 'day') {
          key = format(d, 'yyyy-MM-dd')
          periodStart = key + 'T00:00:00'
          periodEnd = key + 'T23:59:59'
        } else if (period === 'week') {
          const sw = startOfWeek(d, { weekStartsOn: 0 })
          key = format(sw, 'yyyy-MM-dd')
          periodStart = format(sw, "yyyy-MM-dd'T'00:00:00")
          periodEnd = format(subDays(sw, -6), "yyyy-MM-dd'T'23:59:59")
        } else if (period === 'month') {
          key = format(d, 'yyyy-MM')
          const sm = startOfMonth(d)
          periodStart = format(sm, "yyyy-MM-dd'T'00:00:00")
          const nextMonth = new Date(sm.getFullYear(), sm.getMonth() + 1, 0)
          periodEnd = format(nextMonth, "yyyy-MM-dd'T'23:59:59")
        } else {
          key = format(d, 'yyyy')
          periodStart = key + '-01-01T00:00:00'
          periodEnd = key + '-12-31T23:59:59'
        }

        if (!groups.has(key)) groups.set(key, { total: 0, unread: 0, start: periodStart, end: periodEnd })
        const g = groups.get(key)!
        g.total++
        if (!msg.recipient_read_at) g.unread++
      }

      const rows: StatsRow[] = []
      let grandTotal = 0
      let grandUnread = 0

      for (const [key, val] of groups) {
        const read = val.total - val.unread
        const readRate = val.total > 0 ? Math.round((read / val.total) * 100) : 0
        rows.push({ label: key, total: val.total, unread: val.unread, readRate, periodStart: val.start, periodEnd: val.end })
        grandTotal += val.total
        grandUnread += val.unread
      }

      rows.reverse()
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
  }, [period, supabase])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

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
      }))

      setDrillDown({ label: row.label, contacts, loading: false })
    } catch (e) {
      setDrillDown({ label: row.label, contacts: [], loading: false })
    }
  }

  const formatLabel = (label: string) => {
    if (period === 'day') {
      const d = parseISO(label)
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
    }
    if (period === 'week') {
      const d = parseISO(label)
      return `Sem ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
    }
    if (period === 'month') {
      const parts = label.split('-')
      return `${MONTHS[parts[1]] || parts[1]}/${parts[0].slice(2)}`
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
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              period === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

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
        {/* Table */}
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
                  <th className="pb-2 text-right font-medium">Total</th>
                  <th className="pb-2 text-right font-medium">Nao lidas</th>
                  <th className="pb-2 text-right font-medium">Lidas</th>
                  <th className="pb-2 text-right font-medium">% Leitura</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((row) => (
                  <tr
                    key={row.label}
                    onClick={() => handleRowClick(row)}
                    className={`border-b border-border/50 transition-colors ${
                      row.unread > 0
                        ? 'cursor-pointer hover:bg-muted/50'
                        : 'cursor-default'
                    }`}
                  >
                    <td className="py-2 text-left text-muted-foreground">{formatLabel(row.label)}</td>
                    <td className="py-2 text-right font-medium">{row.total}</td>
                    <td className="py-2 text-right">
                      <span className={`${row.unread > 0 ? 'text-amber-500 cursor-pointer underline decoration-dotted underline-offset-2' : ''}`}>
                        {row.unread}
                      </span>
                    </td>
                    <td className="py-2 text-right text-emerald-500">{row.total - row.unread}</td>
                    <td className="py-2 text-right">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] ${
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

        {/* Drill-down panel */}
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
