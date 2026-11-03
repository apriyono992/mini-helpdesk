import Link from "next/link";
import type { Ticket } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

export function TicketList({ tickets }: { tickets: Ticket[] }) {
  if (tickets.length === 0) {
    return <p className="text-center text-gray-500 py-8">No tickets found.</p>;
  }
  return (
    <ul className="divide-y divide-gray-200">
      {tickets.map((t) => (
        <li key={t.id}>
          <Link
            href={`/tickets/${t.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-gray-900">#{t.id} {t.subject}</p>
              <p className="text-xs text-gray-500">{new Date(t.created_at).toLocaleString()}</p>
            </div>
            <StatusBadge status={t.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
