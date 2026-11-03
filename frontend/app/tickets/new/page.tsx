"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";


export default function NewTicketPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
    if (!authLoading && user && user.role !== "customer") router.push("/tickets");
  }, [authLoading, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const ticket = await api.tickets.create({ subject, first_message: message });
      router.push(`/tickets/${ticket.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  if (authLoading)
    return <div className="flex min-h-screen items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 flex items-center h-14">
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors mr-4"
          >
            ← Back
          </button>
          <span className="font-semibold text-gray-900">New ticket</span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 sm:px-6 py-8">
        <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm">
          {error && (
            <p className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600">
              {error}
            </p>
          )}
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
              <input
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief description of your issue"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
              <textarea
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue in detail…"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "Submitting…" : "Submit ticket"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
