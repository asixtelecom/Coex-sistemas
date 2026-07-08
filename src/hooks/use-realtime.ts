"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message, Conversation } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface RealtimeEvent<T> {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: T;
  old: Partial<T>;
}

interface UseRealtimeOptions {
  channelName: string;
  onMessageEvent?: (event: RealtimeEvent<Message>) => void;
  onConversationEvent?: (event: RealtimeEvent<Conversation>) => void;
  enabled?: boolean;
}

const POLL_INTERVAL_MS = 4000; // Poll every 4 seconds

export function useRealtime({
  channelName,
  onMessageEvent,
  onConversationEvent,
  enabled = true,
}: UseRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Store latest callbacks in refs to avoid stale closures
  const onMessageRef = useRef(onMessageEvent);
  const onConversationRef = useRef(onConversationEvent);
  useEffect(() => {
    onMessageRef.current = onMessageEvent;
    onConversationRef.current = onConversationEvent;
  });

  // Track the latest known timestamps for polling
  const lastMessageAtRef = useRef<string | null>(null);
  const lastConversationAtRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(false);

  const poll = useCallback(async () => {
    if (!isMountedRef.current) return;

    const supabase = createClient();

    try {
      // Poll for new messages
      let msgQuery = supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(20);

      if (lastMessageAtRef.current) {
        msgQuery = msgQuery.gt("created_at", lastMessageAtRef.current);
      } else {
        // On first poll, only get messages from the last 10 seconds to avoid
        // triggering notifications for old messages on page load
        const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
        msgQuery = msgQuery.gt("created_at", tenSecondsAgo);
      }

      const { data: newMessages } = await msgQuery;

      if (newMessages && newMessages.length > 0 && isMountedRef.current) {
        // Update the last known timestamp
        lastMessageAtRef.current = newMessages[newMessages.length - 1].created_at;

        // Fire INSERT events for each new message
        for (const msg of newMessages) {
          onMessageRef.current?.({
            eventType: "INSERT",
            new: msg as Message,
            old: {},
          });
        }
      }

      // Poll for new/updated conversations
      let convQuery = supabase
        .from("conversations")
        .select("*, contact:contacts(*)")
        .order("last_message_at", { ascending: false })
        .limit(10);

      if (lastConversationAtRef.current) {
        convQuery = convQuery.gt("updated_at", lastConversationAtRef.current);
      } else {
        const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
        convQuery = convQuery.gt("updated_at", tenSecondsAgo);
      }

      const { data: newConvs } = await convQuery;

      if (newConvs && newConvs.length > 0 && isMountedRef.current) {
        lastConversationAtRef.current = new Date().toISOString();

        for (const conv of newConvs) {
          onConversationRef.current?.({
            eventType: "UPDATE",
            new: conv as Conversation,
            old: {},
          });
        }
      }
    } catch (err) {
      // Silently ignore polling errors (network blips, etc.)
      console.warn("[useRealtime] poll error:", err);
    }

    // Schedule next poll
    if (isMountedRef.current) {
      pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    isMountedRef.current = true;

    // Also try Supabase Realtime WebSocket as primary (best-effort)
    // It may work in some environments. Polling is the reliable fallback.
    const supabase = createClient();

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          // If realtime works, update our last-seen timestamp so polling
          // doesn't duplicate the same event
          if (payload.new && (payload.new as Message).created_at) {
            lastMessageAtRef.current = (payload.new as Message).created_at;
          }
          onMessageRef.current?.({
            eventType: payload.eventType as RealtimeEvent<Message>["eventType"],
            new: payload.new as Message,
            old: payload.old as Partial<Message>,
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        (payload) => {
          onConversationRef.current?.({
            eventType: payload.eventType as RealtimeEvent<Conversation>["eventType"],
            new: payload.new as Conversation,
            old: payload.old as Partial<Conversation>,
          });
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    // Start polling immediately as the reliable mechanism
    // Small initial delay so the component has time to mount and set up state
    pollTimerRef.current = setTimeout(poll, 1000);

    return () => {
      isMountedRef.current = false;
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      supabase.removeChannel(channel);
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [channelName, enabled, poll]);

  const unsubscribe = useCallback(() => {
    isMountedRef.current = false;
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (channelRef.current) {
      const supabase = createClient();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setIsConnected(false);
    }
  }, []);

  return { isConnected, unsubscribe };
}
