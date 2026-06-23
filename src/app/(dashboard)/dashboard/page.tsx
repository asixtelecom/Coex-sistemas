"use client"

import { useCallback, useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { formatCurrency } from '@/lib/currency'
import {
  MessageSquare,
  UserPlus,
  DollarSign,
  Send,
} from 'lucide-react'

import {
  loadActivity,
  loadConversationsSeries,
  loadMetrics,
  loadPipelineDonut,
  loadResponseTime,
  loadConversationsByChannel,
} from '@/lib/dashboard/queries'
import type {
  ActivityItem,
  ConversationsSeriesPoint,
  MetricsBundle,
  PipelineDonutData,
  ResponseTimeSummary,
} from '@/lib/dashboard/types'

import { MetricCard } from '@/components/dashboard/metric-card'
import { SkeletonCard } from '@/components/dashboard/skeleton'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { ConversationsChart } from '@/components/dashboard/conversations-chart'
import { PipelineDonut } from '@/components/dashboard/pipeline-donut'
import { ResponseTimeChart } from '@/components/dashboard/response-time-chart'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { ChannelStats } from '@/components/dashboard/channel-stats'

type RangeDays = 7 | 30 | 90

export default function DashboardPage() {
  const { defaultCurrency, canEditSettings } = useAuth()
  const [metrics, setMetrics] = useState<MetricsBundle | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(true)

  const [range, setRange] = useState<RangeDays>(30)
  // Keep a cache per range so switching tabs doesn't re-fetch what we
  // already have. Ranges the user hasn't opened yet stay null and
  // trigger a fetch on first view.
  const [series, setSeries] = useState<Record<RangeDays, ConversationsSeriesPoint[] | null>>({
    7: null,
    30: null,
    90: null,
  })
  const [seriesLoading, setSeriesLoading] = useState(true)

  const [pipeline, setPipeline] = useState<PipelineDonutData | null>(null)
  const [pipelineLoading, setPipelineLoading] = useState(true)

  const [responseTime, setResponseTime] = useState<ResponseTimeSummary | null>(null)
  const [responseTimeLoading, setResponseTimeLoading] = useState(true)

  const [activity, setActivity] = useState<ActivityItem[] | null>(null)
  const [activityLoading, setActivityLoading] = useState(true)
  const [channelStats, setChannelStats] = useState<{ type: string; count: number }[] | null>(null)
  const [channelStatsLoading, setChannelStatsLoading] = useState(true)

  const dealsChannelRef = useRef<any>(null)
  const stagesChannelRef = useRef<any>(null)
  const messagesChannelRef = useRef<any>(null)
  const contactsChannelRef = useRef<any>(null)

  const loadAll = useCallback(() => {
    const db = createClient()

    // Kick everything off in parallel. Each block has its own
    // setState + finally so a slow query doesn't hold up faster
    // sections — each widget shows its own skeleton independently.
    void loadMetrics(db)
      .then((m) => setMetrics(m))
      .catch((err) => console.error('[dashboard] metrics failed:', err))
      .finally(() => setMetricsLoading(false))

    void loadConversationsSeries(db, 30)
      .then((s) => setSeries((prev) => ({ ...prev, 30: s })))
      .catch((err) => console.error('[dashboard] series failed:', err))
      .finally(() => setSeriesLoading(false))

    void loadPipelineDonut(db)
      .then((p) => setPipeline(p))
      .catch((err) => console.error('[dashboard] pipeline failed:', err))
      .finally(() => setPipelineLoading(false))

    void loadResponseTime(db)
      .then((r) => setResponseTime(r))
      .catch((err) => console.error('[dashboard] response time failed:', err))
      .finally(() => setResponseTimeLoading(false))

    void loadConversationsByChannel(db)
      .then((c) => setChannelStats(c))
      .catch((err) => console.error('[dashboard] channel stats failed:', err))
      .finally(() => setChannelStatsLoading(false))

    // Fetch up to 50 so the biggest page-size option in the feed
    // (50 rows) is already in memory — switching sizes then becomes
    // a pure client-side slice with no extra round trip.
    void loadActivity(db, 50)
      .then((a) => setActivity(a))
      .catch((err) => console.error('[dashboard] activity failed:', err))
      .finally(() => setActivityLoading(false))
  }, [])

  const refreshData = useCallback(() => {
    const db = createClient()
    void loadMetrics(db).then((m) => setMetrics(m))
    void loadPipelineDonut(db).then((p) => setPipeline(p))
    void loadActivity(db, 50).then((a) => setActivity(a))
    void loadConversationsByChannel(db).then((c) => setChannelStats(c))
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Realtime subscriptions
  useEffect(() => {
    const db = createClient()

    // Subscribe to deals changes (for metrics and pipeline)
    dealsChannelRef.current = db
      .channel('deals-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, () => {
        refreshData()
      })
      .subscribe()

    // Subscribe to pipeline stages changes
    stagesChannelRef.current = db
      .channel('stages-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pipeline_stages' }, () => {
        refreshData()
      })
      .subscribe()

    // Subscribe to messages changes (for conversations chart and response time)
    messagesChannelRef.current = db
      .channel('messages-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        const db2 = createClient()
        void loadConversationsSeries(db2, range).then((s) => setSeries((prev) => ({ ...prev, [range]: s })))
        void loadResponseTime(db2).then((r) => setResponseTime(r))
      })
      .subscribe()

    // Subscribe to contacts changes (for metrics and activity)
    contactsChannelRef.current = db
      .channel('contacts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, () => {
        refreshData()
      })
      .subscribe()

    // Subscribe to conversations changes (for channel stats)
    const convChannel = db
      .channel('conversations-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        refreshData()
      })
      .subscribe()

    return () => {
      void dealsChannelRef.current?.unsubscribe()
      void stagesChannelRef.current?.unsubscribe()
      void messagesChannelRef.current?.unsubscribe()
      void contactsChannelRef.current?.unsubscribe()
      void convChannel.unsubscribe()
    }
  }, [refreshData, range])

  // Range switch handler — kept in an event callback (not an effect)
  // so the setState calls stay out of the react-hooks/set-state-in-effect
  // rule's way. The cached bucket check means switching back to a
  // previously-viewed range is instant and doesn't re-fetch.
  const handleRangeChange = useCallback(
    (r: RangeDays) => {
      setRange(r)
      if (series[r] !== null) return
      setSeriesLoading(true)
      const db = createClient()
      loadConversationsSeries(db, r)
        .then((s) => setSeries((prev) => ({ ...prev, [r]: s })))
        .catch((err) => console.error('[dashboard] series failed:', err))
        .finally(() => setSeriesLoading(false))
    },
    [series],
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Painel</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Análises ao vivo de conversas, contatos e negócios.
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricsLoading || !metrics ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <MetricCard
              title="Conversas Ativas"
              value={metrics.activeConversations.current.toLocaleString()}
              icon={MessageSquare}
              delta={{
                sign: metrics.activeConversations.previous,
                label: deltaLabel(metrics.activeConversations.previous, 'novas hoje vs ontem'),
              }}
            />
            <MetricCard
              title="Novos Contatos Hoje"
              value={metrics.newContactsToday.current.toLocaleString()}
              icon={UserPlus}
              delta={{
                sign:
                  metrics.newContactsToday.current - metrics.newContactsToday.previous,
                label: deltaLabel(
                  metrics.newContactsToday.current - metrics.newContactsToday.previous,
                  'vs ontem',
                ),
              }}
            />
            <MetricCard
              title="Valor de Negócios Abertos"
              value={formatCurrency(metrics.openDealsValue, defaultCurrency)}
              icon={DollarSign}
                subtitle={`${metrics.openDealsCount} negócio${metrics.openDealsCount === 1 ? '' : 's'} aberto${metrics.openDealsCount === 1 ? '' : 's'}`}
            />
            <MetricCard
              title="Mensagens Enviadas Hoje"
              value={metrics.messagesSentToday.current.toLocaleString()}
              icon={Send}
              delta={{
                sign:
                  metrics.messagesSentToday.current - metrics.messagesSentToday.previous,
                label: deltaLabel(
                  metrics.messagesSentToday.current - metrics.messagesSentToday.previous,
                  'vs ontem',
                ),
              }}
            />
          </>
        )}
      </div>

      {/* Quick actions — agents only see contacts and deals */}
      <QuickActions minimal={!canEditSettings} />

      {/* Charts row */}
      {canEditSettings ? (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="h-full lg:col-span-2">
              <ConversationsChart
                series={series}
                loading={seriesLoading}
                range={range}
                onRangeChange={handleRangeChange}
              />
            </div>
            <div className="h-full lg:col-span-2">
              <PipelineDonut
                data={pipeline}
                loading={pipelineLoading}
                currency={defaultCurrency}
              />
            </div>
            <div className="h-full lg:col-span-1">
              <ChannelStats
                data={channelStats}
                loading={channelStatsLoading}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <ConversationsChart
            series={series}
            loading={seriesLoading}
            range={range}
            onRangeChange={handleRangeChange}
          />
          <ChannelStats
            data={channelStats}
            loading={channelStatsLoading}
          />
        </div>
      )}

      {/* Response time */}
      <ResponseTimeChart data={responseTime} loading={responseTimeLoading} />

      {/* Activity feed — agents see only messages and contacts */}
      <ActivityFeed
        items={activity}
        loading={activityLoading}
        showAll={canEditSettings}
      />
    </div>
  )
}

// ------------------------------------------------------------

function deltaLabel(delta: number, suffix: string): string {
  if (delta === 0) return `Sem alteração ${suffix}`
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toLocaleString()} ${suffix}`
}
