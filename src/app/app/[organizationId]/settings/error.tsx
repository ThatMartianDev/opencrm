"use client";

import { useEffect } from "react";

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Settings error:", error);
  }, [error]);

  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h2 style={{ marginBottom: "16px" }}>Settings Error</h2>
      <p style={{ color: "#666", marginBottom: "24px" }}>
        Failed to load settings. Please try again.
      </p>
      <button
        onClick={reset}
        style={{
          padding: "10px 20px",
          background: "#111",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        Try again
      </button>
    </div>
  );
}
