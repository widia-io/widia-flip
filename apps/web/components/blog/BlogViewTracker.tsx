"use client";

import { useEffect } from "react";

import { EVENTS, ensureAnalyticsSessionId, logEvent } from "@/lib/analytics";

interface BlogViewTrackerProps {
  slug: string;
  tags: string[];
}

export function BlogViewTracker({ slug, tags }: BlogViewTrackerProps) {
  useEffect(() => {
    ensureAnalyticsSessionId();

    const eventKey = `widia_blog_view_${slug}`;
    if (window.sessionStorage.getItem(eventKey)) {
      return;
    }

    logEvent(EVENTS.VIEW_BLOG_POST, {
      post_slug: slug,
      post_tags: tags,
    });
    window.sessionStorage.setItem(eventKey, "true");
  }, [slug, tags]);

  return null;
}
