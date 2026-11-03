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
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (authLoading) return;
    Promise.all([api.tickets.get(ticketId), api.tickets.messages(ticketId, { limit: 20 })])
      .then(([t, msgs]) => {
        setTicket(t);
        setInitialMessages(msgs);
        setHasMore(msgs.length >= 20);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [authLoading, user, ticketId, router]);

  const socketEnabled = !authLoading && !loading && !!user && !isNaN(ticketId);

  const { messages, send, prependMessages } = useTicketSocket(
    ticketId,
    initialMessages,
    (patch) => {
      setTicket((prev) => (prev ? { ...prev, ...patch } : prev));
    },
    socketEnabled,
  );

  async function loadOlderMessages() {
    if (loadingOlder || !hasMore || messages.length === 0) return;
    setLoadingOlder(true);
    try {
      const oldestId = messages[0].id;
      const older = await api.tickets.messages(ticketId, { limit: 20, before_id: oldestId });
      if (older.length < 20) setHasMore(false);
      if (older.length > 0) prependMessages(older);
    } catch {
      // ignore fetch older errors
    } finally {
      setLoadingOlder(false);
    }
  }

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
    <div className="flex flex-col h-[100dvh] bg-gray-50 overflow-hidden">
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
      <div className="flex-1 min-h-0 mx-auto w-full max-w-5xl p-2 sm:p-4 flex flex-col md:flex-row gap-3 overflow-hidden">
        {/* Info panel (top on mobile with expand/collapse, right on desktop) */}
        <div className="order-1 md:order-2 md:w-60 shrink-0">
          <TicketInfoPanel
            ticket={ticket}
            currentUser={user}
            onStatusChange={setTicket}
          />
        </div>

        {/* Chat (flex-1 min-h-0, scroll only messages, fixed bottom input) */}
        <div className="order-2 md:order-1 flex-1 min-h-0 rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <ChatPanel
            messages={messages}
            currentUser={user}
            isClosed={ticket.status === "closed"}
            onSend={send}
            onLoadOlder={loadOlderMessages}
            hasMore={hasMore}
            loadingOlder={loadingOlder}
          />
        </div>
      </div>
    </div>
  );
}
