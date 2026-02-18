"use client";

import { useEffect } from "react";

import { EVENTS, ensureAnalyticsSessionId, logEvent } from "@/lib/analytics";

const HOME_VIEW_SESSION_KEY = "widia_home_view_logged";

export function HomeFunnelTracker() {
  useEffect(() => {
    ensureAnalyticsSessionId();

    if (!window.sessionStorage.getItem(HOME_VIEW_SESSION_KEY)) {
      logEvent(EVENTS.HOME_VIEW);
      window.sessionStorage.setItem(HOME_VIEW_SESSION_KEY, "true");
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const element = target.closest<HTMLElement>("[data-funnel-event]");
      if (!element) return;

      const funnelEvent = element.getAttribute("data-funnel-event");
      if (!funnelEvent) return;

      logEvent(funnelEvent, {
        cta: element.getAttribute("data-funnel-cta") ?? undefined,
        location: element.getAttribute("data-funnel-location") ?? undefined,
      });
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
