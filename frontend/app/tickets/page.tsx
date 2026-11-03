"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { TicketList } from "@/components/TicketList";
import { Navbar } from "@/components/Navbar";
import { createBusinessSocket } from "@/lib/ws";
import type { Category, Ticket, TicketPriority, TicketStatus, User } from "@/lib/types";

const STATUSES: TicketStatus[] = ["open", "in_progress", "resolved", "closed"];
const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

export default function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; priority?: string; q?: string }>;
}) {
  const resolvedParams = use(searchParams);
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkAgentId, setBulkAgentId] = useState<string>("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Filters & Pagination
  const [searchInput, setSearchInput] = useState(resolvedParams.q ?? "");
  const [searchTerm, setSearchTerm] = useState(resolvedParams.q ?? "");
  const [selectedCategory, setSelectedCategory] = useState<string>(resolvedParams.category ?? "");
  const [selectedPriority, setSelectedPriority] = useState<string>(resolvedParams.priority ?? "");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const activeStatus = STATUSES.includes(resolvedParams.status as TicketStatus)
    ? (resolvedParams.status as TicketStatus)
    : undefined;

  const assignedParam =
    assignmentFilter === "unassigned"
      ? "unassigned"
      : assignmentFilter === "mine"
      ? "mine"
      : undefined;
  const agentIdParam = assignmentFilter.startsWith("agent:")
    ? Number(assignmentFilter.replace("agent:", ""))
    : undefined;

  // Real-time Business Notifications Socket
  useEffect(() => {
    if (!user) return;
    let ws: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let unmounted = false;

    function connect() {
      if (unmounted) return;
      ws = createBusinessSocket(
        (data: unknown) => {
          const ev = data as {
            type: string;
            ticket_id?: number;
            id?: number;
            subject?: string;
            status?: TicketStatus;
            agent_id?: number | null;
          };
          if (ev.type === "ticket_created") {
            setToast(`New ticket: "${ev.subject}"`);
            api.tickets
              .list({
                status: activeStatus,
                category: selectedCategory || undefined,
                priority: (selectedPriority as TicketPriority) || undefined,
                search: searchTerm || undefined,
                page,
                limit: pageSize,
                assigned: assignedParam,
                agent_id: agentIdParam,
              })
              .then((res) => {
                setTickets(res.items);
                setTotalPages(res.pages);
                setTotalCount(res.total);
              })
              .catch(() => {});
          } else if (ev.type === "ticket_update") {
            const tId = ev.id ?? ev.ticket_id;
            setToast(`Ticket #${tId} updated: ${ev.status ?? "reassigned"}`);
            setTickets((prev) =>
              prev.map((t) =>
                t.id === tId
                  ? {
                      ...t,
                      status: ev.status ?? t.status,
                      agent_id: ev.agent_id !== undefined ? ev.agent_id : t.agent_id,
                    }
                  : t
              )
            );
          } else if (ev.type === "new_message") {
            setTickets((prev) =>
              prev.map((t) =>
                t.id === ev.ticket_id
                  ? { ...t, unread_count: (t.unread_count ?? 0) + 1 }
                  : t
              )
            );
          }
        },
        () => {
          if (!unmounted) timer = setTimeout(connect, 3000);
        }
      );
    }

    connect();

    return () => {
      unmounted = true;
      if (timer) clearTimeout(timer);
      ws?.close();
    };
  }, [user, activeStatus, searchTerm, page, pageSize, selectedCategory, selectedPriority, assignedParam, agentIdParam]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [activeStatus, assignmentFilter, selectedCategory, selectedPriority, pageSize]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (authLoading) return;
    setLoading(true);
    api.tickets
      .list({
        status: activeStatus,
        category: selectedCategory || undefined,
        priority: (selectedPriority as TicketPriority) || undefined,
        search: searchTerm || undefined,
        page,
        limit: pageSize,
        assigned: assignedParam,
        agent_id: agentIdParam,
      })
      .then((res) => {
        setTickets(res.items);
        setTotalPages(res.pages);
        setTotalCount(res.total);
        setSelectedIds([]);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [
    authLoading,
    user,
    activeStatus,
    searchTerm,
    page,
    pageSize,
    selectedCategory,
    selectedPriority,
    assignedParam,
    agentIdParam,
    router,
  ]);

  useEffect(() => {
    if (user?.role === "admin") {
      api.users
        .list()
        .then((u) => setAgents(u.filter((x) => x.role === "agent")))
        .catch(() => {});
    }
    if (user) {
      api.categories.list().then(setCategories).catch(() => {});
    }
  }, [user]);

  function handleToggleSelect(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleToggleSelectAll() {
    if (selectedIds.length === tickets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(tickets.map((t) => t.id));
    }
  }

  async function handleAssign(ticketId: number, agentId: number) {
    try {
      const updated = await api.tickets.patch(ticketId, { agent_id: agentId });
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to assign");
    }
  }

  async function handleBulkAssign() {
    if (!bulkAgentId || selectedIds.length === 0) return;
    const targetId = Number(bulkAgentId);
    setBulkLoading(true);
    try {
      await Promise.all(
        selectedIds.map((id) => api.tickets.patch(id, { agent_id: targetId }))
      );
      setTickets((prev) =>
        prev.map((t) => (selectedIds.includes(t.id) ? { ...t, agent_id: targetId } : t))
      );
      setSelectedIds([]);
      setBulkAgentId("");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to bulk assign");
    } finally {
      setBulkLoading(false);
    }
  }

  if (authLoading)
    return <div className="flex min-h-screen items-center justify-center text-gray-400">Loading…</div>;

  const isAdmin = user?.role === "admin";

  return (
    <div className="min-h-screen bg-gray-50 pb-20 relative">
      {/* Real-time Business Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 bg-gray-900 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-2xl border border-gray-700 animate-in fade-in slide-in-from-top-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>{toast}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Navbar */}
      <Navbar user={user ?? null} onLogout={logout}>
        {isAdmin && (
          <div className="flex items-center gap-3">
            <Link href="/admin/users" className="text-sm text-gray-600 hover:text-gray-900">
              Users
            </Link>
            <Link href="/admin/categories" className="text-sm text-gray-600 hover:text-gray-900">
              Categories
            </Link>
          </div>
        )}
        {user?.role === "customer" && (
          <Link
            href="/tickets/new"
            className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            New ticket
          </Link>
        )}
      </Navbar>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-6 space-y-4">
        {/* Search & Filter Header */}
        <div className="space-y-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search tickets by subject or #ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full px-2 py-0.5"
              >
                Clear
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex gap-1 flex-wrap items-center">
            <Link
              href="/tickets"
              className={`rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                !activeStatus
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              All Status
            </Link>
            {STATUSES.map((s) => (
              <Link
                key={s}
                href={`/tickets?status=${s}`}
                className={`rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                  activeStatus === s
                    ? "bg-indigo-600 text-white"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {STATUS_LABEL[s]}
              </Link>
            ))}
          </div>

          {/* Filter Bar (Category, Priority, Assignee, Limit, Reset) */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <select
                aria-label="Filter by category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Priority Filter */}
              <select
                aria-label="Filter by priority"
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>

              {/* Assignee Filter */}
              {(user?.role === "admin" || user?.role === "agent") && (
                <select
                  aria-label="Filter by assignee"
                  value={assignmentFilter}
                  onChange={(e) => setAssignmentFilter(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">All Assignees</option>
                  <option value="unassigned">Unassigned</option>
                  <option value="mine">Assigned to Me</option>
                  {user?.role === "admin" &&
                    agents.map((ag) => (
                      <option key={ag.id} value={`agent:${ag.id}`}>
                        {ag.full_name}
                      </option>
                    ))}
                </select>
              )}

              {/* Items Per Page */}
              <select
                aria-label="Items per page"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>

              {/* Reset button */}
              {(searchInput || selectedCategory || selectedPriority || assignmentFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setSearchTerm("");
                    setSelectedCategory("");
                    setSelectedPriority("");
                    setAssignmentFilter("all");
                    setPage(1);
                  }}
                  className="rounded-lg bg-gray-200/80 hover:bg-gray-200 text-gray-700 px-2 py-1 text-xs font-medium transition-colors"
                >
                  Reset filters ✕
                </button>
              )}
            </div>

            <span className="text-xs text-gray-500 whitespace-nowrap ml-auto">
              {totalCount} {totalCount === 1 ? "ticket" : "tickets"}
            </span>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600">
            {error}
          </p>
        )}

        {/* Select all bar for Admin */}
        {isAdmin && tickets.length > 0 && !loading && (
          <div className="flex items-center justify-between px-2 py-1 text-xs text-gray-500">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selectedIds.length === tickets.length && tickets.length > 0}
                onChange={handleToggleSelectAll}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Select all on page ({tickets.length})</span>
            </label>
            {selectedIds.length > 0 && (
              <span className="font-medium text-indigo-600">{selectedIds.length} selected</span>
            )}
          </div>
        )}

        {loading ? (
          <p className="text-center text-gray-400 py-16 text-sm">Loading tickets…</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              <TicketList
                tickets={tickets}
                isAdmin={isAdmin}
                isCustomer={user?.role === "customer"}
                agents={agents}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onAssign={handleAssign}
              />
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm text-gray-600 bg-white rounded-xl border border-gray-200 shadow-sm">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors"
                >
                  ← Previous
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .map((p, idx, arr) => (
                      <span key={p} className="flex items-center">
                        {idx > 0 && p - arr[idx - 1] > 1 && (
                          <span className="px-1 text-gray-400 text-xs">…</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setPage(p)}
                          className={`min-w-7 h-7 px-2 rounded-lg text-xs font-medium transition-colors ${
                            page === p
                              ? "bg-indigo-600 text-white"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {p}
                        </button>
                      </span>
                    ))}
                </div>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating bulk action bar for Admin */}
      {isAdmin && selectedIds.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-xl bg-gray-900 text-white rounded-2xl shadow-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 border border-gray-800">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center bg-indigo-500 text-white text-xs font-bold rounded-full w-6 h-6">
              {selectedIds.length}
            </span>
            <span className="text-sm font-medium text-gray-200">tickets selected</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={bulkAgentId}
              onChange={(e) => setBulkAgentId(e.target.value)}
              className="rounded-lg bg-gray-800 border border-gray-700 text-white text-xs px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              <option value="">Choose agent…</option>
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.full_name} (#{ag.id})
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!bulkAgentId || bulkLoading}
              onClick={handleBulkAssign}
              className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 px-3.5 py-2 text-xs font-semibold text-white transition-colors"
            >
              {bulkLoading ? "Assigning…" : "Assign"}
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="rounded-lg text-gray-400 hover:text-white px-2 py-2 text-xs font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
