"use client";

import { useEffect, useState } from "react";

export function useAuth() {
  const [auth, setAuth] = useState<{ user: unknown; role: string | null } | null>(null);
  useEffect(() => {
    fetch("/api/auth/me").then((res) => res.json()).then(setAuth).catch(() => setAuth({ user: null, role: null }));
  }, []);
  return auth;
}
