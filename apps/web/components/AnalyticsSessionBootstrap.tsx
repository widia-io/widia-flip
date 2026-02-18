"use client";

import { useEffect } from "react";

import { ensureAnalyticsSessionId } from "@/lib/analytics";

export function AnalyticsSessionBootstrap() {
  useEffect(() => {
    ensureAnalyticsSessionId();
  }, []);

  return null;
}
