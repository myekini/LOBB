"use client";

import { useEffect, useState } from "react";

export function useReviews(coachId?: string) {
  const [reviews, setReviews] = useState([]);
  useEffect(() => {
    if (!coachId) return;
    fetch(`/api/reviews/coach/${coachId}`).then((res) => res.json()).then((data) => setReviews(data.reviews ?? []));
  }, [coachId]);
  return reviews;
}
