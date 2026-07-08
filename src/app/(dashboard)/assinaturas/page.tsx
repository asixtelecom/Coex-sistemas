"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useAuth } from "@/hooks/use-auth"
import { listSignatureDocuments } from "@/lib/channels/zapsign-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  FileSignature, Upload, Loader2, RefreshCw, Download,
  ChevronLeft, ChevronRight, Search,
} from "lucide-react"
import { toast } from "sonner"
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, isToday,
  addMonths, subMonths,
} from "date-fns"
import { ptBR } from "date-fns/locale"

interface SignatureDocument {
  id: string
  title: string
  description: string | null
  file_name: string | null
  signer_name: string | null
  signer_email: string | null
  signer_phone: string | null
  status: string
  created_at: string
  signed_at: string | null
  provider_document_id: string | null
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Aguardando assinatura", variant: "secondary" },
  sent: { label: "Aguardando assinatura", variant: "secondary" },
  signed: { label: "Assinado", variant: "default" },
  expired: { label: "Expirado", variant: "outline" },
  cancelled: { label: "Cancelado", variant: "destructive" },
}

const statusColors: Record<string, string> = {
  pending: "#f59e0b",
  sent: "#f59e0b",
  signed: "#10b981",
  expired: "#6b7280",
  cancelled: "#ef4444",
}

const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

function formatDay(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", {
    weekday: "short", day: "2-digit", month: "long", year: "numeric",
  })
}

