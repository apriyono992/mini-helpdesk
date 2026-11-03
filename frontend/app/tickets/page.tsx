"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { TicketList } from "@/components/TicketList";
import type { Ticket, TicketStatus } from "@/lib/types";

const STATUSES: TicketStatus[] = ["open", "in_progress", "resolved", "closed"];
const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

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

  if (authLoading)
    return <div className="flex min-h-screen items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 flex items-center justify-between h-14">
          <span className="font-semibold text-gray-900 tracking-tight">HelpDesk</span>
          <div className="flex items-center gap-4">
            {user?.role === "admin" && (
              <Link href="/admin/users" className="text-sm text-gray-600 hover:text-gray-900">
                Users
              </Link>
            )}
            {user?.role === "customer" && (
              <Link
                href="/tickets/new"
                className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                New ticket
              </Link>
            )}
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-6 space-y-4">
        {/* Filter tabs */}
        <div className="flex gap-1 flex-wrap">
          <Link
            href="/tickets"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              !activeStatus
                ? "bg-indigo-600 text-white"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            All
          </Link>
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={`/tickets?status=${s}`}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeStatus === s
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {STATUS_LABEL[s]}
            </Link>
          ))}
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-center text-gray-400 py-16 text-sm">Loading tickets…</p>
        ) : (
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <TicketList tickets={tickets} />
          </div>
        )}
      </main>
    </div>
  );
}
