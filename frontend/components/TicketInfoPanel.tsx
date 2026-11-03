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

export function TicketInfoPanel({ ticket, currentUser, onStatusChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const allowedNext = TRANSITIONS[ticket.status] ?? [];

  async function changeStatus(s: TicketStatus) {
    // resolved->open only for owner customer
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
    <div className="border rounded-lg p-4 space-y-3 bg-white">
      <h2 className="font-semibold text-gray-700">Ticket #{ticket.id}</h2>
      <div>
        <span className="text-xs text-gray-500">Status</span>
        <div className="mt-1"><StatusBadge status={ticket.status} /></div>
      </div>
      <div>
        <span className="text-xs text-gray-500">Subject</span>
        <p className="text-sm font-medium">{ticket.subject}</p>
      </div>
      <div>
        <span className="text-xs text-gray-500">Agent ID</span>
        <p className="text-sm">{ticket.agent_id ?? "Unassigned"}</p>
      </div>
      {allowedNext.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs text-gray-500">Actions</span>
          {allowedNext.map((s) => {
            if (s === "open" && currentUser.role !== "customer") return null;
            return (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                disabled={loading}
                className="block w-full rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-50"
              >
                → {s.replace("_", " ")}
              </button>
            );
          })}
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
