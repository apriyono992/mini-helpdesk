import Link from "next/link";
import type { User, Role } from "@/lib/types";

const ROLE_COLOR: Record<Role, string> = {
  admin: "bg-red-500",
  agent: "bg-indigo-500",
  customer: "bg-gray-400",
};

const ROLE_BADGE: Record<Role, string> = {
  admin: "bg-red-50 text-red-600 ring-1 ring-red-100",
  agent: "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100",
  customer: "bg-gray-100 text-gray-500 ring-1 ring-gray-200",
};

interface Props {
  user: User | null;
  onLogout?: () => void;
  children?: React.ReactNode;
}

export function Navbar({ user, onLogout, children }: Props) {
  const initials = user?.full_name?.trim().charAt(0).toUpperCase() ?? "?";

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 flex items-center justify-between h-14 gap-4">
        <Link href="/tickets" className="font-semibold text-gray-900 tracking-tight shrink-0">
          HelpDesk
        </Link>

        <div className="flex items-center gap-3 min-w-0">
          {children}

          {user && (
            <div className="relative group">
              {/* Avatar */}
              <button
                type="button"
                className={`flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-semibold select-none focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 ${ROLE_COLOR[user.role]}`}
                aria-label="Account menu"
              >
                {initials}
              </button>

              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-2 w-52 rounded-xl bg-white border border-gray-200 shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition-opacity duration-150">
                {/* Profile info */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user.full_name}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
                  <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[user.role]}`}>
                    {user.role}
                  </span>
                </div>

                {/* Actions */}
                {onLogout && (
                  <div className="py-1">
                    <button
                      onClick={onLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
