"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@/lib/types";
import { PasswordInput } from "@/components/PasswordInput";


export default function AdminUsersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", full_name: "", password: "", role: "agent" });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
    if (!authLoading && user && user.role !== "admin") { router.push("/tickets"); return; }
    if (authLoading) return;
    api.users.list()
      .then(setUsers)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [authLoading, user, router]);

  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setFormError("");
    try {
      const newUser = await api.users.create(form);
      setUsers((u) => [...u, newUser]);
      setForm({ email: "", full_name: "", password: "", role: "agent" });
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error");
    } finally {
      setCreating(false);
    }
  }

  if (authLoading)
    return <div className="flex min-h-screen items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 flex items-center justify-between h-14">
          <span className="font-semibold text-gray-900 tracking-tight">HelpDesk</span>
          <button
            onClick={() => router.push("/tickets")}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← Tickets
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-6 space-y-6">
        <h1 className="text-xl font-semibold text-gray-900">Users</h1>

        {/* Add user form */}
        <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Add user</h2>
          {formError && (
            <p className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600">
              {formError}
            </p>
          )}
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(["email", "full_name", "password"] as const).map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 capitalize">
                    {field.replace("_", " ")}
                  </label>
                  {field === "password" ? (
                    <PasswordInput
                      name={field}
                      required
                      value={form[field]}
                      onChange={onChange}
                      className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  ) : (
                    <input
                      name={field}
                      required
                      type={field === "email" ? "email" : "text"}
                      value={form[field]}
                      onChange={onChange}
                      className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  )}
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                <select
                  name="role"
                  value={form.role}
                  onChange={onChange}
                  className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="agent">Agent</option>
                  <option value="customer">Customer</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {creating ? "Creating…" : "Create user"}
            </button>
          </form>
        </div>

        {/* User list */}
        {error && (
          <p className="rounded-lg bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600">
            {error}
          </p>
        )}
        {loading ? (
          <p className="text-center text-gray-400 text-sm py-8">Loading…</p>
        ) : (
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{u.full_name}</td>
                    <td className="px-5 py-3.5 text-gray-500">{u.email}</td>
                    <td className="px-5 py-3.5 capitalize text-gray-600">{u.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
