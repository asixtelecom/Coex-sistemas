"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Conversation, ConversationStatus, Profile } from "@/types";
import { Search, ChevronDown, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";

interface ConversationListProps {
  activeConversationId: string | null;
  onSelect: (conversation: Conversation) => void;
  conversations: Conversation[];
  onConversationsLoaded: (conversations: Conversation[]) => void;
  onAssignChange: (conversationId: string, agentId: string | null) => void;
  /**
   * Increment to force the fetch effect below to refire. The parent
   * bumps this on realtime reconnect / tab visibility → visible so the
   * list catches up on any events sent while the WS was disconnected
   * or the tab was throttled. Optional so existing callers keep working.
   */
  resyncToken?: number;
  /** Called when the active conversation is hidden by a filter change. */
  onDeselect?: () => void;
}

const STATUS_COLORS: Record<ConversationStatus, string> = {
  open: "bg-primary",
  pending: "bg-amber-500",
  closed: "bg-muted-foreground",
};

type InboxFilter = ConversationStatus | "all" | "unread";

type ChannelFilter = "all" | "whatsapp" | "instagram" | "messenger" | "telegram" | "webchat" | "linkedin";

function ChannelIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case "whatsapp":
      return (
        <svg viewBox="0 0 24 24" className={cn("h-4 w-4", className)} fill="#25D366">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" className={cn("h-4 w-4", className)} fill="url(#ig-gradient)">
          <defs>
            <linearGradient id="ig-gradient" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#FFDC80" />
              <stop offset="25%" stopColor="#F77737" />
              <stop offset="50%" stopColor="#E1306C" />
              <stop offset="75%" stopColor="#C13584" />
              <stop offset="100%" stopColor="#833AB4" />
            </linearGradient>
          </defs>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
        </svg>
      );
    case "messenger":
      return (
        <svg viewBox="0 0 24 24" className={cn("h-4 w-4", className)} fill="#0084FF">
          <path d="M12 0C5.373 0 0 4.975 0 11.111c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.974 12-11.111C24 4.975 18.627 0 12 0zm1.193 14.963l-3.056-3.259-5.963 3.259L10.732 8.4l3.131 3.259L19.752 8.4l-6.559 6.563z"/>
        </svg>
      );
    case "telegram":
      return (
        <svg viewBox="0 0 24 24" className={cn("h-4 w-4", className)} fill="#0088cc">
          <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      );
    case "linkedin":
      return (
        <svg viewBox="0 0 24 24" className={cn("h-4 w-4", className)} fill="#0A66C2">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      );
    default:
      return <span className={cn("h-4 w-4 flex items-center justify-center text-xs", className)}>🌐</span>;
  }
}

const FILTER_OPTIONS: { label: string; value: InboxFilter }[] = [
  { label: "Todas", value: "all" },
  { label: "Não lidas", value: "unread" },
  { label: "Abertas", value: "open" },
  { label: "Pendentes", value: "pending" },
  { label: "Fechadas", value: "closed" },
];

