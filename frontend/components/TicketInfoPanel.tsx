import type { Ticket, User } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";
import type { TicketStatus } from "@/lib/types";

interface Props {
  ticket: Ticket;
  currentUser: User;
  onStatusChange: (t: Ticket) => void;
}

const TRANSITIONS: Record<string, TicketStatus[]> = {
  open: ["in_progress"],
  in_progress: ["resolved"],
  resolved: ["closed", "open"],
  closed: [],
};

const ACTION_LABEL: Record<TicketStatus, string> = {
  open: "Reopen Ticket",
  in_progress: "Start Progress",
  resolved: "Mark Resolved",
  closed: "Close Ticket",
};

const ACTION_STYLE: Record<TicketStatus, string> = {
  open: "bg-amber-600 hover:bg-amber-700 text-white shadow-sm",
  in_progress: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm",
  resolved: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm",
  closed: "bg-gray-800 hover:bg-gray-900 text-white shadow-sm",
};

export function TicketInfoPanel({ ticket, currentUser, onStatusChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [agents, setAgents] = useState<User[]>([]);

  useEffect(() => {
    if (currentUser.role === "admin") {
      api.users
        .list()
        .then((users) => setAgents(users.filter((u) => u.role === "agent")))
        .catch(() => {});
    }
  }, [currentUser.role]);

  const allowedNext = TRANSITIONS[ticket.status] ?? [];

  async function changeStatus(s: TicketStatus) {
    if (ticket.status === "resolved" && s === "open" && currentUser.role !== "customer") return;
    if (ticket.status === "in_progress" && s === "resolved" && currentUser.role === "customer") return;
    setLoading(true);
    setError("");
    try {
      const updated = await api.tickets.patch(ticket.id, { status: s });
      onStatusChange(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function assignAgent(agentId: number) {
    setAssignLoading(true);
    setError("");
    try {
      const updated = await api.tickets.patch(ticket.id, { agent_id: agentId });
      onStatusChange(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setAssignLoading(false);
    }
  }

  return (
    <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      {/* Mobile toggle bar */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex md:hidden items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-gray-900">#{ticket.id}</span>
          <StatusBadge status={ticket.status} />
          <span className="text-xs text-gray-500 truncate">{ticket.subject}</span>
        </div>
        <span className="text-xs text-indigo-600 font-medium shrink-0 ml-2">
          {expanded ? "Hide details ▲" : "Details ▼"}
        </span>
      </button>

      {/* Main info panel */}
      <div className={`${expanded ? "block" : "hidden"} md:block p-4 sm:p-5 space-y-4 border-t md:border-t-0 border-gray-100`}>
        <div className="hidden md:block">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Ticket</p>
          <p className="text-sm font-semibold text-gray-900">#{ticket.id}</p>
        </div>

        <div className="hidden md:block">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Status</p>
          <StatusBadge status={ticket.status} />
        </div>

        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Subject</p>
          <p className="text-sm text-gray-700 leading-relaxed">{ticket.subject}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Category</p>
            <p className="text-sm text-gray-700 capitalize">{ticket.category}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Priority</p>
            <p className="text-sm text-gray-700 capitalize">{ticket.priority}</p>
          </div>
        </div>

        {currentUser.role !== "customer" && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Agent</p>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  ticket.agent_id
                    ? "bg-blue-50 text-blue-700 border border-blue-100"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {ticket.agent_id ? `Agent #${ticket.agent_id}` : "Unassigned"}
              </span>
            </div>

            {/* Admin assign dropdown */}
            {currentUser.role === "admin" && (
              <div className="mt-2">
                <select
                  value={ticket.agent_id ?? ""}
                  disabled={assignLoading}
                  onChange={(e) => {
                    if (e.target.value) {
                      void assignAgent(Number(e.target.value));
                    }
                  }}
                  className="w-full text-xs rounded-lg border border-gray-200 px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="" disabled>Select agent…</option>
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.full_name} (#{ag.id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Agent self-assign button for unassigned tickets */}
            {currentUser.role === "agent" && !ticket.agent_id && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => assignAgent(currentUser.id)}
                  disabled={assignLoading}
                  className="w-full rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors disabled:opacity-50"
                >
                  {assignLoading ? "Assigning…" : "Assign to me"}
                </button>
              </div>
            )}
          </div>
        )}

        {allowedNext.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</p>
            {allowedNext.map((s) => {
              if (s === "open" && currentUser.role !== "customer") return null;
              if (s === "in_progress" && currentUser.role === "customer") return null;
              if (s === "resolved" && currentUser.role === "customer") return null;
              return (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  disabled={loading}
                  className={`block w-full rounded-lg px-3.5 py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors text-center ${ACTION_STYLE[s]}`}
                >
                  {ACTION_LABEL[s]}
                </button>
              );
            })}
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}
