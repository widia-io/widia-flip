import { NextResponse } from "next/server";

import { PublicCashCalcRequestSchema } from "@widia/shared";
import { logEvent } from "@/lib/analytics";

const GO_API_BASE_URL = process.env.GO_API_BASE_URL ?? "http://localhost:8080";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request
    const parsed = PublicCashCalcRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.errors[0]?.message ?? "Invalid request",
          },
        },
        { status: 400 },
      );
    }

    // Log event
    logEvent("calculate_submitted", {
      has_purchase_price: parsed.data.purchase_price !== undefined,
      has_sale_price: parsed.data.sale_price !== undefined,
    });

    // Call Go API public endpoint
    const res = await fetch(`${GO_API_BASE_URL}/api/v1/public/cash-calc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[calculator/calculate] Go API error:", text);
      return NextResponse.json(
        {
          error: {
            code: "CALC_ERROR",
            message: "Failed to calculate",
          },
        },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[calculator/calculate] Error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error",
        },
      },
      { status: 500 },
    );
  }
}
