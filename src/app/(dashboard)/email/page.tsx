"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import {
  Inbox, Send, Star, AlertTriangle, FileText, Trash2, FileJson,
  Search, RefreshCw, ChevronLeft, Reply, Forward,
  Mail, Download, File, CheckCheck, RotateCcw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { EmailSidebar } from "@/components/email/email-sidebar"
import { EmailList, type EmailItem } from "@/components/email/email-list"
import { EmailCompose } from "@/components/email/email-compose"

interface Mailbox {
  id: number
  account_id: string
  title: string
  color: string
}

interface RawEmail {
  id: number
  mailbox_id: number
  account_id: string
  to: string
  cc: string | null
  bcc: string | null
  subject: string
  message: string
  created_by: string | null
  creator_name: string | null
  creator_email: string | null
  is_read: boolean
  is_starred: boolean
  status: string
  created_at: string
  last_activity_at: string | null
  files: string | null
  email_labels: string | null
}

function parseLabels(labels: string | null): { pinned: boolean; important: boolean } {
  if (!labels) return { pinned: false, important: false }
  const s = labels.toLowerCase()
  return {
    pinned: s.includes("pinned"),
    important: s.includes("important"),
  }
}

function toggleLabel(labels: string | null, tag: "pinned" | "important"): string {
  const current = labels ? labels.split(",").map((s) => s.trim()).filter(Boolean) : []
  const tagLower = tag.toLowerCase()
  if (current.includes(tagLower)) {
    return current.filter((s) => s !== tagLower).join(",")
  }
  return [...current, tagLower].join(",")
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

function isHtml(str: string) {
  return /<[a-z][\s\S]*>/i.test(str)
}

export default function EmailPage() {
  const { accountId, user, profile } = useAuth()
  const supabase = createClient()

  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [selectedMailboxId, setSelectedMailboxId] = useState<number | null>(null)
  const [rawEmails, setRawEmails] = useState<RawEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFolder, setActiveFolder] = useState("inbox")
  const [showCompose, setShowCompose] = useState(false)
  const [composeInitial, setComposeInitial] = useState<{ to?: string; subject?: string; message?: string } | undefined>()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [previewEmail, setPreviewEmail] = useState<EmailItem | null>(null)

  useEffect(() => {
    if (!accountId) return
    const fetchMailboxes = async () => {
      const { data } = await supabase
        .from("mailboxes")
        .select("*")
        .eq("account_id", accountId)
        .eq("deleted", false)
        .order("id")
      if (data && data.length > 0) {
        setMailboxes(data)
        setSelectedMailboxId(data[0].id)
      }
      setLoading(false)
    }
    fetchMailboxes()
  }, [accountId])

  useEffect(() => {
    if (!selectedMailboxId) return
    const fetchEmails = async () => {
      const { data } = await supabase
        .from("mailbox_emails")
        .select("*")
        .eq("mailbox_id", selectedMailboxId)
        .eq("deleted", false)
        .order("last_activity_at", { ascending: false })
        .order("created_at", { ascending: false })
      if (data) setRawEmails(data as RawEmail[])
    }
    fetchEmails()
  }, [selectedMailboxId])

  const emails: EmailItem[] = useMemo(() =>
    rawEmails.map((e) => {
      const labels = parseLabels(e.email_labels)
      return { ...e, is_pinned: labels.pinned, is_important: labels.important }
    }),
    [rawEmails]
  )

  const folders = (() => {
    const inboxE = emails.filter((e) => e.status !== "trash" && e.status !== "draft" && !e.created_by)
    const sent = emails.filter((e) => e.created_by && e.status !== "trash")
    const starred = emails.filter((e) => e.is_starred && e.status !== "trash")
    const important = emails.filter((e) => e.is_important && e.status !== "trash")
    const drafts = emails.filter((e) => e.status === "draft")
    const trash = emails.filter((e) => e.status === "trash")

    return [
      { id: "inbox", label: "Caixa de Entrada", icon: Inbox, count: inboxE.filter((e) => !e.is_read).length },
      { id: "sent", label: "Enviado", icon: Send },
      { id: "starred", label: "Com estrela", icon: Star, count: starred.length },
      { id: "important", label: "Importante", icon: AlertTriangle, count: important.length },
      { id: "drafts", label: "Rascunho", icon: FileText, count: drafts.length },
      { id: "trash", label: "Lixo", icon: Trash2, count: trash.length },
      { id: "templates", label: "Modelos", icon: FileJson },
    ]
  })()

  const filteredEmails = useMemo(() => {
    let list = [...emails]

    switch (activeFolder) {
      case "inbox":
        list = list.filter((e) => e.status !== "trash" && e.status !== "draft" && !e.created_by)
        break
      case "sent":
        list = list.filter((e) => e.created_by && e.status !== "trash")
        break
      case "starred":
        list = list.filter((e) => e.is_starred && e.status !== "trash")
        break
      case "important":
        list = list.filter((e) => e.is_important && e.status !== "trash")
        break
      case "drafts":
        list = list.filter((e) => e.status === "draft")
        break
      case "trash":
        list = list.filter((e) => e.status === "trash")
        break
      case "templates":
        return []
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (e) =>
          e.subject?.toLowerCase().includes(q) ||
          e.creator_name?.toLowerCase().includes(q) ||
          e.creator_email?.toLowerCase().includes(q) ||
          e.to?.toLowerCase().includes(q) ||
          e.message?.toLowerCase().includes(q)
      )
    }

    list.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1
      if (!a.is_pinned && b.is_pinned) return 1
      const aTime = new Date(a.last_activity_at || a.created_at).getTime()
      const bTime = new Date(b.last_activity_at || b.created_at).getTime()
      return bTime - aTime
    })

    return list
  }, [emails, activeFolder, searchQuery])

  const handleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    setSelectedIds((prev) =>
      prev.length === filteredEmails.length ? [] : filteredEmails.map((e) => e.id)
    )
  }

  const updateEmail = useCallback(async (id: number, updates: Partial<RawEmail>) => {
    const { error } = await supabase.from("mailbox_emails").update(updates).eq("id", id)
    if (!error) {
      setRawEmails((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)))
    }
  }, [supabase])

  const batchUpdate = useCallback(async (ids: number[], updates: Partial<RawEmail>) => {
    const { error } = await supabase.from("mailbox_emails").update(updates).in("id", ids)
    if (!error) {
      setRawEmails((prev) => prev.map((e) => ids.includes(e.id) ? { ...e, ...updates } : e))
      setSelectedIds([])
    }
  }, [supabase])

  const handleToggleStar = useCallback((id: number) => {
    const email = rawEmails.find((e) => e.id === id)
    if (email) updateEmail(id, { is_starred: !email.is_starred })
  }, [rawEmails, updateEmail])

  const handleTogglePin = useCallback((id: number) => {
    const email = rawEmails.find((e) => e.id === id)
    if (email) {
      const newLabels = toggleLabel(email.email_labels, "pinned")
      updateEmail(id, { email_labels: newLabels })
    }
  }, [rawEmails, updateEmail])

  const handleToggleImportant = useCallback((id: number) => {
    const email = rawEmails.find((e) => e.id === id)
    if (email) {
      const newLabels = toggleLabel(email.email_labels, "important")
      updateEmail(id, { email_labels: newLabels })
    }
  }, [rawEmails, updateEmail])

  const handleToggleRead = useCallback((id: number) => {
    const email = rawEmails.find((e) => e.id === id)
    if (email) updateEmail(id, { is_read: !email.is_read })
  }, [rawEmails, updateEmail])

  const handleDelete = useCallback((id: number) => {
    updateEmail(id, { status: "trash" })
  }, [updateEmail])

  const handleOpen = useCallback((email: EmailItem) => {
    setPreviewEmail(email)
    if (!email.is_read && !email.created_by) {
      updateEmail(email.id, { is_read: true })
    }
  }, [updateEmail])

  const handleSend = useCallback(async (data: { to: string; cc: string; bcc: string; subject: string; message: string; attachments: string }) => {
    if (!selectedMailboxId || !accountId || !user) return
    const { error } = await supabase.from("mailbox_emails").insert({
      account_id: accountId,
      mailbox_id: selectedMailboxId,
      to: data.to,
      cc: data.cc || null,
      bcc: data.bcc || null,
      subject: data.subject,
      message: data.message,
      created_by: user.id,
      creator_name: profile?.full_name || user.email?.split("@")[0] || "Usuário",
      creator_email: user.email || "",
      is_read: true,
      is_starred: false,
      status: "",
      files: data.attachments || null,
      last_activity_at: new Date().toISOString(),
    }).select().single()
    if (!error) {
      setShowCompose(false)
      setComposeInitial(undefined)
      const { data: refreshed } = await supabase
        .from("mailbox_emails")
        .select("*")
        .eq("mailbox_id", selectedMailboxId)
        .eq("deleted", false)
        .order("last_activity_at", { ascending: false })
        .order("created_at", { ascending: false })
      if (refreshed) setRawEmails(refreshed as RawEmail[])
    }
  }, [selectedMailboxId, accountId, user, profile, supabase])

  const handleRefresh = useCallback(async () => {
    if (!selectedMailboxId) return
    setLoading(true)
    const { data } = await supabase
      .from("mailbox_emails")
      .select("*")
      .eq("mailbox_id", selectedMailboxId)
      .eq("deleted", false)
      .order("last_activity_at", { ascending: false })
      .order("created_at", { ascending: false })
    if (data) setRawEmails(data as RawEmail[])
    setLoading(false)
  }, [selectedMailboxId, supabase])

  const openReply = useCallback((email: EmailItem) => {
    const sender = email.creator_email || email.creator_name || email.to
    const prefix = email.subject?.startsWith("Re:") ? "" : "Re: "
    const quoted = email.message
      ? `\n\n--- Mensagem original ---\nDe: ${email.creator_name || "Desconhecido"} <${email.creator_email || ""}>\nPara: ${email.to}\nAssunto: ${email.subject}\nData: ${new Date(email.created_at).toLocaleString("pt-BR")}\n\n${email.message}`
      : ""
    setComposeInitial({
      to: sender,
      subject: `${prefix}${email.subject || ""}`,
      message: quoted,
    })
    setShowCompose(true)
  }, [])

  const openForward = useCallback((email: EmailItem) => {
    const prefix = email.subject?.startsWith("Enc:") ? "" : "Enc: "
    const quoted = email.message
      ? `\n\n--- Mensagem encaminhada ---\nDe: ${email.creator_name || "Desconhecido"} <${email.creator_email || ""}>\nPara: ${email.to}\nAssunto: ${email.subject}\nData: ${new Date(email.created_at).toLocaleString("pt-BR")}\n\n${email.message}`
      : ""
    setComposeInitial({
      subject: `${prefix}${email.subject || ""}`,
      message: quoted,
    })
    setShowCompose(true)
  }, [])

  if (loading && mailboxes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (mailboxes.length === 0) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">E-mail</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie suas conversas por e-mail.</p>
        </div>
        <div className="flex items-center justify-center h-64 rounded-lg border border-border bg-card">
          <div className="text-center text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Nenhuma caixa de e-mail configurada.</p>
            <p className="text-sm mt-1">Vá em Configurações &gt; E-mail para criar uma.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">E-mail</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie suas conversas por e-mail.</p>
        </div>
        <div className="flex gap-2">
          {mailboxes.map((mb) => (
            <Button
              key={mb.id}
              variant={selectedMailboxId === mb.id ? "default" : "outline"}
              size="sm"
              className="flex items-center gap-2"
              style={
                selectedMailboxId === mb.id
                  ? { backgroundColor: mb.color, borderColor: mb.color }
                  : { borderColor: mb.color, color: mb.color }
              }
              onClick={() => { setSelectedMailboxId(mb.id); setPreviewEmail(null); setSelectedIds([]) }}
            >
              <Mail className="h-4 w-4" />
              {mb.title}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex rounded-lg border border-border overflow-hidden bg-card min-h-[600px]">
        <EmailSidebar
          folders={folders}
          activeFolder={activeFolder}
          onFolderChange={(f) => { setActiveFolder(f); setPreviewEmail(null); setSelectedIds([]) }}
          onCompose={() => { setComposeInitial(undefined); setShowCompose(true) }}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {activeFolder === "templates" ? (
            <TemplatesView />
          ) : previewEmail ? (
            <EmailDetailView
              email={previewEmail}
              onBack={() => setPreviewEmail(null)}
              onToggleStar={() => handleToggleStar(previewEmail.id)}
              onToggleImportant={() => handleToggleImportant(previewEmail.id)}
              onToggleRead={() => handleToggleRead(previewEmail.id)}
              onDelete={() => { handleDelete(previewEmail.id); setPreviewEmail(null) }}
              onReply={() => openReply(previewEmail)}
              onForward={() => openForward(previewEmail)}
            />
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-border px-4 py-2 min-h-[48px]">
                {selectedIds.length > 0 ? (
                  <>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{selectedIds.length} selecionado(s)</span>
                    <div className="h-4 w-px bg-border" />
                    <Button variant="ghost" size="sm" onClick={handleSelectAll} className="text-xs gap-1 text-muted-foreground">
                      <CheckCheck className="h-3.5 w-3.5" />
                      Selecionar tudo
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => batchUpdate(selectedIds, { is_read: true })}
                      className="text-xs gap-1 text-muted-foreground"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Marcar lida
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => batchUpdate(selectedIds, { is_read: false })}
                      className="text-xs gap-1 text-muted-foreground"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Não lida
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => {
                        selectedIds.forEach((id) => {
                          const email = rawEmails.find((e) => e.id === id)
                          if (email) {
                            const newLabels = toggleLabel(email.email_labels, "important")
                            updateEmail(id, { email_labels: newLabels })
                          }
                        })
                        setSelectedIds([])
                      }}
                      className="text-xs gap-1 text-muted-foreground"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Importante
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => batchUpdate(selectedIds, { status: "trash" })}
                      className="text-xs gap-1 text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Lixo
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Pesquisar e-mail..."
                        className="w-full bg-muted/50 border-0 rounded-md pl-8 pr-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                      />
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleRefresh} className="text-muted-foreground">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>

              <EmailList
                emails={filteredEmails}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onSelectAll={handleSelectAll}
                onToggleStar={handleToggleStar}
                onTogglePin={handleTogglePin}
                onToggleRead={handleToggleRead}
                onDelete={handleDelete}
                onOpen={handleOpen}
                loading={loading}
              />
            </>
          )}
        </div>
      </div>

      {showCompose && selectedMailboxId && (
        <EmailCompose
          mailboxId={selectedMailboxId}
          onClose={() => { setShowCompose(false); setComposeInitial(undefined) }}
          onSend={handleSend}
          initialTo={composeInitial?.to}
          initialSubject={composeInitial?.subject}
          initialMessage={composeInitial?.message}
        />
      )}
    </div>
  )
}

