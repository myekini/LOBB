"use client";

import { useState } from "react";

/**
 * Coach card thumbnail. Falls back to the initial letter if the photo URL is
 * missing or fails to load (server components can't attach onError, so this
 * small client island owns it).
 */
export function CoachThumb({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div className="relative aspect-[16/10] overflow-hidden bg-[var(--lobb-bg-secondary)]">
      <div className="absolute inset-0 flex items-center justify-center text-4xl font-semibold text-[var(--lobb-text-tertiary)]">
        {name.charAt(0)}
      </div>
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src as string}
          alt={name}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover object-top transition duration-500 group-hover:scale-[1.03]"
        />
      )}
    </div>
  );
}
