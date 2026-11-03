"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@/lib/types";


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

  if (authLoading) return <div className="flex min-h-screen items-center justify-center">Loading…</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Users</h1>
        <button onClick={() => router.push("/tickets")} className="text-sm text-blue-600 hover:underline">
          ← Tickets
        </button>
      </div>

      {/* Create user form */}
      <form onSubmit={submit} className="bg-white rounded-lg border p-4 shadow-sm space-y-3">
        <h2 className="font-semibold text-sm">Add User</h2>
        {formError && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(["email", "full_name", "password"] as const).map((field) => (
            <div key={field}>
              <label className="block text-xs font-medium mb-1 capitalize">{field.replace("_", " ")}</label>
              <input
                name={field}
                required
                type={field === "password" ? "password" : field === "email" ? "email" : "text"}
                value={form[field]}
                onChange={onChange}
                className="w-full rounded border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium mb-1">Role</label>
            <select
              name="role"
              value={form.role}
              onChange={onChange}
              className="w-full rounded border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="agent">Agent</option>
              <option value="customer">Customer</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create"}
        </button>
      </form>

      {/* User list */}
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {loading ? (
        <p className="text-center text-gray-500">Loading…</p>
      ) : (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-4 py-2 font-medium">Email</th>
                <th className="text-left px-4 py-2 font-medium">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{u.full_name}</td>
                  <td className="px-4 py-2 text-gray-600">{u.email}</td>
                  <td className="px-4 py-2 capitalize">{u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
