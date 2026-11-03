"use client";
import { useEffect, useRef, useState } from "react";
import { createTicketSocket } from "@/lib/ws";
import type { Message, Ticket } from "@/lib/types";

interface TicketUpdateEvent {
  type: "ticket_update";
  id: number;
  status: Ticket["status"];
  agent_id: number | null;
}

interface MessageEvent {
  type: "message";
  id: number;
  ticket_id: number;
  sender_id: number;
  body: string;
  created_at: string;
}

type WsEvent = TicketUpdateEvent | MessageEvent;

export function useTicketSocket(
  ticketId: number,
  initialMessages: Message[],
  onTicketUpdate: (patch: Pick<Ticket, "status" | "agent_id">) => void,
  enabled: boolean = true,
) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (!enabled || !ticketId) return;

    let unmounted = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function connect() {
      if (unmounted) return;
      const ws = createTicketSocket(
        ticketId,
        (data) => {
          const ev = data as WsEvent;
          if (ev.type === "message") {
            setMessages((prev) => (prev.some((m) => m.id === ev.id) ? prev : [...prev, ev]));
          } else if (ev.type === "ticket_update") {
            onTicketUpdate({ status: ev.status, agent_id: ev.agent_id });
          }
        },
        () => {
          if (!unmounted) {
            timer = setTimeout(connect, 3000);
          }
        }
      );
      wsRef.current = ws;
    }

    connect();

    return () => {
      unmounted = true;
      if (timer) clearTimeout(timer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  // onTicketUpdate intentionally omitted — caller must memoize if needed
  // ponytail: add useCallback in parent if stale-closure bugs appear
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, enabled]);

  function send(body: string) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ body }));
    }
  }

  function prependMessages(older: Message[]) {
    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const filtered = older.filter((m) => !existingIds.has(m.id));
      return [...filtered, ...prev];
    });
  }

  return { messages, send, prependMessages };
}
