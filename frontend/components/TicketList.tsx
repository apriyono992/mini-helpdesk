import Link from "next/link";
import type { Ticket, User } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PRIORITY_STYLE: Record<string, string> = {
  high: "text-red-600 font-medium",
  medium: "text-amber-600",
  low: "text-gray-400",
};

interface Props {
  tickets: Ticket[];
  isAdmin?: boolean;
  isCustomer?: boolean;
  agents?: User[];
  selectedIds?: number[];
  onToggleSelect?: (id: number) => void;
  onAssign?: (ticketId: number, agentId: number) => void;
}

export function TicketList({
  tickets,
  isAdmin = false,
  isCustomer = false,
  agents = [],
  selectedIds = [],
  onToggleSelect,
  onAssign,
}: Props) {
  if (tickets.length === 0) {
    return (
      <p className="text-center text-gray-400 text-sm py-16">No tickets found.</p>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {tickets.map((t) => {
        const isSelected = selectedIds.includes(t.id);
        const assignedAgent = agents.find((a) => a.id === t.agent_id);
        const agentName = assignedAgent ? assignedAgent.full_name : t.agent_id ? `Agent #${t.agent_id}` : null;

        return (
          <li
            key={t.id}
            className={`flex items-center px-4 sm:px-5 py-3.5 hover:bg-gray-50 transition-colors gap-3 ${
              isSelected ? "bg-indigo-50/50" : ""
            }`}
          >
            {isAdmin && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect?.(t.id)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 shrink-0 cursor-pointer"
                aria-label={`Select ticket #${t.id}`}
              />
            )}

            <Link
              href={`/tickets/${t.id}`}
              className="flex-1 min-w-0 flex items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900 truncate">{t.subject}</p>
                  {!isCustomer &&
                    (agentName ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100 shrink-0">
                        {agentName}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                        Unassigned
                      </span>
                    ))}
                </div>

                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5 flex-wrap">
                  <span>#{t.id}</span>
                  <span>·</span>
                  <span className="capitalize">{t.category}</span>
                  <span>·</span>
                  <span className={`capitalize ${PRIORITY_STYLE[t.priority] ?? "text-gray-400"}`}>
                    {t.priority}
                  </span>
                  <span>·</span>
                  <span>{formatDate(t.created_at)}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={t.status} />
              </div>
            </Link>

            {isAdmin && agents.length > 0 && (
              <div className="shrink-0 hidden sm:block">
                <select
                  value={t.agent_id ?? ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      onAssign?.(t.id, Number(e.target.value));
                    }
                  }}
                  className="text-xs rounded-lg border border-gray-200 px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  title="Assign agent"
                >
                  <option value="" disabled>Assign…</option>
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