export function ConversationList({
  activeConversationId,
  onSelect,
  conversations,
  onConversationsLoaded,
  onAssignChange,
  resyncToken = 0,
  onDeselect,
}: ConversationListProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const { account } = useAuth();

  // Keep the latest callback in a ref so the fetch effect below can
  // have a stable, empty-dep identity. Previously the fetch useCallback
  // depended on `onConversationsLoaded`, which depends on the parent's
  // `deepLinkConvId` — so every URL change (including one the parent
  // triggered via router.replace after a click) caused a fresh
  // conversations fetch. That extra refetch was the trigger for the
  // deep-link auto-select running a second time and wiping the active
  // thread's messages.
  // Mutation lives in an effect (not render) per React 19's refs rule;
  // the fetch runs once on mount so it's fine to read the slightly
  // older value — the very next render updates the ref for any
  // subsequent async completion.
  const onConversationsLoadedRef = useRef(onConversationsLoaded);
  useEffect(() => {
    onConversationsLoadedRef.current = onConversationsLoaded;
  });

  useEffect(() => {
    if (!account?.id) return;
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("account_id", account.id);

      if (cancelled) return;

      if (error) {
        console.error("Failed to fetch profiles:", error);
        return;
      }

      setProfiles(data ?? []);
    })();

    return () => {
      cancelled = true;
    };
  }, [account?.id]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*, contact:contacts(*), channel:channels(*), assigned_agent:profiles!conversations_assigned_agent_id_fkey(*)")
        .order("last_message_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        // Supabase errors have non-enumerable properties — log fields explicitly
        console.error("Failed to fetch conversations:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        setLoading(false);
        return;
      }

      onConversationsLoadedRef.current(data ?? []);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // `resyncToken` is included so the parent can force a refetch when
    // the realtime channel reconnects or the tab regains focus — catches
    // up on any events sent while the WS was disconnected or throttled.
  }, [resyncToken]);

  const filtered = useMemo(() => {
    let result = conversations;

    if (filter === "unread") {
      result = result.filter((c) => c.unread_count > 0);
    } else if (filter !== "all") {
      result = result.filter((c) => c.status === filter);
    }

    if (channelFilter !== "all") {
      result = result.filter((c) => c.channel?.type === channelFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) => {
        const name = c.contact?.name?.toLowerCase() ?? "";
        const phone = c.contact?.phone?.toLowerCase() ?? "";
        const lastMsg = c.last_message_text?.toLowerCase() ?? "";
        return name.includes(q) || phone.includes(q) || lastMsg.includes(q);
      });
    }

    return result;
  }, [conversations, filter, channelFilter, search]);

  // When the channel filter changes, close the active thread if it no
  // longer belongs to the selected channel so list + thread stay in sync.
  useEffect(() => {
    if (!activeConversationId || channelFilter === "all" || !onDeselect) return;
    const active = conversations.find((c) => c.id === activeConversationId);
    if (active && active.channel?.type !== channelFilter) {
      onDeselect();
    }
  }, [channelFilter, activeConversationId, conversations, onDeselect]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    []
  );

  const handleSelect = useCallback(
    (conv: Conversation) => {
      onSelect(conv);
    },
    [onSelect]
  );

  const activeFilter = FILTER_OPTIONS.find((o) => o.value === filter);

  return (
    // w-full on mobile so the list occupies the whole viewport when it's
    // the single pane showing; fixed 320px on desktop where it shares the
    // row with the thread + contact sidebar.
    <div className="flex h-full w-full flex-col border-r border-border bg-card lg:w-80">
      {/* Search + Filter */}
      <div className="space-y-2 border-b border-border p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={handleSearchChange}
            placeholder="Pesquisar conversas..."
            className="border-border bg-muted pl-9 text-sm text-foreground placeholder-muted-foreground focus:border-primary/50"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-muted">
              {activeFilter?.label ?? "All"}
              <ChevronDown className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="border-border bg-popover"
          >
            {FILTER_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={cn(
                  "text-sm",
                  filter === opt.value
                    ? "text-primary"
                    : "text-popover-foreground"
                )}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Channel filter */}
        <div className="flex gap-1 flex-wrap">
          {(["whatsapp", "instagram", "messenger", "telegram", "webchat", "linkedin"] as const).map((ch) => (
            <button
              key={ch}
              onClick={() => setChannelFilter(ch)}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors",
                channelFilter === ch
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <>
                <ChannelIcon type={ch} />
                <span>
                  {ch === "whatsapp"
                    ? "WhatsApp"
                    : ch === "webchat"
                      ? "Webchat"
                      : ch === "linkedin"
                        ? "LinkedIn"
                        : ch.charAt(0).toUpperCase() + ch.slice(1)}
                </span>
              </>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Items.
          `min-h-0` is load-bearing: a flex child defaults to
          min-height:auto, so without it this ScrollArea grows to fit
          every conversation instead of shrinking to the remaining
          space — the list then overflows and gets clipped by the
          parent's overflow-hidden with no scrollbar (issue #229). */}
      <ScrollArea className="min-h-0 flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {filtered.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeConversationId}
                onSelect={handleSelect}
                profiles={profiles}
                onAssignChange={onAssignChange}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface ConversationItemProps {
  conversation: Conversation & { assigned_agent?: Profile };
  isActive: boolean;
  onSelect: (conversation: Conversation) => void;
  profiles: Profile[];
  onAssignChange: (conversationId: string, agentId: string | null) => void;
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
  profiles,
  onAssignChange,
}: ConversationItemProps) {
  const contact = conversation.contact;
  const displayName = contact?.name || contact?.phone || "Desconhecido";
  const initials = displayName.charAt(0).toUpperCase();
  const assignedAgent = conversation.assigned_agent;

  const handleClick = useCallback(() => {
    onSelect(conversation);
  }, [onSelect, conversation]);

  const handleAssignAgent = useCallback(
    (e: React.MouseEvent, agentId: string | null) => {
      e.stopPropagation();
      onAssignChange(conversation.id, agentId);
    },
    [conversation.id, onAssignChange]
  );

  const timeAgo = conversation.last_message_at
    ? formatDistanceToNow(new Date(conversation.last_message_at), {
        addSuffix: false,
      })
    : "";

  return (
    <div className="flex flex-col">
      <button
        onClick={handleClick}
        className={cn(
          "flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50",
          isActive && "border-l-2 border-primary bg-muted/70"
        )}
      >
        {/* Avatar */}
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground">
          {contact?.avatar_url ? (
            <img
              src={contact.avatar_url}
              alt={displayName}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            initials
          )}
          {conversation.channel?.type && (
            <span
              className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background p-0.5 shadow-sm"
              title={conversation.channel.type}
            >
              <ChannelIcon type={conversation.channel.type} className="h-3 w-3" />
            </span>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium text-foreground">
              {displayName}
            </span>
            <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo}</span>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <p className="truncate text-xs text-muted-foreground">
              {conversation.last_message_text || "Nenhuma mensagem ainda"}
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              {conversation.unread_count > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {conversation.unread_count}
                </span>
              )}
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  STATUS_COLORS[conversation.status]
                )}
                title={conversation.status}
              />
            </div>
          </div>
        </div>
      </button>

      {/* Agent Assignment Badge */}
      <div className="px-3 pb-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full transition-colors",
              assignedAgent
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            <User className="h-3 w-3" />
            <span>
              {assignedAgent?.full_name || assignedAgent?.email || "Atribuir agente"}
            </span>
            <ChevronDown className="h-2 w-2" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="border-border bg-popover">
            <DropdownMenuItem
              onClick={(e) => handleAssignAgent(e, null)}
              className="text-sm"
            >
              Sem atribuição
            </DropdownMenuItem>
            {profiles.map((profile) => (
              <DropdownMenuItem
                key={profile.user_id}
                onClick={(e) => handleAssignAgent(e, profile.user_id)}
                className="text-sm"
              >
                {profile.full_name || profile.email}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
