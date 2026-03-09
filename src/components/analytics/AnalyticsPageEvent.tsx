"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

interface Props {
  event: string;
  properties?: Record<string, unknown>;
}

/** Drop into any server-rendered page to fire a PostHog event on mount. */
export function AnalyticsPageEvent({ event, properties }: Props) {
  useEffect(() => {
    posthog.capture(event, properties ?? {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