export default function AssinaturasPage() {
  const { accountId } = useAuth()
  const [documents, setDocuments] = useState<SignatureDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [filterSigned, setFilterSigned] = useState(false)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [formTitle, setFormTitle] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formSignerName, setFormSignerName] = useState("")
  const [formSignerEmail, setFormSignerEmail] = useState("")
  const [formSignerPhone, setFormSignerPhone] = useState("")
  const [formFile, setFormFile] = useState<File | null>(null)

  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const loadDocs = () => {
    if (!accountId) return
    setLoading(true)
    listSignatureDocuments(accountId).then((data) => {
      setDocuments(data as SignatureDocument[])
      setLoading(false)
    })
  }

  const handleSync = async (docId: string) => {
    setSyncingId(docId)
    try {
      const res = await fetch("/api/signatures/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Status sincronizado: " + (data.status || "ok"))
        loadDocs()
      } else {
        toast.error(data.error || "Falha ao sincronizar")
      }
    } catch {
      toast.error("Erro ao sincronizar")
    } finally {
      setSyncingId(null)
    }
  }

  useEffect(() => {
    loadDocs()
  }, [accountId])

  const documentsByDate = useMemo(() => {
    const map = new Map<string, SignatureDocument[]>()
    for (const doc of documents) {
      const key = format(new Date(doc.created_at), "yyyy-MM-dd")
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(doc)
    }
    return map
  }, [documents])

  const filtered = useMemo(() => {
    let list = documents
    if (selectedDate) {
      const key = format(selectedDate, "yyyy-MM-dd")
      list = documentsByDate.get(key) || []
    }
    if (filterSigned) list = list.filter((d) => d.status === "signed")
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          (d.signer_name?.toLowerCase() || "").includes(q) ||
          (d.signer_email?.toLowerCase() || "").includes(q),
      )
    }
    return list
  }, [documents, selectedDate, documentsByDate, filterSigned, search])

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  const resetForm = () => {
    setFormTitle("")
    setFormDescription("")
    setFormSignerName("")
    setFormSignerEmail("")
    setFormSignerPhone("")
    setFormFile(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  const handleSend = async () => {
    if (!formTitle.trim() || !formSignerName.trim() || !formSignerEmail.trim() || !formFile) {
      toast.error("Preencha todos os campos obrigatórios")
      return
    }
    setSending(true)
    try {
      const body = new FormData()
      body.append("account_id", accountId!)
      body.append("title", formTitle.trim())
      body.append("signer_name", formSignerName.trim())
      body.append("signer_email", formSignerEmail.trim())
      if (formDescription) body.append("description", formDescription.trim())
      if (formSignerPhone) body.append("signer_phone", formSignerPhone.trim())
      body.append("file", formFile)

      const res = await fetch("/api/signatures", { method: "POST", body })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Falha ao enviar documento")
      }
      toast.success("Documento enviado para assinatura!")
      setDialogOpen(false)
      resetForm()
      loadDocs()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar documento")
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assinaturas Digitais</h1>
          <p className="mt-1 text-sm text-muted-foreground">Documentos enviados para assinatura via Zapsign</p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Upload className="h-4 w-4" />
          Enviar para Assinatura
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setCurrentMonth((m) => subMonths(m, 1))} className="p-1 hover:bg-muted rounded">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold">
                  {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                </span>
                <button onClick={() => setCurrentMonth((m) => addMonths(m, 1))} className="p-1 hover:bg-muted rounded">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-0 text-center text-xs font-medium text-muted-foreground mb-1">
                {weekdays.map((d) => <div key={d} className="py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-0">
                {calendarDays.map((day) => {
                  const key = format(day, "yyyy-MM-dd")
                  const dayDocs = documentsByDate.get(key) || []
                  const inMonth = isSameMonth(day, currentMonth)
                  const today = isToday(day)
                  const selected = selectedDate && isSameDay(day, selectedDate)
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDate(selected ? null : day)}
                      className={`
                        relative flex flex-col items-center justify-center aspect-square text-sm rounded-lg transition-colors
                        ${!inMonth ? "text-muted-foreground/30" : ""}
                        ${today ? "font-bold" : ""}
                        ${selected ? "bg-primary/15 text-primary ring-1 ring-primary" : "hover:bg-muted"}
                      `}
                    >
                      <span>{format(day, "d")}</span>
                      {dayDocs.length > 0 && (
                        <span className="absolute bottom-1 flex gap-0.5">
                          {dayDocs.slice(0, 3).map((doc) => (
                            <span
                              key={doc.id}
                              className="w-1 h-1 rounded-full"
                              style={{ backgroundColor: statusColors[doc.status] || "#6b7280" }}
                            />
                          ))}
                          {dayDocs.length > 3 && <span className="text-[8px] text-muted-foreground">+</span>}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {selectedDate && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-2">{formatDay(format(selectedDate, "yyyy-MM-dd"))}</p>
                <p className="text-xs text-muted-foreground">
                  {filtered.length} documento{filtered.length !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <Button
              variant={!filterSigned ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterSigned(false)}
            >
              Todos ({documents.length})
            </Button>
            <Button
              variant={filterSigned ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterSigned(true)}
            >
              Assinados ({documents.filter((d) => d.status === "signed").length})
            </Button>
            <div className="relative ml-auto w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, signatário ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                {selectedDate
                  ? "Nenhum documento nesta data."
                  : filterSigned
                    ? "Nenhum documento assinado encontrado."
                    : "Nenhum documento encontrado."}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((doc) => (
                <Card key={doc.id}>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-3 h-3 rounded-full shrink-0 mt-0.5"
                          style={{ backgroundColor: statusColors[doc.status] || "#6b7280" }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{doc.title}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Badge variant={statusMap[doc.status]?.variant || "outline"}>
                          {statusMap[doc.status]?.label || doc.status}
                        </Badge>
                        <button
                          onClick={() => window.open(`/api/signatures/download/${doc.id}`, "_blank")}
                          disabled={doc.status !== "signed"}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={doc.status === "signed" ? "Baixar documento assinado" : "Aguardando assinatura"}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        {doc.provider_document_id && doc.status !== "signed" && (
                          <button
                            onClick={() => handleSync(doc.id)}
                            disabled={syncingId === doc.id}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Sincronizar status"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${syncingId === doc.id ? "animate-spin" : ""}`} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5 ml-5">
                      {doc.signer_name && <p>Signatário: {doc.signer_name}</p>}
                      {doc.signer_email && <p>E-mail: {doc.signer_email}</p>}
                      <p>Enviado: {new Date(doc.created_at).toLocaleString("pt-BR")}</p>
                      {doc.signed_at && (
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          Assinado: {new Date(doc.signed_at).toLocaleString("pt-BR")}
                        </p>
                      )}
                      {doc.description && (
                        <p className="truncate" title={doc.description}>{doc.description}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar para Assinatura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Título *</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Ex: Contrato de Mudança" />
            </div>
            <div className="grid gap-2">
              <Label>Descrição</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Descrição opcional do documento" />
            </div>
            <div className="grid gap-2">
              <Label>PDF *</Label>
              <Input ref={fileRef} type="file" accept=".pdf,application/pdf" onChange={(e) => setFormFile(e.target.files?.[0] || null)} />
            </div>
            <div className="grid gap-2">
              <Label>Nome do Signatário *</Label>
              <Input value={formSignerName} onChange={(e) => setFormSignerName(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="grid gap-2">
              <Label>E-mail do Signatário *</Label>
              <Input type="email" value={formSignerEmail} onChange={(e) => setFormSignerEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div className="grid gap-2">
              <Label>Telefone do Signatário</Label>
              <Input value={formSignerPhone} onChange={(e) => setFormSignerPhone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>
              Cancelar
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar para Assinatura"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
