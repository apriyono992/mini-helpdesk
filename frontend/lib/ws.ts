import { getAccessToken } from "./auth";

function getWsBase(): string {
  const envUrl = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}`;
  }
  return "";
}

function buildWsUrl(path: string): string {
  const base = getWsBase();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (base.endsWith("/ws") && normalizedPath.startsWith("/ws/")) {
    return `${base}${normalizedPath.slice(3)}`;
  }
  return `${base}${normalizedPath}`;
}

export function createTicketSocket(
  ticketId: number,
  onMessage: (data: unknown) => void,
  onClose?: () => void,
  onOpen?: () => void
): WebSocket {
  const token = getAccessToken() ?? "";
  const ws = new WebSocket(buildWsUrl(`/ws/tickets/${ticketId}?token=${token}`));
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
  const ws = new WebSocket(buildWsUrl(`/ws/business?token=${token}`));
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
