"use client";

import { useEffect, useState } from "react";

export function useAdmin() {
  const [metrics, setMetrics] = useState(null);
  useEffect(() => {
    fetch("/api/admin/metrics").then((res) => res.json()).then((data) => setMetrics(data.metrics ?? null));
  }, []);
  return { metrics };
}
