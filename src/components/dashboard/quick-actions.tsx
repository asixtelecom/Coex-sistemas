"use client"

import Link from 'next/link'
import { UserPlus, Briefcase, Radio, Zap, Database, Loader2 } from 'lucide-react'
import type { ComponentType } from 'react'
import { useState } from 'react'
import { toast } from 'sonner'

// Quick-action shortcuts. Each navigates to the page that owns the
// relevant "create" flow. We deliberately don't try to auto-open any
// modal on the target page — that'd require touching those pages,
// which is out of scope here.
interface Action {
  label: string
  href?: string
  icon: ComponentType<{ className?: string }>
  tint: string
  onClick?: () => void
  loading?: boolean
}

export function QuickActions({ minimal = false }: { minimal?: boolean }) {
  const [generating, setGenerating] = useState(false)

  const generateSampleData = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/sample-data', { method: 'GET' })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        window.location.reload() // Refresh to show new data
      } else {
        toast.error(data.error || 'Erro ao gerar dados')
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao gerar dados de exemplo')
    } finally {
      setGenerating(false)
    }
  }

  const BASE_ACTIONS: Action[] = [
    { label: 'Novo Contato', href: '/contacts', icon: UserPlus, tint: 'text-primary' },
    { label: 'Novo Negócio', href: '/pipelines', icon: Briefcase, tint: 'text-blue-400' },
    { label: 'Nova Transmissão', href: '/broadcasts/new', icon: Radio, tint: 'text-amber-400' },
    { label: 'Nova Automação', href: '/automations/new', icon: Zap, tint: 'text-primary' },
  ]

  const ACTIONS: Action[] = minimal 
    ? BASE_ACTIONS.filter((a) => a.label !== 'Nova Transmissão' && a.label !== 'Nova Automação')
    : [
        ...BASE_ACTIONS,
        { 
          label: generating ? 'Gerando...' : 'Dados de Exemplo', 
          icon: Database, 
          tint: 'text-green-500',
          onClick: generateSampleData,
          loading: generating
        }
      ]

  const gridCount = Math.min(ACTIONS.length, minimal ? 4 : 5)

  return (
    <div
      className="grid grid-cols-2 gap-3"
      style={{ gridTemplateColumns: `repeat(${gridCount}, minmax(0, 1fr))` }}
    >
      {ACTIONS.map((a, idx) => {
        const Icon = a.icon
        const content = (
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-muted ${a.tint}`}>
            {a.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
          </div>
        )

        if (a.href) {
          return (
            <Link
              key={a.href || idx}
              href={a.href}
              className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-border hover:bg-muted/60"
            >
              {content}
              <span className="text-sm font-medium text-foreground">{a.label}</span>
            </Link>
          )
        }

        return (
          <button
            key={idx}
            onClick={a.onClick}
            disabled={a.loading}
            className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-border hover:bg-muted/60 disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            {content}
            <span className="text-sm font-medium text-foreground">{a.label}</span>
          </button>
        )
      })}
    </div>
  )
}
