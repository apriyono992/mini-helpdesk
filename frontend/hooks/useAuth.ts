"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken, clearTokens } from "@/lib/auth";
import type { User } from "@/lib/types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAccessToken()) {
      setLoading(false);
      return;
    }
    api.auth
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  function logout() {
    clearTokens();
    window.location.href = "/login";
  }

  return { user, loading, logout };
}
