import { getAccessToken, getRefreshToken, saveTokens, clearTokens, getDeviceId } from "./auth";
import type { User, Ticket, Message, TokenResponse, TicketStatus, Category, TicketPriority, PaginatedTickets } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Device-Id": getDeviceId(),
    ...(init.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    signal: AbortSignal.timeout(10_000),
  });

  const isAuthEndpoint = path.startsWith("/auth/login") || path.startsWith("/auth/register");
  if (res.status === 401 && retry && !isAuthEndpoint) {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, init, false);
    clearTokens();
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
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
    list: (params?: { status?: TicketStatus; search?: string; page?: number; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.status) query.set("status", params.status);
      if (params?.search) query.set("search", params.search);
      if (params?.page) query.set("page", String(params.page));
      if (params?.limit) query.set("limit", String(params.limit));
      const qs = query.toString();
      return request<PaginatedTickets>(`/tickets${qs ? `?${qs}` : ""}`);
    },
    get: (id: number) => request<Ticket>(`/tickets/${id}`),
    markRead: (id: number) => request<void>(`/tickets/${id}/read`, { method: "POST" }),
    create: (data: {
      subject: string;
      first_message: string;
      category?: string;
      priority?: TicketPriority;
    }) => request<Ticket>("/tickets", { method: "POST", body: JSON.stringify(data) }),
    patch: (id: number, data: { status?: TicketStatus; agent_id?: number }) =>
      request<Ticket>(`/tickets/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    messages: (id: number, params?: { limit?: number; before_id?: number }) => {
      const query = new URLSearchParams();
      if (params?.limit) query.set("limit", String(params.limit));
      if (params?.before_id) query.set("before_id", String(params.before_id));
      const qs = query.toString();
      return request<Message[]>(`/tickets/${id}/messages${qs ? `?${qs}` : ""}`);
    },
  },
  categories: {
    list: () => request<Category[]>("/categories"),
    create: (data: { name: string }) =>
      request<Category>("/categories", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: { name: string }) =>
      request<Category>(`/categories/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<void>(`/categories/${id}`, { method: "DELETE" }),
  },
};
