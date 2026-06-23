"use client"

import { Star, Pin, PinOff, Paperclip, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"

export interface EmailItem {
  id: number
  mailbox_id: number
  to: string
  cc: string | null
  bcc: string | null
  subject: string
  message: string
  creator_name: string | null
  creator_email: string | null
  created_by: string | null
  is_read: boolean
  is_starred: boolean
  is_pinned: boolean
  is_important: boolean
  created_at: string
  last_activity_at: string | null
  files: string | null
  status: string
  email_labels: string | null
}

interface EmailListProps {
  emails: EmailItem[]
  selectedIds: number[]
  onSelect: (id: number) => void
  onSelectAll: () => void
  onToggleStar: (id: number) => void
  onTogglePin: (id: number) => void
  onToggleRead: (id: number) => void
  onDelete: (id: number) => void
  onOpen: (email: EmailItem) => void
  loading?: boolean
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const isToday = diff < 86400000 && d.getDate() === now.getDate()
  if (isToday) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  const thisYear = d.getFullYear() === now.getFullYear()
  if (thisYear) return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })
}

export function EmailList({ emails, selectedIds, onSelect, onSelectAll, onToggleStar, onTogglePin, onToggleRead, onDelete, onOpen, loading }: EmailListProps) {
  const allSelected = emails.length > 0 && selectedIds.length === emails.length

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (emails.length === 0) {
    return (
      <div className="flex items-center justify-center flex-1">
        <p className="text-muted-foreground">Nenhum e-mail encontrado.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-hidden">
      <div className="grid grid-cols-[48px_1fr_1fr_2fr_140px_36px_36px] gap-0 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border sticky top-0">
        <div className="flex items-center justify-center py-3 hover:bg-muted/50 transition-colors">
          <Checkbox checked={allSelected} onCheckedChange={onSelectAll} />
        </div>
        <div className="flex items-center py-3">De / Para</div>
        <div className="flex items-center py-3">Assunto</div>
        <div className="flex items-center py-3">Mensagem</div>
        <div className="flex items-center py-3">Última atividade</div>
        <div className="flex items-center justify-center py-3" title="Favoritos">
          <Star className="h-3.5 w-3.5" />
        </div>
        <div className="flex items-center justify-center py-3" title="Fixar">
          <Pin className="h-3.5 w-3.5" />
        </div>
      </div>

      <ScrollArea className="h-[calc(100%-41px)]">
        {emails.map((email) => {
          const isSelected = selectedIds.includes(email.id)
          const displayName = email.created_by
            ? `Para: ${email.to}`
            : (email.creator_name || email.creator_email || email.to || "Desconhecido")
          const preview = email.message?.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().substring(0, 100) || ""

          return (
            <div
              key={email.id}
              className={cn(
                "grid grid-cols-[48px_1fr_1fr_2fr_140px_36px_36px] gap-0 border-b border-border last:border-0 transition-colors group",
                isSelected
                  ? "bg-primary/5 hover:bg-primary/10"
                  : "hover:bg-muted/40",
                !email.is_read && !email.created_by ? "bg-blue-50/40 dark:bg-blue-950/15" : ""
              )}
            >
              <div
                className="flex items-center justify-center py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={(e) => { e.stopPropagation(); onSelect(email.id) }}
              >
                <Checkbox checked={isSelected} onCheckedChange={() => onSelect(email.id)} />
              </div>

              <div
                className="flex items-center gap-2 py-3 min-w-0 cursor-pointer"
                onClick={() => onOpen(email)}
              >
                {email.is_important && (
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500 fill-red-500" />
                )}
                <span className={cn(
                  "text-sm truncate",
                  !email.is_read && !email.created_by ? "font-semibold" : "font-medium"
                )}>
                  {displayName}
                </span>
                {!email.is_read && !email.created_by && (
                  <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                )}
              </div>

              <div
                className="flex items-center gap-2 py-3 min-w-0 cursor-pointer"
                onClick={() => onOpen(email)}
              >
                <span className={cn(
                  "text-sm truncate",
                  !email.is_read && !email.created_by ? "font-semibold text-foreground" : "text-foreground"
                )}>
                  {email.subject || "(sem assunto)"}
                </span>
                {email.files && (
                  <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
                )}
              </div>

              <div
                className="flex items-center py-3 min-w-0 cursor-pointer"
                onClick={() => onOpen(email)}
              >
                <span className="text-sm text-muted-foreground truncate">
                  {preview || "..."}
                </span>
              </div>

              <div
                className="flex items-center py-3 cursor-pointer"
                onClick={() => onOpen(email)}
              >
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(email.last_activity_at || email.created_at)}
                </span>
              </div>

              <div
                className="flex items-center justify-center py-3"
                onClick={(e) => { e.stopPropagation(); onToggleStar(email.id) }}
              >
                <button
                  className={cn(
                    "transition-colors",
                    email.is_starred
                      ? "text-amber-400"
                      : "text-muted-foreground/30 group-hover:text-muted-foreground hover:text-amber-400"
                  )}
                  title={email.is_starred ? "Remover favorito" : "Favoritar"}
                >
                  <Star className={cn("h-4 w-4", email.is_starred && "fill-amber-400")} />
                </button>
              </div>

              <div
                className="flex items-center justify-center py-3"
                onClick={(e) => { e.stopPropagation(); onTogglePin(email.id) }}
              >
                <button
                  className={cn(
                    "transition-colors",
                    email.is_pinned
                      ? "text-primary"
                      : "text-muted-foreground/30 group-hover:text-muted-foreground hover:text-primary"
                  )}
                  title={email.is_pinned ? "Desafixar" : "Fixar"}
                >
                  {email.is_pinned ? (
                    <PinOff className="h-4 w-4" />
                  ) : (
                    <Pin className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </ScrollArea>
    </div>
  )
}
