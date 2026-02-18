"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { EVENTS, ensureAnalyticsSessionId, logEvent } from "@/lib/analytics";

export function AppAuthFunnelTracker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    ensureAnalyticsSessionId();

    const auth = searchParams.get("auth");
    if (auth !== "login") return;

    const key = "widia_login_completed";
    if (!window.sessionStorage.getItem(key)) {
      logEvent(EVENTS.LOGIN_COMPLETED, {
        source: "login_page",
      });
      window.sessionStorage.setItem(key, "true");
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("auth");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [pathname, router, searchParams]);

  return null;
}
