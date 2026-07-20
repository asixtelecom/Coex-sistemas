"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Bell,
  MessageSquare,
  Calendar,
  Loader2,
  ExternalLink,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UnreadChat {
  conversationId: string;
  senderName: string;
  senderAvatar: string | null;
  content: string;
  createdAt: string;
}

interface UpcomingAppointment {
  id: string;
  title: string;
  startAt: string;
  location: string | null;
  status: string;
}

export function NotificationBell() {
  const { user, accountId, accountRole } = useAuth();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "agenda">("chat");
  const [loading, setLoading] = useState(false);
  const [unreadChats, setUnreadChats] = useState<UnreadChat[]>([]);
  const [appointments, setAppointments] = useState<UpcomingAppointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<UpcomingAppointment | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Fetch unread chats
  const fetchUnreadChats = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: participants } = await supabase
        .from("internal_conversation_participants")
        .select("conversation_id, last_read_at")
        .eq("user_id", user.id);

      if (!participants || participants.length === 0) {
        setUnreadChats([]);
        return;
      }

      const convIds = participants.map((p) => p.conversation_id);
      const lastReadMap = new Map(
        participants.map((p) => [p.conversation_id, p.last_read_at])
      );

      const { data: messages } = await supabase
        .from("internal_messages")
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          created_at,
          sender:profiles!sender_id (
            full_name,
            avatar_url
          )
        `)
        .in("conversation_id", convIds)
        .neq("sender_id", user.id)
        .order("created_at", { ascending: false });

      if (!messages) {
        setUnreadChats([]);
        return;
      }

      const unreadFiltered: UnreadChat[] = [];
      const processedConvs = new Set<string>();

      for (const msg of messages) {
        if (processedConvs.has(msg.conversation_id)) continue;
        const lastRead = lastReadMap.get(msg.conversation_id);
        const isUnread = !lastRead || new Date(msg.created_at) > new Date(lastRead);
        if (isUnread) {
          processedConvs.add(msg.conversation_id);
          const senderInfo = msg.sender as any;
          unreadFiltered.push({
            conversationId: msg.conversation_id,
            senderName: senderInfo?.full_name ?? "Colega",
            senderAvatar: senderInfo?.avatar_url ?? null,
            content: msg.content ?? "[Mídia]",
            createdAt: msg.created_at,
          });
        }
      }

      setUnreadChats(unreadFiltered);
    } catch (err) {
      console.error("Error fetching unread chats:", err);
    }
  }, [user, supabase]);

  // Fetch appointments
  const fetchAppointments = useCallback(async () => {
    if (!accountId) return;
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      let query = supabase
        .from("calendar_events")
        .select("id, title, start_at, location, status, created_by")
        .eq("account_id", accountId)
        .eq("deleted", false)
        .gte("start_at", todayStart.toISOString())
        .lte("start_at", todayEnd.toISOString());

      if (accountRole !== "admin" && accountRole !== "owner" && user?.id) {
        query = query.eq("created_by", user.id);
      }

      const { data: events } = await query.order("start_at", { ascending: true });

      if (events) {
        setAppointments(
          events.map((e) => ({
            id: e.id,
            title: e.title,
            startAt: e.start_at,
            location: e.location,
            status: e.status,
          }))
        );
      }
    } catch (err) {
      console.error("Error fetching appointments:", err);
    }
  }, [accountId, accountRole, user, supabase]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchUnreadChats(), fetchAppointments()]);
    setLoading(false);
  }, [fetchUnreadChats, fetchAppointments]);

  // Request browser notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  // Show a native browser notification
  const showBrowserNotification = useCallback((senderName: string, content: string, conversationId: string) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    // Only notify if page is hidden/in background
    const notif = new Notification(`💬 ${senderName}`, {
      body: content,
      icon: "/favicon.ico",
      tag: `internal-chat-${conversationId}`,
      requireInteraction: false,
      silent: false,
    });
    notif.onclick = () => {
      window.focus();
      window.dispatchEvent(
        new CustomEvent("open-internal-chat", { detail: { conversationId } })
      );
      notif.close();
    };
    // Auto-close after 5s
    setTimeout(() => notif.close(), 5000);
  }, []);

  // Realtime + polling
  useEffect(() => {
    if (!user?.id) return;
    loadData();

    const channel = supabase
      .channel("notification-bell-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "internal_messages" }, async (payload) => {
        const msg = payload.new;
        if (msg.sender_id !== user.id) {
          fetchUnreadChats();
          // Fetch sender name for notification
          try {
            const { data: sender } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", msg.sender_id)
              .single();
            const senderName = sender?.full_name ?? "Colega";
            const content = msg.content ?? "[Mídia]";
            showBrowserNotification(senderName, content, msg.conversation_id);
          } catch {
            showBrowserNotification("Colega", msg.content ?? "[Mídia]", msg.conversation_id);
          }
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "calendar_events" }, () => {
        fetchAppointments();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "calendar_events" }, () => {
        fetchAppointments();
      })
      .subscribe();

    const interval = setInterval(() => {
      fetchUnreadChats();
      fetchAppointments();
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user, loadData, fetchUnreadChats, fetchAppointments, showBrowserNotification, supabase]);

  const handleChatClick = (conversationId: string) => {
    setOpen(false);
    window.dispatchEvent(
      new CustomEvent("open-internal-chat", { detail: { conversationId } })
    );
  };

  const pendingAppointments = appointments.filter(
    (a) => a.status === "scheduled" || a.status === "confirmed"
  );
  const totalCount = unreadChats.length + pendingAppointments.length;

  return (
    <div ref={wrapperRef} className="relative">
      {/* Bell trigger button */}
      <button
        type="button"
        aria-label="Notificações"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-5 w-5" />
        {totalCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-background animate-pulse">
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-12 z-[200] w-80 rounded-lg border border-border bg-popover text-popover-foreground shadow-xl overflow-hidden"
          style={{ animation: "fadeIn 0.15s ease" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h3 className="font-semibold text-sm">Notificações</h3>
            <div className="flex items-center gap-2">
              {totalCount > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  {totalCount} pendente{totalCount !== 1 ? "s" : ""}
                </span>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border bg-muted/40">
            <button
              type="button"
              onClick={() => setActiveTab("chat")}
              className={cn(
                "flex-1 py-2 text-xs font-medium border-b-2 flex items-center justify-center gap-1.5 transition-colors",
                activeTab === "chat"
                  ? "border-primary text-primary bg-background"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Chat Interno
              {unreadChats.length > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 rounded-full">
                  {unreadChats.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("agenda")}
              className={cn(
                "flex-1 py-2 text-xs font-medium border-b-2 flex items-center justify-center gap-1.5 transition-colors",
                activeTab === "agenda"
                  ? "border-primary text-primary bg-background"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Calendar className="h-3.5 w-3.5" />
              Agenda Hoje
              {pendingAppointments.length > 0 && (
                <span className="bg-primary text-primary-foreground text-[9px] font-bold px-1.5 rounded-full">
                  {pendingAppointments.length}
                </span>
              )}
            </button>
          </div>

          {/* Content */}
          <div className="max-h-72 overflow-y-auto divide-y divide-border">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!loading && activeTab === "chat" && (
              <>
                {unreadChats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                    <MessageSquare className="h-8 w-8 text-muted-foreground mb-2 opacity-40" />
                    <p className="text-xs text-muted-foreground">Nenhuma mensagem não lida</p>
                  </div>
                ) : (
                  unreadChats.map((chat) => (
                    <button
                      key={chat.conversationId}
                      type="button"
                      onClick={() => handleChatClick(chat.conversationId)}
                      className="w-full text-left p-3 hover:bg-muted/40 transition-colors flex gap-3 items-start"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0 overflow-hidden border border-border">
                        {chat.senderAvatar ? (
                          <img src={chat.senderAvatar} alt={chat.senderName} className="h-full w-full object-cover" />
                        ) : (
                          chat.senderName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <span className="font-medium text-xs truncate pr-2 text-foreground">
                            {chat.senderName}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {format(new Date(chat.createdAt), "HH:mm")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{chat.content}</p>
                      </div>
                    </button>
                  ))
                )}
              </>
            )}

            {!loading && activeTab === "agenda" && (
              <>
                {appointments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                    <Calendar className="h-8 w-8 text-muted-foreground mb-2 opacity-40" />
                    <p className="text-xs text-muted-foreground">Nenhum compromisso hoje</p>
                  </div>
                ) : (
                  appointments.map((evt) => (
                    <div key={evt.id} className="p-3 hover:bg-muted/10 flex gap-2.5 items-start justify-between">
                      <div 
                        onClick={() => {
                          setSelectedAppointment(evt);
                          setOpen(false);
                        }}
                        className="flex-1 min-w-0 cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={cn(
                              "w-2 h-2 rounded-full shrink-0",
                              evt.status === "confirmed" ? "bg-emerald-500" :
                              evt.status === "cancelled" ? "bg-red-500" :
                              evt.status === "completed" ? "bg-slate-500" : "bg-blue-500"
                            )}
                          />
                          <span className="font-medium text-xs text-foreground truncate hover:underline">{evt.title}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground space-y-0.5">
                          <p>{format(new Date(evt.startAt), "HH:mm", { locale: ptBR })}</p>
                          {evt.location && <p className="truncate">📍 {evt.location}</p>}
                        </div>
                      </div>
                      <a
                        href="/agenda"
                        onClick={() => setOpen(false)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded shrink-0"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  ))
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {activeTab === "agenda" && (
            <div className="p-2 bg-muted/20 border-t border-border text-center">
              <a
                href="/agenda"
                onClick={() => setOpen(false)}
                className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
              >
                Ver agenda completa
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Centered Popup for selected appointment */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in-0 duration-200">
          <div className="bg-card text-card-foreground w-full max-w-md rounded-xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/20">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Detalhes do Agendamento
              </h3>
              <button 
                onClick={() => setSelectedAppointment(null)}
                className="text-muted-foreground hover:text-foreground rounded-lg p-1 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              <div>
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Título</span>
                <p className="text-sm font-semibold text-foreground mt-0.5">{selectedAppointment.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Data e Horário</span>
                  <p className="text-sm font-medium text-foreground mt-0.5">
                    {format(new Date(selectedAppointment.startAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Status</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        selectedAppointment.status === "confirmed" ? "bg-emerald-500" :
                        selectedAppointment.status === "cancelled" ? "bg-red-500" :
                        selectedAppointment.status === "completed" ? "bg-slate-500" : "bg-blue-500"
                      )}
                    />
                    <span className="text-xs font-medium text-foreground capitalize">
                      {selectedAppointment.status === "confirmed" ? "Confirmado" :
                       selectedAppointment.status === "cancelled" ? "Cancelado" :
                       selectedAppointment.status === "completed" ? "Concluído" : "Pendente"}
                    </span>
                  </div>
                </div>
              </div>

              {selectedAppointment.location && (
                <div>
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">📍 Localização / Endereço</span>
                  <p className="text-sm mt-0.5 whitespace-pre-wrap">
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedAppointment.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                    >
                      {selectedAppointment.location}
                      <ExternalLink className="h-3.5 w-3.5 inline shrink-0" />
                    </a>
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-muted/10 border-t border-border px-5 py-3 flex justify-end gap-2">
              <button
                onClick={() => setSelectedAppointment(null)}
                className="text-xs px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted font-medium transition-colors"
              >
                Fechar
              </button>
              <a
                href="/agenda"
                onClick={() => {
                  setSelectedAppointment(null);
                  setOpen(false);
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors inline-flex items-center gap-1"
              >
                Ver na agenda completa
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
