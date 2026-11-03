import type { TicketStatus } from "@/lib/types";

const MAP: Record<TicketStatus, string> = {
  open: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
  in_progress: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  resolved: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  closed: "bg-gray-100 text-gray-500 ring-1 ring-gray-200",
};

const LABEL: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${MAP[status]}`}>
      {LABEL[status]}
    </span>
  );
}
