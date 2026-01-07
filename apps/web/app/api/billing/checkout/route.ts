import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "@/lib/serverAuth";
import { CreateCheckoutRequestSchema, type ActiveBannerResponse } from "@widia/shared";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key);
}

async function getActiveCouponId(): Promise<string | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    const res = await fetch(`${apiUrl}/api/v1/public/promotions/active-banner`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data: ActiveBannerResponse = await res.json();
    return data.banner?.stripeCouponId || null;
  } catch {
    return null;
  }
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

    const { tier, interval, voucher_code } = parsed.data;
    const priceId = PRICE_IDS[tier]?.[interval];
    if (!priceId) {
      return NextResponse.json(
        { error: { code: "INVALID_TIER", message: `Price not configured for tier: ${tier} (${interval})` } },
        { status: 400 }
      );
    }

    // Get coupon: use voucher_code if provided, otherwise check active banner
    let couponId = voucher_code || null;
    if (!couponId) {
      couponId = await getActiveCouponId();
    }

    const stripe = getStripe();

    // Validate and determine discount type (promo code vs coupon)
    let discount: { coupon: string } | { promotion_code: string } | null = null;
    if (couponId) {
      try {
        if (couponId.startsWith("promo_")) {
          // It's a promotion code
          await stripe.promotionCodes.retrieve(couponId);
          discount = { promotion_code: couponId };
        } else {
          // It's a coupon
          await stripe.coupons.retrieve(couponId);
          discount = { coupon: couponId };
        }
      } catch {
        console.warn(`[billing/checkout] Discount ${couponId} not found, allowing manual promo codes`);
      }
    }

    // Build checkout session options
    const checkoutOptions: Stripe.Checkout.SessionCreateParams = {
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
      // Stripe doesn't allow both allow_promotion_codes and discounts
      ...(discount
        ? { discounts: [discount] }
        : { allow_promotion_codes: true }),
    };

    const checkoutSession = await stripe.checkout.sessions.create(checkoutOptions);

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
