import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from "./auth";
import type { User, Ticket, Message, TokenResponse, TicketStatus } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, init, false);
    clearTokens();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail ?? "Request failed");
  }

  return res.json() as Promise<T>;
}

async function tryRefresh(): Promise<boolean> {
  const refresh_token = getRefreshToken();
  if (!refresh_token) return false;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token }),
    });
    if (!res.ok) return false;
    const tokens: TokenResponse = await res.json();
    saveTokens(tokens);
    return true;
  } catch {
    return false;
  }
}

// Auth
export const api = {
  auth: {
    registerBusiness: (data: { business_name: string; full_name: string; email: string; password: string }) =>
      request<TokenResponse>("/auth/registerbusiness", { method: "POST", body: JSON.stringify(data) }),
    login: (email: string, password: string) =>
      request<TokenResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
    me: () => request<User>("/auth/me"),
  },
  users: {
    list: () => request<User[]>("/users"),
    create: (data: { email: string; full_name: string; password: string; role: string }) =>
      request<User>("/users", { method: "POST", body: JSON.stringify(data) }),
  },
  tickets: {
    list: (status?: TicketStatus) =>
      request<Ticket[]>(`/tickets${status ? `?status=${status}` : ""}`),
    get: (id: number) => request<Ticket>(`/tickets/${id}`),
    create: (data: { subject: string; first_message: string }) =>
      request<Ticket>("/tickets", { method: "POST", body: JSON.stringify(data) }),
    patch: (id: number, data: { status?: TicketStatus; agent_id?: number }) =>
      request<Ticket>(`/tickets/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    messages: (id: number) => request<Message[]>(`/tickets/${id}/messages`),
  },
};
