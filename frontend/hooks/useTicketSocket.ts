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
  attachment_url?: string | null;
  created_at: string;
}

interface TypingEvent {
  type: "typing";
  user_id: number;
  user_name: string;
  is_typing: boolean;
}

interface ReadReceiptEvent {
  type: "read_receipt";
  user_id: number;
  last_read_id: number;
}

type WsEvent = TicketUpdateEvent | MessageEvent | TypingEvent | ReadReceiptEvent;

export function useTicketSocket(
  ticketId: number,
  initialMessages: Message[],
  onTicketUpdate: (patch: Pick<Ticket, "status" | "agent_id">) => void,
  enabled: boolean = true,
  currentUserId?: number,
) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [typingText, setTypingText] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            setTypingText(null);
          } else if (ev.type === "ticket_update") {
            onTicketUpdate({ status: ev.status, agent_id: ev.agent_id });
          } else if (ev.type === "typing") {
            if (currentUserId && ev.user_id === currentUserId) return;
            if (ev.is_typing) {
              setTypingText(`${ev.user_name} is typing...`);
              if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
              typingTimerRef.current = setTimeout(() => {
                setTypingText(null);
              }, 3000);
            } else {
              setTypingText(null);
            }
          } else if (ev.type === "read_receipt") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id <= ev.last_read_id ? { ...m, is_read: true } : m
              )
            );
          }
        },
        () => {
          if (!unmounted) {
            timer = setTimeout(connect, 3000);
          }
        },
        () => {
          // On open, send read event to mark messages as read
          ws.send(JSON.stringify({ type: "read" }));
        }
      );
      wsRef.current = ws;
    }

    connect();

    return () => {
      unmounted = true;
      if (timer) clearTimeout(timer);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  // onTicketUpdate intentionally omitted — caller must memoize if needed
  // ponytail: add useCallback in parent if stale-closure bugs appear
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, enabled, currentUserId]);

  function send(body: string, attachmentUrl?: string) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "message", body, attachment_url: attachmentUrl }));
    }
  }

  function sendTyping(isTyping: boolean = true) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "typing", is_typing: isTyping }));
    }
  }

  function prependMessages(older: Message[]) {
    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const filtered = older.filter((m) => !existingIds.has(m.id));
      return [...filtered, ...prev];
    });
  }

  return { messages, send, sendTyping, typingText, prependMessages };
}
