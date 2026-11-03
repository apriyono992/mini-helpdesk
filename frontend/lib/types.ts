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
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  ticket_id: number;
  sender_id: number;
  body: string;
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
