"use client";

import { useEffect } from "react";

import { EVENTS, logEvent } from "@/lib/analytics";

interface BlogViewTrackerProps {
  slug: string;
  tags: string[];
}

export function BlogViewTracker({ slug, tags }: BlogViewTrackerProps) {
  useEffect(() => {
    void fetch("/api/analytics/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event: EVENTS.VIEW_BLOG_POST,
        properties: {
          post_slug: slug,
          post_tags: tags,
        },
      }),
    }).catch(() => {
      logEvent(EVENTS.VIEW_BLOG_POST, {
        post_slug: slug,
        post_tags: tags,
      });
    });
  }, [slug, tags]);

  return null;
}
