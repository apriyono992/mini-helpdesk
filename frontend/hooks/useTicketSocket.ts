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
) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = createTicketSocket(ticketId, (data) => {
      const ev = data as WsEvent;
      if (ev.type === "message") {
        setMessages((prev) => [...prev, ev]);
      } else if (ev.type === "ticket_update") {
        onTicketUpdate({ status: ev.status, agent_id: ev.agent_id });
      }
    });
    wsRef.current = ws;
    return () => ws.close();
  // onTicketUpdate intentionally omitted — caller must memoize if needed
  // ponytail: add useCallback in parent if stale-closure bugs appear
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  function send(body: string) {
    wsRef.current?.send(JSON.stringify({ body }));
  }

  return { messages, send };
}
