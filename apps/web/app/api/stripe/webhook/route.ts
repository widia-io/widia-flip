import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const GO_API_BASE_URL = process.env.GO_API_BASE_URL ?? "http://localhost:8080";
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET!;

// Map price IDs to tier names
const PRICE_TO_TIER: Record<string, string> = {};

function getTierFromPriceId(priceId: string): string {
  // Build the map dynamically from env vars
  if (Object.keys(PRICE_TO_TIER).length === 0) {
    const starterPriceId = process.env.STRIPE_PRICE_ID_STARTER;
    const proPriceId = process.env.STRIPE_PRICE_ID_PRO;
    const growthPriceId = process.env.STRIPE_PRICE_ID_GROWTH;

    if (starterPriceId) PRICE_TO_TIER[starterPriceId] = "starter";
    if (proPriceId) PRICE_TO_TIER[proPriceId] = "pro";
    if (growthPriceId) PRICE_TO_TIER[growthPriceId] = "growth";
  }

  return PRICE_TO_TIER[priceId] ?? "starter";
}

async function syncSubscriptionToGoAPI(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;

  const subscriptionItem = subscription.items.data[0];
  const priceId = subscriptionItem?.price.id ?? "";
  const tier = getTierFromPriceId(priceId);

  // Get period from subscription item (newer Stripe API)
  const currentPeriodStart = subscriptionItem?.current_period_start ?? 0;
  const currentPeriodEnd = subscriptionItem?.current_period_end ?? 0;

  // Get user_id from subscription metadata
  let userId = subscription.metadata?.user_id;

  // If not in subscription metadata, try to get from customer
  if (!userId) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer && !customer.deleted) {
        userId = customer.metadata?.user_id;
      }
    } catch (error) {
      console.error("[stripe/webhook] Failed to retrieve customer:", error);
    }
  }

  if (!userId) {
    console.error("[stripe/webhook] No user_id found for subscription:", subscription.id);
    return;
  }

  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null;

  const syncPayload = {
    user_id: userId,
    tier,
    status: subscription.status,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    current_period_start: new Date(currentPeriodStart * 1000).toISOString(),
    current_period_end: new Date(currentPeriodEnd * 1000).toISOString(),
    trial_end: trialEnd,
    cancel_at_period_end: subscription.cancel_at_period_end,
  };

  console.log("[stripe/webhook] Syncing billing to Go API:", {
    user_id: userId,
    tier,
    status: subscription.status,
  });

  const res = await fetch(`${GO_API_BASE_URL}/api/v1/internal/billing/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Secret": INTERNAL_API_SECRET,
    },
    body: JSON.stringify(syncPayload),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[stripe/webhook] Failed to sync billing:", text);
  } else {
    console.log("[stripe/webhook] Billing synced successfully");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const sig = request.headers.get("stripe-signature");

    if (!sig) {
      console.error("[stripe/webhook] Missing stripe-signature header");
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      console.error("[stripe/webhook] Signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    console.log("[stripe/webhook] Received event:", event.type);

    // Handle subscription events
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscriptionToGoAPI(subscription);
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("[stripe/webhook] Checkout completed:", session.id);
        // Subscription events will handle the actual sync
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("[stripe/webhook] Payment failed for invoice:", invoice.id);
        // Subscription status will be updated via subscription events
        break;
      }

      default:
        console.log("[stripe/webhook] Unhandled event type:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[stripe/webhook] Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
