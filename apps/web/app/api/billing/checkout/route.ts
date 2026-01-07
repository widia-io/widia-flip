import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "@/lib/serverAuth";
import { CreateCheckoutRequestSchema } from "@widia/shared";

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

    const PRICE_IDS: Record<string, Record<string, string | undefined>> = {
      starter: {
        monthly: process.env.STRIPE_PRICE_ID_STARTER,
        yearly: process.env.STRIPE_PRICE_ID_STARTER_YEARLY,
      },
      pro: {
        monthly: process.env.STRIPE_PRICE_ID_PRO,
        yearly: process.env.STRIPE_PRICE_ID_PRO_YEARLY,
      },
      growth: {
        monthly: process.env.STRIPE_PRICE_ID_GROWTH,
        yearly: process.env.STRIPE_PRICE_ID_GROWTH_YEARLY,
      },
    };

    const { tier, interval } = parsed.data;
    const priceId = PRICE_IDS[tier]?.[interval];
    if (!priceId) {
      return NextResponse.json(
        { error: { code: "INVALID_TIER", message: `Price not configured for tier: ${tier} (${interval})` } },
        { status: 400 }
      );
    }

    const stripe = getStripe();
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
        tier,
        interval,
      },
      subscription_data: {
        metadata: {
          user_id: session.user.id,
          tier,
          interval,
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
