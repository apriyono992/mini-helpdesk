"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { Category } from "@/lib/types";
import { Navbar } from "@/components/Navbar";

export default function AdminCategoriesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!authLoading && user && user.role !== "admin") {
      router.push("/tickets");
      return;
    }
    if (authLoading) return;
    loadCategories();
  }, [authLoading, user, router]);

  function loadCategories() {
    setLoading(true);
    api.categories
      .list()
      .then(setCategories)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setFormError("");
    try {
      const created = await api.categories.create({ name: name.trim() });
      setCategories((prev) => [...prev, created]);
      setName("");
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setFormError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName("");
  }

  async function saveEdit(id: number) {
    if (!editingName.trim()) return;
    setUpdating(true);
    setFormError("");
    try {
      const updated = await api.categories.update(id, { name: editingName.trim() });
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setEditingId(null);
      setEditingName("");
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to update category");
    } finally {
      setUpdating(false);
    }
  }

  async function deleteCat(id: number) {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      await api.categories.delete(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
    }
  }

  if (authLoading)
    return <div className="flex min-h-screen items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user ?? null}>
        <div className="flex items-center gap-3">
          <Link href="/tickets" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Tickets
          </Link>
          <Link href="/admin/users" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Users
          </Link>
        </div>
      </Navbar>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Master Categories</h1>
        </div>

        {/* Create category form */}
        <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Add category</h2>
          {formError && (
            <p className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600">
              {formError}
            </p>
          )}
          <form onSubmit={submitCreate} className="flex gap-3">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Technical Support, Billing, Bug Report"
              className="flex-1 rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shrink-0"
            >
              {creating ? "Adding…" : "Add category"}
            </button>
          </form>
        </div>

        {/* Categories list */}
        {error && (
          <p className="rounded-lg bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-center text-gray-400 text-sm py-8">Loading…</p>
        ) : (
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            {categories.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-12">
                No categories yet. Add one above.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {categories.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 text-gray-900 font-medium">
                        {editingId === c.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="rounded-md border border-gray-300 px-2.5 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => saveEdit(c.id)}
                              disabled={updating || !editingName.trim()}
                              className="text-xs bg-indigo-600 text-white rounded px-2.5 py-1 hover:bg-indigo-700 disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="text-xs text-gray-500 hover:text-gray-700 px-1 py-1"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          c.name
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-3">
                        {editingId !== c.id && (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(c)}
                              className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteCat(c.id)}
                              className="text-xs font-medium text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
