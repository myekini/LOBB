"use client";

import { useEffect, useState } from "react";

export function useBookings() {
  const [bookings, setBookings] = useState([]);
  useEffect(() => {
    fetch("/api/bookings").then((res) => res.json()).then((data) => setBookings(data.bookings ?? []));
  }, []);
  return bookings;
}
