"use client";

import { useEffect, useState } from "react";

interface ScrollHintProps {
  /** Increment this on every search to re-show the hint. */
  triggerKey?: number;
}

/**
 * Mobile-only scroll hint that fades out after 30 seconds.
 * Re-appears each time `triggerKey` changes (i.e. on every Find click).
 * Rendered fixed at the bottom of the screen so it's always visible
 * regardless of where in the table the user is.
 */
export function ScrollHint({ triggerKey = 0 }: ScrollHintProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (triggerKey === 0) return; // don't show on initial mount
    setVisible(true);
    // Start fade-out at 28s so it's fully gone by 30s
    const t = setTimeout(() => setVisible(false), 28000);
    return () => clearTimeout(t);
  }, [triggerKey]);

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
