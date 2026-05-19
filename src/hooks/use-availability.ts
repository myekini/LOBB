"use client";

import { useEffect, useState } from "react";

export function useAvailability(coachId?: string) {
  const [slots, setSlots] = useState([]);
  useEffect(() => {
    if (!coachId) return;
    fetch(`/api/coaches/availability/${coachId}`).then((res) => res.json()).then((data) => setSlots(data.slots ?? []));
  }, [coachId]);
  return slots;
}
