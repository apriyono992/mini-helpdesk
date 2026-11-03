"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { saveTokens } from "@/lib/auth";
import { PasswordInput } from "@/components/PasswordInput";

const FIELDS = [
  { name: "business_name", label: "Business name", type: "text", placeholder: "Acme Corp" },
  { name: "full_name", label: "Your name", type: "text", placeholder: "Jane Doe" },
  { name: "email", label: "Email", type: "email", placeholder: "you@example.com" },
  { name: "password", label: "Password", type: "password", placeholder: "••••••••" },
] as const;

type FormKey = (typeof FIELDS)[number]["name"];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<Record<FormKey, string>>({
    business_name: "",
    full_name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const tokens = await api.auth.registerBusiness(form);
      saveTokens(tokens);
      router.push("/tickets");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold tracking-tight text-gray-900">HelpDesk</span>
        </div>
        <div className="rounded-xl bg-white border border-gray-200 p-8 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-gray-900">Create your account</h2>
          {error && (
            <p className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600">
              {error}
            </p>
          )}
          <form onSubmit={submit} className="space-y-4">
            {FIELDS.map((f) => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{f.label}</label>
                {f.type === "password" ? (
                  <PasswordInput
                    name={f.name}
                    required
                    value={form[f.name]}
                    onChange={onChange}
                    placeholder={f.placeholder}
                    className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                ) : (
                  <input
                    name={f.name}
                    type={f.type}
                    required
                    value={form[f.name]}
                    onChange={onChange}
                    placeholder={f.placeholder}
                    className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                )}
              </div>
            ))}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {loading ? "Creating…" : "Create account"}
            </button>
          </form>
        </div>
        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
