import { getAccessToken } from "./auth";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

export function createTicketSocket(
  ticketId: number,
  onMessage: (data: unknown) => void,
  onClose?: () => void,
  onOpen?: () => void
): WebSocket {
  const token = getAccessToken() ?? "";
  const ws = new WebSocket(`${WS_BASE}/ws/tickets/${ticketId}?token=${token}`);
  if (onOpen) ws.onopen = onOpen;
  ws.onmessage = (e) => {
    try {
      onMessage(JSON.parse(e.data));
    } catch {
      // ignore malformed message
    }
  };
  if (onClose) ws.onclose = onClose;
  return ws;
}

export function createBusinessSocket(
  onMessage: (data: unknown) => void,
  onClose?: () => void
): WebSocket | null {
  const token = getAccessToken();
  if (!token) return null;
  const ws = new WebSocket(`${WS_BASE}/ws/business?token=${token}`);
  ws.onmessage = (e) => {
    try {
      onMessage(JSON.parse(e.data));
    } catch {
      // ignore
    }
  };
  if (onClose) ws.onclose = onClose;
  return ws;
}
