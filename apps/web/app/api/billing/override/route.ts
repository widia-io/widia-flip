import { NextResponse } from "next/server";
import { OverrideBillingRequestSchema } from "@widia/shared";

const GO_API_BASE_URL = process.env.GO_API_BASE_URL ?? "http://localhost:8080";
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET!;

export async function POST(request: Request) {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Not available in production" } },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = OverrideBillingRequestSchema.safeParse(body);
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

    // Call Go API internal endpoint
    const res = await fetch(`${GO_API_BASE_URL}/api/v1/internal/billing/override`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": INTERNAL_API_SECRET,
      },
      body: JSON.stringify(parsed.data),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[billing/override] Go API error:", text);
      return NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "Failed to override billing" } },
        { status: 500 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[billing/override] Error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to override billing" } },
      { status: 500 }
    );
  }
}
