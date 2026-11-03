"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useTicketSocket } from "@/hooks/useTicketSocket";
import { ChatPanel } from "@/components/ChatPanel";
import { TicketInfoPanel } from "@/components/TicketInfoPanel";
import { Navbar } from "@/components/Navbar";
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

  const { messages, send } = useTicketSocket(ticketId, initialMessages, (patch) => {
    setTicket((prev) => prev ? { ...prev, ...patch } : prev);
  });

  if (authLoading || loading) {
    return <div className="flex min-h-screen items-center justify-center text-gray-400">Loading…</div>;
  }
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }
  if (!ticket || !user) return null;

  return (
    <div className="flex flex-col min-h-screen md:h-screen bg-gray-50 md:overflow-hidden">
      {/* Header */}
      <Navbar user={user}>
        <button
          onClick={() => router.push("/tickets")}
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors shrink-0"
        >
          ← Back
        </button>
        <h1 className="text-sm font-semibold text-gray-900 truncate">{ticket.subject}</h1>
      </Navbar>

      {/* Body */}
      <div className="flex-1 min-h-0 mx-auto w-full max-w-5xl px-4 sm:px-6 py-4 flex flex-col md:flex-row gap-4 overflow-y-auto md:overflow-hidden">
        {/* Info panel (top on mobile, right on desktop) */}
        <div className="order-1 md:order-2 md:w-60 shrink-0">
          <TicketInfoPanel
            ticket={ticket}
            currentUser={user}
            onStatusChange={setTicket}
          />
        </div>

        {/* Chat (bottom on mobile, left on desktop) */}
        <div className="order-2 md:order-1 flex-1 min-h-[450px] md:min-h-0 rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <ChatPanel
            messages={messages}
            currentUser={user}
            isClosed={ticket.status === "closed"}
            onSend={send}
          />
        </div>
      </div>
    </div>
  );
}
