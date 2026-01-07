import { NextResponse } from "next/server";
import type { ActiveBannerResponse, UserEntitlements } from "@widia/shared";
import { getServerSession, getServerAccessToken } from "@/lib/serverAuth";

async function hasActivePaidSubscription(): Promise<boolean> {
  try {
    const session = await getServerSession();
    if (!session?.user) return false;

    const token = await getServerAccessToken();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    const res = await fetch(`${apiUrl}/api/v1/billing/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) return false;

    const data: UserEntitlements = await res.json();
    // Hide banner if user is subscribed with a non-trialing status
    return data.is_subscribed && data.billing.status !== "trialing";
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    // If user has active paid subscription, don't show banner
    const hasPaidSub = await hasActivePaidSubscription();
    console.log("[active-banner] hasActivePaidSubscription:", hasPaidSub);

    if (hasPaidSub) {
      console.log("[active-banner] Hiding banner for paid subscriber");
      return NextResponse.json({ banner: null } satisfies ActiveBannerResponse);
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    const fetchUrl = `${apiUrl}/api/v1/public/promotions/active-banner`;
    console.log("[active-banner] Fetching from:", fetchUrl);

    const res = await fetch(fetchUrl, {
      cache: "no-store",
    });

    console.log("[active-banner] Go API response status:", res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.log("[active-banner] Go API error response:", errorText);
      return NextResponse.json({ banner: null } satisfies ActiveBannerResponse);
    }

    const data: ActiveBannerResponse = await res.json();
    console.log("[active-banner] Go API returned:", JSON.stringify(data));
    return NextResponse.json(data);
  } catch (error) {
    console.error("[active-banner] Exception:", error);
    return NextResponse.json({ banner: null } satisfies ActiveBannerResponse);
  }
}
