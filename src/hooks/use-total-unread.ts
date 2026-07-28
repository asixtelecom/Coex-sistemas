"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Conversation } from "@/types";

/**
 * Count of conversations with at least one unread inbound message for
 * the current user. Used by the sidebar to surface a green dot on the
 * Inbox nav entry when the user is elsewhere in the app.
 *
 * Lives on its own realtime channel (distinct from the inbox page's
 * "inbox-realtime") so both can coexist without sharing state.
 */
export function useTotalUnread(
  excludeConversationId?: string | null,
): number {
  const [total, setTotal] = useState(0);

  const excludeRef = useRef(excludeConversationId);
  useEffect(() => {
    excludeRef.current = excludeConversationId;
  });

  const countsRef = useRef<Map<string, number>>(new Map());

  const recompute = useCallback(() => {
    const map = countsRef.current;
    const excludeId = excludeRef.current;
    let sum = 0;
    for (const [id, n] of map) {
      if (n > 0 && id !== excludeId) sum += 1;
    }
    setTotal(sum);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, unread_count");
      if (cancelled || error || !data) return;

      const map = new Map<string, number>();
      for (const row of data as { id: string; unread_count: number }[]) {
        map.set(row.id, row.unread_count ?? 0);
      }
      countsRef.current = map;
      recompute();
    })();

    const channel = supabase
      .channel("total-unread-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        (payload) => {
          const map = countsRef.current;
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as Partial<Conversation>;
            if (oldRow.id) map.delete(oldRow.id);
          } else {
            const row = payload.new as Conversation;
            map.set(row.id, row.unread_count ?? 0);
          }
          recompute();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [recompute]);

  return total;
}
