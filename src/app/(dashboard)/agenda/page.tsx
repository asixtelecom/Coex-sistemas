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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Plus, Loader2, ChevronLeft, ChevronRight, Pencil, Trash2, ExternalLink, Bell, User } from "lucide-react"
import { toast } from "sonner"
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, addHours
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
  created_by: string | null
  created_at: string
  reminders: { minutesBefore: number }[] | null
  creator?: { full_name: string | null; avatar_url: string | null } | null
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

const reminderOptions = [
  { value: 15, label: "15 min antes" },
  { value: 60, label: "1 hora antes" },
  { value: 1440, label: "1 dia antes" },
]

function googleCalendarUrl(ev: CalendarEvent) {
  const start = new Date(ev.start_at)
  const end = ev.end_at ? new Date(ev.end_at) : addHours(start, 1)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: ev.description || "",
    location: ev.location || "",
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

export default function AgendaPage() {
  const { accountId, user, canEditSettings } = useAuth()
  const supabase = createClient()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const [open, setOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [startAt, setStartAt] = useState("")
  const [endAt, setEndAt] = useState("")
  const [allDay, setAllDay] = useState(false)
  const [reminderChecks, setReminderChecks] = useState<number[]>([])
  const [saving, setSaving] = useState(false)

  const fetchEvents = async () => {
    if (!accountId) return
    let query = supabase
      .from("calendar_events")
      .select("*")
      .eq("account_id", accountId)
      .eq("deleted", false)

    if (!canEditSettings && user?.id) {
      query = query.eq("created_by", user.id)
    }

    const { data } = await query.order("start_at", { ascending: true })
    const events = (data as CalendarEvent[]) || []

    const creatorIds = [...new Set(events.map((e) => e.created_by).filter(Boolean))]
    if (creatorIds.length > 0) {
      const { data: creators } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", creatorIds)
      const creatorMap = new Map((creators || []).map((c) => [c.user_id, c]))
      for (const ev of events) {
        if (ev.created_by) {
          const c = creatorMap.get(ev.created_by)
          if (c) ev.creator = c
        }
      }
    }

    setEvents(events)
    setLoading(false)
  }

  useEffect(() => { fetchEvents() }, [accountId]) // eslint-disable-line react-hooks/set-state-in-effect

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/calendar/pending-notifications")
        if (!res.ok) return
        const { notifications } = await res.json()
        if (!notifications || notifications.length === 0) return
        for (const n of notifications) {
          toast(
            `🔔 ${n.event.title}`,
            {
              description: n.event.location
                ? `${n.event.location} — ${format(new Date(n.event.start_at), "dd/MM HH:mm")}`
                : format(new Date(n.event.start_at), "dd/MM 'às' HH:mm"),
              duration: 8000,
            }
          )
        }
        await fetch("/api/calendar/pending-notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: notifications.map((n: any) => n.id) }),
        })
      } catch {
        // silent
      }
    }
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [])

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
    setEditingEvent(null)
    const d = date || new Date()
    setStartAt(format(d, "yyyy-MM-dd'T'HH:mm"))
    setEndAt("")
    setAllDay(false)
    setTitle("")
    setDescription("")
    setLocation("")
    setReminderChecks([])
    setOpen(true)
  }

  const openEdit = (ev: CalendarEvent) => {
    setEditingEvent(ev)
    setTitle(ev.title)
    setDescription(ev.description || "")
    setLocation(ev.location || "")
    setStartAt(format(new Date(ev.start_at), "yyyy-MM-dd'T'HH:mm"))
    setEndAt(ev.end_at ? format(new Date(ev.end_at), "yyyy-MM-dd'T'HH:mm") : "")
    setAllDay(ev.all_day)
    setReminderChecks((ev.reminders || []).map((r) => r.minutesBefore))
    setOpen(true)
  }

  const handleSave = async () => {
    if (!accountId || !title || !startAt) return
    setSaving(true)
    const payload = {
      title,
      description: description || null,
      location: location || null,
      event_type: "event",
      all_day: allDay,
      start_at: new Date(startAt).toISOString(),
      end_at: endAt ? new Date(endAt).toISOString() : null,
      reminders: reminderChecks.map((m) => ({ minutesBefore: m })),
    }

    let errMsg: string | null = null
    if (editingEvent) {
      const res = await fetch(`/api/calendar/${editingEvent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (!result.updated) errMsg = result.error
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { error: err } = await supabase.from("calendar_events").insert({
        account_id: accountId,
        ...payload,
        created_by: user?.id,
      })
      if (err) errMsg = err.message
    }

    setSaving(false)
    if (errMsg) { toast.error("Erro ao salvar: " + errMsg) }
    else {
      toast.success(editingEvent ? "Evento atualizado!" : "Evento criado!")
      setOpen(false)
      fetchEvents()
    }
  }

  const handleDelete = async (ev: CalendarEvent) => {
    if (!confirm(`Excluir "${ev.title}"?`)) return
    const res = await fetch(`/api/calendar/${ev.id}`, { method: "DELETE" })
    const result = await res.json()
    if (result.deleted) {
      toast.success("Evento excluído!")
      fetchEvents()
    } else {
      toast.error("Erro ao excluir")
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
                <Button size="sm" variant="outline" className="mt-2 w-full gap-1" onClick={() => openNewEvent(selectedDate)}>
                  <Plus className="h-3 w-3" /> Novo nesta data
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          {filteredEvents.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                {selectedDate ? "Nenhum evento nesta data." : "Nenhum evento encontrado."}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredEvents.map((ev) => (
                <Card key={ev.id}>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-3 h-3 rounded-full shrink-0 mt-0.5"
                          style={{ backgroundColor: ev.color || typeColors[ev.event_type] || "#3b82f6" }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{ev.title}</p>
                          {ev.reminders && ev.reminders.length > 0 && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Bell className="h-3 w-3" />
                              {ev.reminders.map((r) => {
                                const opt = reminderOptions.find((o) => o.value === r.minutesBefore)
                                return opt ? opt.label : `${r.minutesBefore}min`
                              }).join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Badge variant={statusMap[ev.status]?.variant || "outline"}>
                          {statusMap[ev.status]?.label || ev.status}
                        </Badge>
                        <button
                          onClick={() => openEdit(ev)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(ev)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5 ml-5">
                      {ev.description && <p>{ev.description}</p>}
                      {ev.location && <p>📍 {ev.location}</p>}
                      <p>Início: {formatDate(ev.start_at)}</p>
                      {ev.end_at && <p>Fim: {formatDate(ev.end_at)}</p>}
                    </div>
                    <div className="mt-2 ml-5 flex flex-wrap items-center gap-2">
                      <a
                        href={googleCalendarUrl(ev)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Adicionar ao Google Agenda
                      </a>
                      {ev.creator && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={ev.creator.avatar_url || undefined} alt={ev.creator.full_name || ""} />
                            <AvatarFallback className="text-[8px]">
                              <User className="h-3 w-3" />
                            </AvatarFallback>
                          </Avatar>
                          {ev.creator.full_name}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingEvent ? "Editar Evento" : "Novo Evento"}</DialogTitle></DialogHeader>
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
              <div className="flex gap-2">
                <Input type="date" value={startAt.slice(0, 10)} onChange={(e) => setStartAt(e.target.value + startAt.slice(10))} className="flex-1" />
                {!allDay && <Input type="time" value={startAt.slice(11, 16)} onChange={(e) => setStartAt(startAt.slice(0, 11) + e.target.value)} className="flex-1" />}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fim</Label>
              <div className="flex gap-2">
                <Input type="date" value={endAt.slice(0, 10)} onChange={(e) => setEndAt(e.target.value + endAt.slice(10))} className="flex-1" />
                {!allDay && <Input type="time" value={endAt.slice(11, 16)} onChange={(e) => setEndAt(endAt.slice(0, 11) + e.target.value)} className="flex-1" />}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Bell className="h-3.5 w-3.5" /> Lembretes</Label>
              <div className="space-y-1.5">
                {reminderOptions.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={reminderChecks.includes(opt.value)}
                      onCheckedChange={(c) => {
                        if (c) setReminderChecks((prev) => [...prev, opt.value])
                        else setReminderChecks((prev) => prev.filter((v) => v !== opt.value))
                      }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving || !title || !startAt} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingEvent ? "Salvar" : "Criar Evento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
