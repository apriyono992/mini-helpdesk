export type Role = "admin" | "agent" | "customer";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high";

export interface Category {
  id: number;
  business_id: number;
  name: string;
  created_at: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  business_id: number;
}

export interface Ticket {
  id: number;
  business_id: number;
  customer_id: number;
  agent_id: number | null;
  subject: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  unread_count?: number;
  created_at: string;
  updated_at: string;
}

export interface PaginatedTickets {
  items: Ticket[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface Message {
  id: number;
  ticket_id: number;
  sender_id: number;
  sender_name?: string | null;
  sender_role?: string | null;
  body: string;
  attachment_url?: string | null;
  is_read?: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface ApiError {
  detail: string;
  code?: string;
}
