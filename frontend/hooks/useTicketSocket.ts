"use client";
import { useEffect, useRef, useState } from "react";
import { createTicketSocket } from "@/lib/ws";
import type { Message } from "@/lib/types";

export function useTicketSocket(ticketId: number, initialMessages: Message[]) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = createTicketSocket(
      ticketId,
      (data) => {
        const d = data as { type: string } & Message;
        if (d.type === "message") {
          setMessages((prev) => [...prev, d]);
        }
      },
    );
    wsRef.current = ws;
    return () => ws.close();
  }, [ticketId]);

  function send(body: string) {
    wsRef.current?.send(JSON.stringify({ body }));
  }

  return { messages, send };
}
