import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "@/lib/serverAuth";
import { apiFetch } from "@/lib/apiFetch";
import { CreatePortalRequestSchema, type UserEntitlements } from "@widia/shared";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key);
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Login required" } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = CreatePortalRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request",
            details: parsed.error.errors.map((e) => e.message),
          },
        },
        { status: 400 }
      );
    }

    const entitlements = await apiFetch<UserEntitlements>("/api/v1/billing/me");

    if (!entitlements?.billing?.stripe_customer_id) {
      return NextResponse.json(
        { error: { code: "NO_SUBSCRIPTION", message: "No active subscription found" } },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: entitlements.billing.stripe_customer_id,
      return_url: parsed.data.return_url,
    });

    return NextResponse.json({
      portal_url: portalSession.url,
    });
  } catch (error) {
    console.error("[billing/portal] Error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create portal session" } },
      { status: 500 }
    );
  }
}
