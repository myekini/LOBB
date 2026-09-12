"use client";

import { useEffect } from "react";

// Fires only when the root layout itself throws (rarer than a route-level
// crash, which src/app/error.tsx handles) — Next.js requires this to render
// its own <html>/<body> since the real layout is what failed.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[global-error]", error.message, error.digest ?? "", error.stack ?? "");
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#FAFAF8", color: "#0D0D0D" }}>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "18px", fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ marginTop: "8px", maxWidth: "280px", fontSize: "13px", color: "#6B6B68" }}>
            LOBB hit a snag loading this page. Try again, and if it keeps happening let us know.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "24px",
              height: "48px",
              padding: "0 24px",
              borderRadius: "12px",
              background: "#0D0D0D",
              color: "#FAFAF8",
              fontSize: "14px",
              fontWeight: 500,
              border: "none",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
