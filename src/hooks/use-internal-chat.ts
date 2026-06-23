"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  InternalConversation,
  InternalMessage,
  UserPresence,
  Profile,
} from "@/types";

export interface EmployeeWithPresence {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  status: "online" | "offline" | "away";
  last_seen_at: string;
}

export interface ChatConversation extends InternalConversation {
  other_user?: EmployeeWithPresence;
  last_message?: InternalMessage;
  unread_count: number;
}

export function useInternalChat(accountId: string | null, currentUserId: string | null) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [employees, setEmployees] = useState<EmployeeWithPresence[]>([]);
  const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const presenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeConvIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeConvIdRef.current = activeConversation?.id ?? null;
  }, [activeConversation]);

  const loadEmployees = useCallback(async () => {
    if (!accountId) return;
    const supabase = createClient();
    const { data: members } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, avatar_url, role, account_role")
      .eq("account_id", accountId)
      .in("account_role", ["admin", "agent", "owner"])
      .returns<(Profile & { account_role: string })[]>();

    if (!members) return;

    const { data: presence } = await supabase
      .from("user_presence")
      .select("*")
      .in("user_id", members.map((m) => m.user_id))
      .returns<UserPresence[]>();

    const presenceMap = new Map(
      (presence ?? []).map((p) => [p.user_id, p])
    );

    const enriched: EmployeeWithPresence[] = members.map((m) => {
      const p = presenceMap.get(m.user_id);
      return {
        user_id: m.user_id,
        full_name: m.full_name,
        email: m.email,
        avatar_url: m.avatar_url ?? null,
        role: m.account_role,
        status: p?.status ?? ("offline" as const),
        last_seen_at: p?.last_seen_at ?? "",
      };
    });

    enriched.sort((a, b) => {
      const order = { online: 0, away: 1, offline: 2 };
      return order[a.status] - order[b.status];
    });
    setEmployees(enriched);
  }, [accountId]);

  const updatePresence = useCallback(async (status: "online" | "away" | "offline") => {
    if (!currentUserId) return;
    const supabase = createClient();
    await supabase.from("user_presence").upsert(
      { user_id: currentUserId, last_seen_at: new Date().toISOString(), status },
      { onConflict: "user_id" }
    );
  }, [currentUserId]);

  const loadConversations = useCallback(async () => {
    if (!currentUserId) return;
    const supabase = createClient();

    const { data: myParticipants } = await supabase
      .from("internal_conversation_participants")
      .select("conversation_id, last_read_at")
      .eq("user_id", currentUserId);

    if (!myParticipants || myParticipants.length === 0) return;

    const convIds = myParticipants.map((p) => p.conversation_id);
    const lastReadMap = new Map(myParticipants.map((p) => [p.conversation_id, p.last_read_at]));

    const { data: convs } = await supabase
      .from("internal_conversations")
      .select("*")
      .in("id", convIds)
      .returns<InternalConversation[]>();

    if (!convs) return;

    const { data: allParticipants } = await supabase
      .from("internal_conversation_participants")
      .select("conversation_id, user_id")
      .in("conversation_id", convIds)
      .neq("user_id", currentUserId);

    const otherUserMap = new Map<string, string>();
    if (allParticipants) {
      for (const p of allParticipants) {
        if (!otherUserMap.has(p.conversation_id)) {
          otherUserMap.set(p.conversation_id, p.user_id);
        }
      }
    }

    const convList: ChatConversation[] = [];
    for (const conv of convs) {
      const otherUserId = otherUserMap.get(conv.id);
      const otherUser = employees.find((e) => e.user_id === otherUserId);
      const lastReadAt = lastReadMap.get(conv.id) ?? conv.created_at;

      const { data: lastMsg } = await supabase
        .from("internal_messages")
        .select("*")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .returns<InternalMessage[]>();

      const { count } = await supabase
        .from("internal_messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .gt("created_at", lastReadAt)
        .neq("sender_id", currentUserId);

      convList.push({
        ...conv,
        other_user: otherUser,
        last_message: lastMsg?.[0],
        unread_count: count ?? 0,
      });
    }

    convList.sort((a, b) => {
      const aTime = a.last_message?.created_at ?? a.created_at;
      const bTime = b.last_message?.created_at ?? b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    setConversations(convList);
  }, [currentUserId, employees]);

  useEffect(() => {
    if (conversations.length > 0 && employees.length > 0) {
      setConversations((prev) =>
        prev.map((c) => {
          const otherUserId = c.other_user?.user_id;
          if (!otherUserId) return c;
          const otherUser = employees.find((e) => e.user_id === otherUserId);
          return { ...c, other_user: otherUser ?? c.other_user };
        })
      );
    }
  }, [employees]);

  const loadMessages = useCallback(async (conversationId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("internal_messages")
      .select("*, sender:profiles!sender_id(*)")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .returns<InternalMessage[]>();
    setMessages(data ?? []);
  }, []);

  const sendMessage = useCallback(async (
    conversationId: string,
    content: string,
    media?: { url: string; type: string; name: string; size: number }
  ) => {
    if (!currentUserId) return;
    if (!content.trim() && !media) return;
    const supabase = createClient();

    const payload: Record<string, unknown> = {
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: content.trim() || (media ? media.name : ""),
    };
    if (media) {
      payload.media_url = media.url;
      payload.media_type = media.type;
      payload.media_name = media.name;
      payload.media_size = media.size;
    }

    const { data, error } = await supabase
      .from("internal_messages")
      .insert(payload)
      .select("*, sender:profiles!sender_id(*)")
      .single();

    if (error || !data) return;
    setMessages((prev) => [...prev, data as InternalMessage]);
    await supabase
      .from("internal_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
    await supabase
      .from("internal_conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", currentUserId);

    // Log to txt file
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const { data: participants } = await supabase
          .from("internal_conversation_participants")
          .select("user_id")
          .eq("conversation_id", conversationId)
          .neq("user_id", currentUserId);
        const receiverId = participants?.[0]?.user_id;
        if (receiverId) {
          const { data: receiverProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", receiverId)
            .single();
          const { data: senderProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", currentUserId)
            .single();
          if (senderProfile?.full_name && receiverProfile?.full_name) {
            fetch("/api/chat-log", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + session.access_token,
              },
              body: JSON.stringify({
                senderName: senderProfile.full_name,
                receiverName: receiverProfile.full_name,
                content: content.trim() || (media ? media.name : ""),
                mediaType: media?.type ?? "text",
              }),
            }).catch(() => {});
          }
        }
      }
    } catch {}
  }, [currentUserId]);

  const uploadFile = useCallback(async (file: File): Promise<{ url: string; type: string; name: string; size: number } | null> => {
    if (!currentUserId) return null;
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "";
    const fileName = currentUserId + "/" + Date.now() + "_" + Math.random().toString(36).slice(2) + "." + ext;
    const bucket = "internal-chat-files";

    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Upload failed:", error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return {
      url: urlData.publicUrl,
      type: file.type,
      name: file.name,
      size: file.size,
    };
  }, [currentUserId]);

  const getOrCreateConversation = useCallback(async (otherUserId: string): Promise<string | null> => {
    if (!currentUserId || !accountId) return null;
    const supabase = createClient();

    const { data: existing } = await supabase
      .rpc("find_internal_conversation", {
        p_user1: currentUserId,
        p_user2: otherUserId,
      });

    if (existing) {
      await loadMessages(existing);
      const existingConv = conversations.find((c) => c.id === existing);
      if (existingConv) {
        setActiveConversation(existingConv);
      } else {
        const { data: convData } = await supabase
          .from("internal_conversations")
          .select("*")
          .eq("id", existing)
          .single();
        if (convData) {
          const otherEmp = employees.find((e) => e.user_id === otherUserId);
          const minimalConv: ChatConversation = {
            ...convData,
            other_user: otherEmp,
            unread_count: 0,
          };
          setConversations((prev) => {
            if (prev.some((c) => c.id === existing)) return prev;
            return [minimalConv, ...prev];
          });
          setActiveConversation(minimalConv);
        }
      }
      return existing;
    }

    const { data: conv, error: convError } = await supabase
      .from("internal_conversations")
      .insert({ account_id: accountId })
      .select()
      .single();

    if (convError || !conv) return null;

    await supabase.from("internal_conversation_participants").insert([
      { conversation_id: conv.id, user_id: currentUserId },
      { conversation_id: conv.id, user_id: otherUserId },
    ]);

    const otherEmp = employees.find((e) => e.user_id === otherUserId);
    const newConv: ChatConversation = {
      ...conv,
      other_user: otherEmp,
      unread_count: 0,
    };

    setConversations((prev) => [newConv, ...prev]);
    setMessages([]);
    setActiveConversation(newConv);
    return conv.id;
  }, [currentUserId, accountId, conversations, employees, loadMessages]);

  const markAsRead = useCallback(async (conversationId: string) => {
    if (!currentUserId) return;
    const supabase = createClient();
    await supabase
      .from("internal_conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", currentUserId);

    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId ? { ...c, unread_count: 0 } : c
      )
    );
  }, [currentUserId]);

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!currentUserId) return;
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    try {
      await fetch("/api/internal-messages/" + messageId, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + session.access_token },
      });
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err) {
      console.error("Delete message error:", err);
    }
  }, [currentUserId]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!currentUserId) return;
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    try {
      await fetch("/api/internal-conversations/" + conversationId, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + session.access_token },
      });
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (activeConversation?.id === conversationId) {
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Delete conversation error:", err);
    }
  }, [currentUserId, activeConversation]);
  const clearMessages = useCallback(async (conversationId: string) => {
    if (!currentUserId) return;
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    try {
      await fetch("/api/internal-conversations/" + conversationId + "/clear", {
        method: "DELETE",
        headers: { Authorization: "Bearer " + session.access_token },
      });
      setMessages([]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, last_message: undefined } : c
        )
      );
    } catch (err) {
      console.error("Clear messages error:", err);
    }
  }, [currentUserId]);


  useEffect(() => {
    if (!currentUserId) return;
    updatePresence("online");
    presenceIntervalRef.current = setInterval(() => {
      updatePresence("online");
    }, 30000);

    const onVisibility = () => {
      updatePresence(document.visibilityState === "visible" ? "online" : "away");
    };
    document.addEventListener("visibilitychange", onVisibility);

    const onBeforeUnload = () => {
      navigator.sendBeacon
        ? navigator.sendBeacon("/api/presence/offline?userId=" + currentUserId)
        : updatePresence("offline");
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      if (presenceIntervalRef.current) clearInterval(presenceIntervalRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [currentUserId, updatePresence]);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);
  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }
    if (employees.length > 0) {
      loadConversations().then(() => setLoading(false));
    } else {
      const timer = setTimeout(() => setLoading(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [employees, currentUserId, loadConversations]);

  useEffect(() => {
    if (!currentUserId) return;
    const supabase = createClient();

    const channel = supabase
      .channel("internal-chat-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "internal_messages" },
        async (payload) => {
          const msg = payload.new as InternalMessage;
          if (activeConvIdRef.current === msg.conversation_id) {
            const { data: sender } = await supabase
              .from("profiles")
              .select("*")
              .eq("user_id", msg.sender_id)
              .single();
            setMessages((prev) => [...prev, { ...msg, sender: sender as Profile }]);
            markAsRead(msg.conversation_id);
          }
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id === msg.conversation_id) {
                return {
                  ...c,
                  last_message: msg,
                  updated_at: msg.created_at,
                  unread_count: activeConvIdRef.current === msg.conversation_id ? 0 : c.unread_count + 1,
                };
              }
              return c;
            })
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_presence" },
        (payload) => {
          const p = payload.new as UserPresence;
          setEmployees((prev) =>
            prev.map((e) =>
              e.user_id === p.user_id
                ? { ...e, status: p.status, last_seen_at: p.last_seen_at }
                : e
            )
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, markAsRead]);

  const handleSetActiveConversation = useCallback((conv: ChatConversation | null) => {
    setActiveConversation(conv);
    if (conv) {
      loadMessages(conv.id);
      markAsRead(conv.id);
    } else {
      setMessages([]);
    }
  }, [loadMessages, markAsRead]);

  return {
    conversations,
    employees,
    activeConversation,
    messages,
    loading,
    setActiveConversation: handleSetActiveConversation,
    sendMessage,
    uploadFile,
    getOrCreateConversation,
    loadMessages,
    markAsRead,
    deleteMessage,
    deleteConversation,
    clearMessages,
  };
}
