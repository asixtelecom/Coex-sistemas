"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface CalendarEvent {
  id: string
  title: string
  description: string | null
  location: string | null
  event_type: string
  color: string
  all_day: boolean
  start_at: string
  end_at: string | null
  status: string
  created_at: string
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  scheduled: { label: "Agendado", variant: "secondary" },
  confirmed: { label: "Confirmado", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  completed: { label: "Realizado", variant: "outline" },
}

const typeColors: Record<string, string> = {
  event: "#3b82f6",
  appointment: "#10b981",
  meeting: "#8b5cf6",
  reminder: "#f59e0b",
  call: "#ef4444",
}

export default function AgendaPage() {
  const { accountId } = useAuth()
  const supabase = createClient()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [startAt, setStartAt] = useState("")
  const [endAt, setEndAt] = useState("")
  const [allDay, setAllDay] = useState(false)
  const [creating, setCreating] = useState(false)

  const fetchEvents = async () => {
    if (!accountId) return
    const { data } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("account_id", accountId)
      .eq("deleted", false)
      .order("start_at", { ascending: true })
    setEvents((data as CalendarEvent[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchEvents()
  }, [accountId])

  const handleCreate = async () => {
    if (!accountId || !title || !startAt) return
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from("calendar_events").insert({
      account_id: accountId,
      title,
      description: description || null,
      location: location || null,
      event_type: "event",
      all_day: allDay,
      start_at: new Date(startAt).toISOString(),
      end_at: endAt ? new Date(endAt).toISOString() : null,
      created_by: user?.id,
    })
    setCreating(false)
    if (error) {
      toast.error("Erro ao criar: " + error.message)
    } else {
      toast.success("Evento criado!")
      setOpen(false)
      setTitle("")
      setDescription("")
      setLocation("")
      setStartAt("")
      setEndAt("")
      setAllDay(false)
      fetchEvents()
    }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    })

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
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="mt-1 text-sm text-muted-foreground">Eventos e compromissos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="gap-2" />}>
            <Plus className="h-4 w-4" />
            Novo Evento
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Evento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do evento" />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Local</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Local" />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="allDay" checked={allDay} onCheckedChange={(c) => setAllDay(c === true)} />
                <Label htmlFor="allDay">Dia inteiro</Label>
              </div>
              <div className="space-y-2">
                <Label>Início</Label>
                <Input type={allDay ? "date" : "datetime-local"} value={startAt} onChange={(e) => setStartAt(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Input type={allDay ? "date" : "datetime-local"} value={endAt} onChange={(e) => setEndAt(e.target.value)} />
              </div>
              <Button onClick={handleCreate} disabled={creating || !title || !startAt} className="w-full">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Criar Evento
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhum evento encontrado.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <Card key={ev.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: ev.color || typeColors[ev.event_type] || "#3b82f6" }}
                    />
                    <CardTitle className="text-lg">{ev.title}</CardTitle>
                  </div>
                  <Badge variant={statusMap[ev.status]?.variant || "outline"}>
                    {statusMap[ev.status]?.label || ev.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-1">
                  {ev.description && <p>{ev.description}</p>}
                  {ev.location && <p>📍 {ev.location}</p>}
                  <p>Início: {formatDate(ev.start_at)}</p>
                  {ev.end_at && <p>Fim: {formatDate(ev.end_at)}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
