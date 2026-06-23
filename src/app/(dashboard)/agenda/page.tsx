"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Plus, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, isToday,
  addMonths, subMonths
} from "date-fns"
import { ptBR } from "date-fns/locale"

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
  event: "#3b82f6", appointment: "#10b981", meeting: "#8b5cf6",
  reminder: "#f59e0b", call: "#ef4444",
}

export default function AgendaPage() {
  const { accountId } = useAuth()
  const supabase = createClient()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

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

  useEffect(() => { fetchEvents() }, [accountId])

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const ev of events) {
      const key = format(new Date(ev.start_at), "yyyy-MM-dd")
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ev)
    }
    return map
  }, [events])

  const filteredEvents = useMemo(() => {
    if (!selectedDate) return events
    const key = format(selectedDate, "yyyy-MM-dd")
    return eventsByDate.get(key) || []
  }, [events, selectedDate, eventsByDate])

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  const openNewEvent = (date?: Date) => {
    const d = date || new Date()
    setStartAt(format(d, "yyyy-MM-ddTHH:mm"))
    setEndAt("")
    setAllDay(false)
    setTitle("")
    setDescription("")
    setLocation("")
    setOpen(true)
  }

  const handleCreate = async () => {
    if (!accountId || !title || !startAt) return
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from("calendar_events").insert({
      account_id: accountId, title, description: description || null,
      location: location || null, event_type: "event",
      all_day: allDay, start_at: new Date(startAt).toISOString(),
      end_at: endAt ? new Date(endAt).toISOString() : null,
      created_by: user?.id,
    })
    setCreating(false)
    if (error) { toast.error("Erro ao criar: " + error.message) }
    else {
      toast.success("Evento criado!")
      setOpen(false)
      fetchEvents()
    }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    })

  const formatDay = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", {
      weekday: "short", day: "2-digit", month: "long", year: "numeric",
    })

  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Carregando...</p></div>
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="mt-1 text-sm text-muted-foreground">Eventos e compromissos</p>
        </div>
        <Button className="gap-2" onClick={() => openNewEvent()}>
          <Plus className="h-4 w-4" />
          Novo Evento
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
                  const dayEvents = eventsByDate.get(key) || []
                  const inMonth = isSameMonth(day, currentMonth)
                  const today = isToday(day)
                  const selected = selectedDate && isSameDay(day, selectedDate)
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedDate(day)
                        openNewEvent(day)
                      }}
                      className={`
                        relative flex flex-col items-center justify-center aspect-square text-sm rounded-lg transition-colors
                        ${!inMonth ? "text-muted-foreground/30" : ""}
                        ${today ? "font-bold" : ""}
                        ${selected ? "bg-primary/15 text-primary ring-1 ring-primary" : "hover:bg-muted"}
                      `}
                    >
                      <span>{format(day, "d")}</span>
                      {dayEvents.length > 0 && (
                        <span className="absolute bottom-1 flex gap-0.5">
                          {dayEvents.slice(0, 3).map((ev) => (
                            <span
                              key={ev.id}
                              className="w-1 h-1 rounded-full"
                              style={{ backgroundColor: ev.color || typeColors[ev.event_type] || "#3b82f6" }}
                            />
                          ))}
                          {dayEvents.length > 3 && <span className="text-[8px] text-muted-foreground">+</span>}
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
                  {filteredEvents.length} evento{filteredEvents.length !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-3">
          {filteredEvents.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                {selectedDate ? "Nenhum evento nesta data." : "Nenhum evento encontrado."}
              </CardContent>
            </Card>
          ) : (
            filteredEvents.map((ev) => (
              <Card key={ev.id}>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: ev.color || typeColors[ev.event_type] || "#3b82f6" }}
                      />
                      <p className="text-sm font-semibold">{ev.title}</p>
                    </div>
                    <Badge variant={statusMap[ev.status]?.variant || "outline"}>
                      {statusMap[ev.status]?.label || ev.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {ev.description && <p>{ev.description}</p>}
                    {ev.location && <p>📍 {ev.location}</p>}
                    <p>Início: {formatDate(ev.start_at)}</p>
                    {ev.end_at && <p>Fim: {formatDate(ev.end_at)}</p>}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Evento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do evento" />
            </div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <div className="space-y-2"><Label>Local</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Local" /></div>
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
  )
}
