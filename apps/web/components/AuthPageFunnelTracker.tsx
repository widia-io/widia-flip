"use client";

import { useEffect } from "react";

import { EVENTS, ensureAnalyticsSessionId, logEvent } from "@/lib/analytics";

interface AuthPageFunnelTrackerProps {
  success?: string;
}

export function AuthPageFunnelTracker({ success }: AuthPageFunnelTrackerProps) {
  useEffect(() => {
    ensureAnalyticsSessionId();

    if (!success) return;
    if (success !== "verify_email" && success !== "account_created") return;

    const key = `widia_signup_completed_${success}`;
    if (window.sessionStorage.getItem(key)) return;

    logEvent(EVENTS.SIGNUP_COMPLETED, {
      source: "login_page",
      success,
    });
    window.sessionStorage.setItem(key, "true");
  }, [success]);

  return null;
}
