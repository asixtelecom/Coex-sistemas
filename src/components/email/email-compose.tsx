"use client"

import { useState, useEffect, useRef } from "react"
import { X, Paperclip, Send, FileJson, ChevronDown, File, Trash2, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { uploadAccountMedia, deleteAccountMedia } from "@/lib/storage/upload-media"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Template {
  id: number
  title: string
  description: string | null
  body: string | null
}

interface AttachedFile {
  file: File
  uploading?: boolean
  publicUrl?: string
  path?: string
  error?: string
}

interface EmailComposeProps {
  mailboxId: number
  onClose: () => void
  onSend: (data: {
    to: string
    cc: string
    bcc: string
    subject: string
    message: string
    attachments: string
  }) => Promise<void>
  initialTo?: string
  initialSubject?: string
  initialMessage?: string
}

export function EmailCompose({ mailboxId, onClose, onSend, initialTo, initialSubject, initialMessage }: EmailComposeProps) {
  const [to, setTo] = useState(initialTo || "")
  const [cc, setCc] = useState("")
  const [bcc, setBcc] = useState("")
  const [subject, setSubject] = useState(initialSubject || "")
  const [message, setMessage] = useState(initialMessage || "")
  const [sending, setSending] = useState(false)
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [attachments, setAttachments] = useState<AttachedFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("mailbox_templates")
        .select("*")
        .eq("deleted", false)
        .order("title")
      if (data) setTemplates(data)
    }
    fetch()
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments((prev) => [...prev, ...files.map((f) => ({ file: f }))])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const removeAttachment = (index: number) => {
    const att = attachments[index]
    if (att.path) {
      deleteAccountMedia("chat-media", att.path).catch(() => {})
    }
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSend = async () => {
    if (!to.trim()) return
    setSending(true)
    try {
      const uploaded = []
      for (let i = 0; i < attachments.length; i++) {
        const att = attachments[i]
        if (att.publicUrl) {
          uploaded.push(att.publicUrl)
          continue
        }
        try {
          const result = await uploadAccountMedia("chat-media", att.file)
          setAttachments((prev) => prev.map((a, j) => j === i ? { ...a, uploading: false, publicUrl: result.publicUrl, path: result.path } : a))
          uploaded.push(result.publicUrl)
        } catch (err: any) {
          setAttachments((prev) => prev.map((a, j) => j === i ? { ...a, uploading: false, error: err.message } : a))
          throw new Error(`Falha ao anexar ${att.file.name}: ${err.message}`)
        }
      }

      await onSend({
        to, cc, bcc, subject, message,
        attachments: uploaded.join(",")
      })
      onClose()
    } catch (err) {
      console.error("Failed to send:", err)
    } finally {
      setSending(false)
    }
  }

  const applyTemplate = (t: Template) => {
    if (t.body) setMessage(t.body)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-50 w-full max-w-2xl rounded-t-xl sm:rounded-xl bg-background border border-border shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">
            {initialTo ? (initialSubject?.startsWith("Re:") ? "Responder" : initialSubject?.startsWith("Enc:") ? "Encaminhar" : "Nova Mensagem") : "Nova Mensagem"}
          </h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-0 overflow-y-auto p-4">
          <div className="flex items-center gap-2 border-b border-border py-2">
            <Label className="text-xs text-muted-foreground w-12 shrink-0">Para</Label>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Para"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            />
            <button
              onClick={() => { setShowCc(!showCc); setShowBcc(false) }}
              className="text-xs text-muted-foreground hover:text-foreground px-1"
            >
              Cc
            </button>
            <button
              onClick={() => { setShowBcc(!showBcc); setShowCc(false) }}
              className="text-xs text-muted-foreground hover:text-foreground px-1"
            >
              Cco
            </button>
          </div>

          {showCc && (
            <div className="flex items-center gap-2 border-b border-border py-2">
              <Label className="text-xs text-muted-foreground w-12 shrink-0">Cc</Label>
              <input
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="Cc"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
              />
            </div>
          )}

          {showBcc && (
            <div className="flex items-center gap-2 border-b border-border py-2">
              <Label className="text-xs text-muted-foreground w-12 shrink-0">Cco</Label>
              <input
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder="Cco"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
              />
            </div>
          )}

          <div className="flex items-center gap-2 border-b border-border py-2">
            <Label className="text-xs text-muted-foreground w-12 shrink-0">Assunto</Label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Assunto"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            />
          </div>

          {attachments.length > 0 && (
            <div className="border-b border-border py-2 space-y-1">
              {attachments.map((att, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <File className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate flex-1">{att.file.name}</span>
                  {att.uploading && <Loader2 className="h-3 w-3 animate-spin" />}
                  {att.error && <span className="text-destructive">{att.error}</span>}
                  <button onClick={() => removeAttachment(i)} className="hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escreva sua mensagem..."
            className="min-h-[250px] w-full bg-transparent text-sm outline-none resize-none mt-3 placeholder:text-muted-foreground/50 font-mono"
          />
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4" />
              Anexar
            </Button>
            {templates.length > 0 && (
              <Popover>
                <PopoverTrigger className="inline-flex items-center gap-1 h-8 px-2 rounded-md text-sm text-muted-foreground hover:bg-muted transition-colors">
                  <FileJson className="h-4 w-4" />
                  Modelos
                  <ChevronDown className="h-3 w-3" />
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 p-1">
                  <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Selecione um modelo
                  </p>
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => applyTemplate(t)}
                      className="w-full text-left px-2 py-2 rounded-md text-sm hover:bg-muted transition-colors"
                    >
                      <span className="font-medium">{t.title}</span>
                      {t.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{t.description}</p>
                      )}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            )}
          </div>
          <Button onClick={handleSend} disabled={!to.trim() || sending} className="gap-2">
            <Send className="h-4 w-4" />
            {sending ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </div>
    </div>
  )
}
