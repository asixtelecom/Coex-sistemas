"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, MessageSquare, X, Loader2, Check, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Conversation, Message } from "@/types";

interface ForwardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: Message | null;
  currentConversationId?: string;
  onForwarded?: (targetId: string) => void;
}

export function ForwardModal({
  open,
  onOpenChange,
  message,
  currentConversationId,
  onForwarded,
}: ForwardModalProps) {
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setConversations([]);
      setSelected(null);
      setSending(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("conversations")
      .select("*, contact:contacts(*), channel:channels(*)")
      .order("last_message_at", { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (!error && data) setConversations(data as Conversation[]);
        setLoading(false);
      });
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((c) => {
      const name = c.contact?.full_name?.toLowerCase() || "";
      const phone = c.contact?.phone?.toLowerCase() || "";
      const channel = c.channel?.name?.toLowerCase() || "";
      return name.includes(q) || phone.includes(q) || channel.includes(q);
    });
  }, [conversations, search]);

  const handleConfirm = useCallback(async () => {
    if (!message || !selected || sending) return;
    setSending(true);

    try {
      const supabase = createClient();

      const contentText =
        message.content_type === "document"
          ? message.content_text || "Documento"
          : message.content_text || "";

      const { error: msgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: selected.id,
          sender_type: "agent",
          content_type: message.content_type,
          content_text: contentText,
          media_url: message.media_url || null,
          status: "sent",
          reply_to_message_id: null,
        })
        .select()
        .single();

      if (msgError) {
        console.error("Forward insert error:", msgError);
        toast.error("Erro ao encaminhar mensagem");
        setSending(false);
        return;
      }

      await supabase
        .from("conversations")
        .update({
          last_message_text: `[↗] ${contentText}`,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", selected.id);

      const channelType = selected.channel?.type;
      if (channelType === "whatsapp" && selected.channel?.config) {
        const phone = selected.contact?.phone;
        if (phone) {
          try {
            const payload: Record<string, unknown> = {
              conversation_id: selected.id,
              message_type: message.content_type === "text" ? "text" : message.content_type,
              content_text: contentText,
            };
            if (message.media_url) payload.media_url = message.media_url;
            if (message.content_type === "document" && message.content_text) {
              payload.filename = message.content_text;
            }
            await fetch("/api/whatsapp/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
          } catch (err) {
            console.error("WhatsApp forward error:", err);
          }
        }
      }

      toast.success(
        `Encaminhado para ${selected.contact?.full_name || "contato"}`,
      );
      onForwarded?.(selected.id);
      onOpenChange(false);
    } catch (err) {
      console.error("Forward error:", err);
      toast.error("Erro ao encaminhar");
    } finally {
      setSending(false);
    }
  }, [message, selected, sending, onForwarded, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="text-base font-semibold">
            Encaminhar mensagem
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contato..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            autoFocus
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="rounded-full p-0.5 hover:bg-muted"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Conversation list */}
        <div className="max-h-[340px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageSquare className="mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">Nenhuma conversa encontrada</p>
            </div>
          ) : (
            filtered.map((conv) => {
              if (conv.id === currentConversationId) return null;
              const name = conv.contact?.full_name || conv.contact?.phone || "Desconhecido";
              const phone = conv.contact?.phone || "";
              const channelIcon =
                conv.channel?.type === "whatsapp" ? "💬"
                : conv.channel?.type === "instagram" ? "📸"
                : conv.channel?.type === "messenger" ? "🔵"
                : conv.channel?.type === "telegram" ? "✈️"
                : conv.channel?.type === "webchat" ? "🌐"
                : conv.channel?.type === "tiktok" ? "🎵"
                : conv.channel?.type === "youtube" ? "▶️"
                : "💬";
              const isSelected = selected?.id === conv.id;

              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => setSelected(isSelected ? null : conv)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                    isSelected
                      ? "bg-primary/10 border-l-2 border-primary"
                      : "hover:bg-muted/50 border-l-2 border-transparent",
                  )}
                >
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}>
                    {isSelected ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground truncate">
                        {name}
                      </span>
                      <span className="text-xs">{channelIcon}</span>
                    </div>
                    {phone && (
                      <p className="truncate text-xs text-muted-foreground">
                        {phone}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Confirm button */}
        {selected && (
          <div className="border-t border-border px-4 py-3">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={sending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Encaminhar para {selected.contact?.full_name || "contato"}
                </>
              )}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
