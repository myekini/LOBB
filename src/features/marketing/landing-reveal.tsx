"use client";

import { useEffect } from "react";

/**
 * Scroll-reveal for the landing page. Renders nothing — it just binds an
 * IntersectionObserver to every `[data-reveal]` element that is still below the
 * fold on mount, so content stays visible if JS never runs. The landing markup
 * is server-rendered, so a single pass on mount is enough.
 */
export function LandingReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("lobb-reveal-in");
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.15 },
    );

    for (const el of els) {
      if (el.getBoundingClientRect().top > window.innerHeight * 0.9) {
        el.classList.add("lobb-reveal-pending");
        io.observe(el);
      }
    }

    return () => io.disconnect();
  }, []);

  return null;
}
