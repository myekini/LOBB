"use client";

export function usePaystack() {
  return {
    redirectToCheckout(url: string) {
      window.location.href = url;
    },
  };
}
