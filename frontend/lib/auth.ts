import type { TokenResponse } from "./types";

const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";

export function saveTokens(t: TokenResponse): void {
  localStorage.setItem(ACCESS_KEY, t.access_token);
  localStorage.setItem(REFRESH_KEY, t.refresh_token);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

const DEVICE_ID_KEY = "device_id";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  let devId = localStorage.getItem(DEVICE_ID_KEY);
  if (!devId) {
    devId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "dev-" + Math.random().toString(36).substring(2);
    localStorage.setItem(DEVICE_ID_KEY, devId);
  }
  return devId;
}
