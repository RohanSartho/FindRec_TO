"use client";

import { useEffect, useState } from "react";

/**
 * Mobile-only scroll hint that fades out after 10 seconds.
 * Rendered fixed at the bottom of the screen so it's always visible
 * regardless of where in the table the user is.
 */
export function ScrollHint() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Start fade-out at 8s so it's fully gone by 10s
    const t = setTimeout(() => setVisible(false), 8000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`
        sm:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50
        pointer-events-none transition-opacity duration-[2000ms]
        ${visible ? "opacity-100" : "opacity-0"}
      `}
    >
      <div className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium shadow-lg whitespace-nowrap"
        style={{ background: "#1a3a2a", color: "#c8f0d4" }}
      >
        👉🏽 Scroll right to see details
      </div>
    </div>
  );
}
