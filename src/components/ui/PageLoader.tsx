"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Thin progress bar at the top of the page that animates on every route change.
 * Skips the very first render (initial page load) to avoid a flash on arrival.
 */
export function PageLoader() {
  const pathname = usePathname();
  const [pct, setPct] = useState(0);
  const [visible, setVisible] = useState(false);
  const firstRender = useRef(true);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    // Clear any running timers from a previous navigation
    timers.current.forEach(clearTimeout);
    timers.current = [];

    // Start animation
    setVisible(true);
    setPct(15);

    const t1 = setTimeout(() => setPct(60), 120);
    const t2 = setTimeout(() => setPct(88), 320);
    const t3 = setTimeout(() => {
      setPct(100);
      const t4 = setTimeout(() => {
        setVisible(false);
        setPct(0);
      }, 280);
      timers.current.push(t4);
    }, 550);

    timers.current.push(t1, t2, t3);

    return () => timers.current.forEach(clearTimeout);
  }, [pathname]);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[2.5px] pointer-events-none"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 250ms ease" }}
    >
      <div
        className="h-full bg-brand"
        style={{
          width: `${pct}%`,
          transition: pct === 0 ? "none" : "width 350ms ease-out",
          boxShadow: "0 0 6px 0 rgba(26,58,42,0.35)",
        }}
      />
    </div>
  );
}
