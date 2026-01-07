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
    // Hide banner if user is subscribed with a non-trial tier
    return data.is_subscribed && data.billing.tier !== "trial";
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    // If user has active paid subscription, don't show banner
    if (await hasActivePaidSubscription()) {
      return NextResponse.json({ banner: null } satisfies ActiveBannerResponse);
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    const res = await fetch(`${apiUrl}/api/v1/public/promotions/active-banner`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ banner: null } satisfies ActiveBannerResponse);
    }

    const data: ActiveBannerResponse = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ banner: null } satisfies ActiveBannerResponse);
  }
}
