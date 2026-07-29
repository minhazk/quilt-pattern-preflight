"use client";

import { useEffect } from "react";

type PublicEvent =
  | "landing_page_viewed"
  | "sample_report_viewed"
  | "pricing_viewed"
  | "report_viewed"
  | "report_downloaded";

function anonymousId(): string {
  const key = "quilt-preflight-anonymous-id";
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const value = crypto.randomUUID();
  window.sessionStorage.setItem(key, value);
  return value;
}

export function EventBeacon({
  event,
  properties = {},
}: {
  event: PublicEvent;
  properties?: Record<string, string | number | boolean>;
}) {
  useEffect(() => {
    void fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event,
        anonymousId: anonymousId(),
        properties,
      }),
      keepalive: true,
    });
  }, [event, properties]);

  return null;
}
