import type { Ticket, User } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { api } from "@/lib/api";
import { useState } from "react";
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
  open: "Reopen",
  in_progress: "Start progress",
  resolved: "Mark resolved",
  closed: "Close ticket",
};

export function TicketInfoPanel({ ticket, currentUser, onStatusChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const allowedNext = TRANSITIONS[ticket.status] ?? [];

  async function changeStatus(s: TicketStatus) {
    // resolved→open only for owner customer
    if (ticket.status === "resolved" && s === "open" && currentUser.role !== "customer") return;
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

  return (
    <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-5 space-y-4">
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Ticket</p>
        <p className="text-sm font-semibold text-gray-900">#{ticket.id}</p>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Status</p>
        <StatusBadge status={ticket.status} />
      </div>

      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Subject</p>
        <p className="text-sm text-gray-700 leading-relaxed">{ticket.subject}</p>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Agent</p>
        <p className="text-sm text-gray-700">{ticket.agent_id ?? "Unassigned"}</p>
      </div>

      {allowedNext.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</p>
          {allowedNext.map((s) => {
            if (s === "open" && currentUser.role !== "customer") return null;
            if (s === "in_progress" && currentUser.role === "customer") return null;
            return (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                disabled={loading}
                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors text-left"
              >
                {ACTION_LABEL[s]}
              </button>
            );
          })}
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
