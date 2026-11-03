"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { TicketList } from "@/components/TicketList";
import type { Ticket, TicketStatus } from "@/lib/types";


const STATUSES: TicketStatus[] = ["open", "in_progress", "resolved", "closed"];

// searchParams is a Promise in this version
export default function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = use(searchParams);
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const activeStatus = STATUSES.includes(statusParam as TicketStatus)
    ? (statusParam as TicketStatus)
    : undefined;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (authLoading) return;
    setLoading(true);
    api.tickets
      .list(activeStatus)
      .then(setTickets)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [authLoading, user, activeStatus, router]);

  if (authLoading) return <div className="flex min-h-screen items-center justify-center">Loading…</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Tickets</h1>
        <div className="flex gap-2 items-center">
          {user?.role === "admin" && (
            <Link href="/admin/users" className="text-sm text-blue-600 hover:underline">
              Users
            </Link>
          )}
          {user?.role === "customer" && (
            <Link
              href="/tickets/new"
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              New Ticket
            </Link>
          )}
          <button onClick={logout} className="text-sm text-gray-500 hover:underline">
            Logout
          </button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 flex-wrap">
        <Link
          href="/tickets"
          className={`rounded px-3 py-1 text-sm ${!activeStatus ? "bg-blue-600 text-white" : "bg-white border hover:bg-gray-50"}`}
        >
          All
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/tickets?status=${s}`}
            className={`rounded px-3 py-1 text-sm ${activeStatus === s ? "bg-blue-600 text-white" : "bg-white border hover:bg-gray-50"}`}
          >
            {s.replace("_", " ")}
          </Link>
        ))}
      </div>

      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {loading ? (
        <p className="text-center text-gray-500 py-8">Loading tickets…</p>
      ) : (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <TicketList tickets={tickets} />
        </div>
      )}
    </div>
  );
}
