import Link from "next/link";
import type { Ticket } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TicketList({ tickets }: { tickets: Ticket[] }) {
  if (tickets.length === 0) {
    return (
      <p className="text-center text-gray-400 text-sm py-16">No tickets found.</p>
    );
  }
  return (
    <ul className="divide-y divide-gray-100">
      {tickets.map((t) => (
        <li key={t.id}>
          <Link
            href={`/tickets/${t.id}`}
            className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors gap-4"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">
                {t.subject}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">#{t.id} · {formatDate(t.created_at)}</p>
            </div>
            <StatusBadge status={t.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
