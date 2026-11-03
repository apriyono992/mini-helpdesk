"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useTicketSocket } from "@/hooks/useTicketSocket";
import { ChatPanel } from "@/components/ChatPanel";
import { TicketInfoPanel } from "@/components/TicketInfoPanel";
import type { Ticket, Message } from "@/lib/types";


export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const ticketId = Number(id);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (authLoading) return;
    Promise.all([api.tickets.get(ticketId), api.tickets.messages(ticketId)])
      .then(([t, msgs]) => {
        setTicket(t);
        setInitialMessages(msgs);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [authLoading, user, ticketId, router]);

  const { messages, send } = useTicketSocket(ticketId, initialMessages);

  if (authLoading || loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading…</div>;
  }
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }
  if (!ticket || !user) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-4 h-screen flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push("/tickets")}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back
        </button>
        <h1 className="text-lg font-semibold truncate">{ticket.subject}</h1>
      </div>
      <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">
        <div className="flex-1 border rounded-lg bg-white shadow-sm overflow-hidden flex flex-col">
          <ChatPanel
            messages={messages}
            currentUser={user}
            isClosed={ticket.status === "closed"}
            onSend={send}
          />
        </div>
        <div className="md:w-64 shrink-0">
          <TicketInfoPanel
            ticket={ticket}
            currentUser={user}
            onStatusChange={setTicket}
          />
        </div>
      </div>
    </div>
  );
}
