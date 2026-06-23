"use client"

import { GitBranch } from 'lucide-react'
import { EmptyState } from './empty-state'
import { Skeleton } from './skeleton'

interface ChannelStatsProps {
  data: { type: string; count: number }[] | null
  loading: boolean
}

const channelNames: Record<string, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  messenger: 'Messenger',
  telegram: 'Telegram',
  webchat: 'Webchat',
  linkedin: 'LinkedIn',
}

const channelColors: Record<string, string> = {
  whatsapp: '#25D366',
  instagram: '#E4405F',
  messenger: '#0084FF',
  telegram: '#0088CC',
  webchat: '#3B82F6',
  linkedin: '#0A66C2',
}

export function ChannelStats({ data, loading }: ChannelStatsProps) {
  if (loading || !data) return <Skeleton className="h-64 w-full" />

  return (
    <section className="flex flex-col rounded-xl border border-border bg-card">
      <header className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">Conversas por Canal</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Distribuição de conversas por canal
        </p>
      </header>

      <div className="p-5 flex flex-col space-y-3">
        {data.map((item) => (
          <div key={item.type} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: channelColors[item.type] || '#64748b' }}
              />
              <span className="text-sm text-muted-foreground">
                {channelNames[item.type] || item.type}
              </span>
            </div>
            <span className="text-sm font-medium text-foreground">
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