function EmailDetailView({ email, onBack, onToggleStar, onToggleImportant, onToggleRead, onDelete, onReply, onForward }: {
  email: EmailItem
  onBack: () => void
  onToggleStar: () => void
  onToggleImportant: () => void
  onToggleRead: () => void
  onDelete: () => void
  onReply: () => void
  onForward: () => void
}) {
  const hasHtml = email.message ? isHtml(email.message) : false
  const attachments = email.files ? email.files.split(",").filter(Boolean) : []

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground gap-1">
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onReply} className="text-muted-foreground gap-1" title="Responder">
            <Reply className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Responder</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={onForward} className="text-muted-foreground gap-1" title="Encaminhar">
            <Forward className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Encaminhar</span>
          </Button>
          <div className="h-4 w-px bg-border mx-1" />
          <Button variant="ghost" size="sm" onClick={onToggleStar} className="text-muted-foreground" title={email.is_starred ? "Remover favorito" : "Favoritar"}>
            <Star className={cn("h-4 w-4", email.is_starred && "fill-amber-400 text-amber-400")} />
          </Button>
          <Button variant="ghost" size="sm" onClick={onToggleImportant} className="text-muted-foreground" title={email.is_important ? "Remover importante" : "Marcar importante"}>
            <AlertTriangle className={cn("h-4 w-4", email.is_important && "text-red-500 fill-red-500")} />
          </Button>
          <Button variant="ghost" size="sm" onClick={onToggleRead} className="text-muted-foreground" title={email.is_read ? "Marcar não lido" : "Marcar lido"}>
            {email.is_read ? <RotateCcw className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-muted-foreground" title="Mover para lixo">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        <h2 className="text-lg font-semibold mb-4">{email.subject || "(sem assunto)"}</h2>

        <div className="flex items-center gap-3 mb-6 p-3 bg-muted/30 rounded-lg">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
            {(email.creator_name || "S")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{email.creator_name || "Sistema"}</p>
            <p className="text-xs text-muted-foreground">{email.creator_email || ""}</p>
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(email.last_activity_at || email.created_at).toLocaleString("pt-BR")}
          </div>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground mb-4">
          <p><strong>Para:</strong> {email.to}</p>
          {email.cc && <p><strong>Cc:</strong> {email.cc}</p>}
          {email.bcc && <p><strong>Cco:</strong> {email.bcc}</p>}
        </div>

        {attachments.length > 0 && (
          <div className="mb-4 space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-1">Anexos ({attachments.length})</p>
            {attachments.map((url, i) => {
              const name = url.split("/").pop() || `anexo-${i + 1}`
              return (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-primary hover:underline p-1.5 rounded hover:bg-muted/50 transition-colors"
                >
                  <File className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{decodeURIComponent(name)}</span>
                  <Download className="h-3 w-3 shrink-0 ml-auto" />
                </a>
              )
            })}
          </div>
        )}

        <div className="border-t border-border pt-4">
          {hasHtml ? (
            <div
              className="leading-relaxed text-sm [&_img]:max-w-full [&_table]:w-full [&_a]:text-primary [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: email.message }}
            />
          ) : (
            <div className="whitespace-pre-wrap leading-relaxed text-sm">
              {email.message}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function TemplatesView() {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("mailbox_templates")
        .select("*")
        .eq("deleted", false)
        .order("title")
      if (data) setTemplates(data)
      setLoading(false)
    }
    fetch()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Nenhum modelo encontrado.</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-medium mb-3">Modelos de E-mail</h3>
      <div className="grid gap-3">
        {templates.map((t: any) => (
          <div key={t.id} className="rounded-lg border border-border p-4 hover:bg-muted/30 transition-colors cursor-pointer">
            <h4 className="text-sm font-medium">{t.title}</h4>
            {t.description && (
              <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
