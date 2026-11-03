import Link from "next/link";
import type { User, Role } from "@/lib/types";

const ROLE_STYLE: Record<Role, string> = {
  admin: "bg-red-50 text-red-600 ring-1 ring-red-100",
  agent: "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100",
  customer: "bg-gray-100 text-gray-500 ring-1 ring-gray-200",
};

interface Props {
  user: User | null;
  onLogout?: () => void;
  /** Extra actions rendered between profile and logout */
  children?: React.ReactNode;
}

export function Navbar({ user, onLogout, children }: Props) {
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 flex items-center justify-between h-14 gap-4">
        <Link href="/tickets" className="font-semibold text-gray-900 tracking-tight shrink-0">
          HelpDesk
        </Link>

        <div className="flex items-center gap-3 min-w-0">
          {children}

          {user && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm text-gray-700 font-medium truncate max-w-[120px]" title={user.full_name}>
                {user.full_name}
              </span>
              <span className={`shrink-0 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_STYLE[user.role]}`}>
                {user.role}
              </span>
            </div>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="shrink-0 text-sm text-gray-400 hover:text-gray-700 transition-colors"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
