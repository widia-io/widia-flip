import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "@/lib/serverAuth";
import { CreateCheckoutRequestSchema } from "@widia/shared";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_IDS: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_ID_STARTER,
  pro: process.env.STRIPE_PRICE_ID_PRO,
  growth: process.env.STRIPE_PRICE_ID_GROWTH,
};

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
    const parsed = CreateCheckoutRequestSchema.safeParse(body);
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

    const priceId = PRICE_IDS[parsed.data.tier];
    if (!priceId) {
      return NextResponse.json(
        { error: { code: "INVALID_TIER", message: `Price not configured for tier: ${parsed.data.tier}` } },
        { status: 400 }
      );
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: parsed.data.success_url,
      cancel_url: parsed.data.cancel_url,
      client_reference_id: session.user.id,
      customer_email: session.user.email,
      metadata: {
        user_id: session.user.id,
        tier: parsed.data.tier,
      },
      subscription_data: {
        metadata: {
          user_id: session.user.id,
          tier: parsed.data.tier,
        },
      },
    });

    return NextResponse.json({
      checkout_url: checkoutSession.url,
      session_id: checkoutSession.id,
    });
  } catch (error) {
    console.error("[billing/checkout] Error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create checkout session" } },
      { status: 500 }
    );
  }
}
