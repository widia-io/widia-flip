"use client";

import { useEffect } from "react";

import { EVENTS, logEvent } from "@/lib/analytics";

interface CalculatorPageFunnelTrackerProps {
  source: string;
  postSlug: string;
  ctaPosition: string;
  isLoggedIn: boolean;
}

const VIEW_KEY = "widia_calculator_view_logged";

export function CalculatorPageFunnelTracker({
  source,
  postSlug,
  ctaPosition,
  isLoggedIn,
}: CalculatorPageFunnelTrackerProps) {
  useEffect(() => {
    if (!window.sessionStorage.getItem(VIEW_KEY)) {
      logEvent(EVENTS.VIEW_CALCULATOR, {
        is_logged_in: isLoggedIn,
      });
      window.sessionStorage.setItem(VIEW_KEY, "true");
    }

    if (source === "blog" && postSlug) {
      const key = `widia_blog_to_calculator_${postSlug}_${ctaPosition || "unknown"}`;
      if (window.sessionStorage.getItem(key)) {
        return;
      }

      logEvent(EVENTS.BLOG_TO_CALCULATOR, {
        source: "blog",
        post_slug: postSlug,
        cta_position: ctaPosition || "unknown",
        is_logged_in: isLoggedIn,
      });
      window.sessionStorage.setItem(key, "true");
    }
  }, [source, postSlug, ctaPosition, isLoggedIn]);

  return null;
}
