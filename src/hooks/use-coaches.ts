"use client";

import { useEffect, useState } from "react";

export function useCoaches(query = "") {
  const [coaches, setCoaches] = useState([]);
  useEffect(() => {
    fetch(`/api/coaches${query ? `?${query}` : ""}`).then((res) => res.json()).then((data) => setCoaches(data.coaches ?? []));
  }, [query]);
  return coaches;
}
