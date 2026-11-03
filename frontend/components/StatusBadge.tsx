import type { TicketStatus } from "@/lib/types";

const MAP: Record<TicketStatus, string> = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-600",
};

const LABEL: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${MAP[status]}`}>
      {LABEL[status]}
    </span>
  );
}
