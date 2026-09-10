"use client";

import { useEffect } from "react";

/**
 * Scroll-reveal for the landing page. Renders nothing.
 *
 * The inline script in <LandingSplash> adds `.lobb-reveal-js` to <html> before
 * first paint, so `[data-reveal]` elements start hidden (via CSS) and animate in
 * instead of flashing visible→hidden. Without JS the class is never added and
 * everything stays visible. This effect just adds `.lobb-reveal-in` as each
 * element enters the viewport; above-fold elements fire on mount.
 */
export function LandingReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const reveal = (el: Element) => el.classList.add("lobb-reveal-in");

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      els.forEach(reveal);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            reveal(entry.target);
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.15 },
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
