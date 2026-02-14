import { NextResponse } from "next/server";

import {
  PublicCalculatorLeadRequestSchema,
  PublicCalculatorLeadResponseSchema,
} from "@widia/shared";
import { EVENTS, logEvent } from "@/lib/analytics";

const GO_API_BASE_URL = process.env.GO_API_BASE_URL ?? "http://localhost:8080";

function normalizeWhatsApp(value: string): string {
  return value.replace(/\D/g, "");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const normalizedBody = {
      ...body,
      whatsapp: typeof body?.whatsapp === "string"
        ? normalizeWhatsApp(body.whatsapp)
        : body?.whatsapp,
      marketingConsent: body?.marketingConsent === true,
    };

    const parsed = PublicCalculatorLeadRequestSchema.safeParse(normalizedBody);
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

    logEvent(EVENTS.LEAD_CAPTURE_SUBMITTED, {
      has_purchase_price: parsed.data.purchase_price !== undefined,
      has_sale_price: parsed.data.sale_price !== undefined,
      marketing_consent: parsed.data.marketingConsent,
    });

    const res = await fetch(`${GO_API_BASE_URL}/api/v1/public/calculator-leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[calculator/report] Go API error:", text);
      let message = "Failed to unlock full report";
      try {
        const parsedError = JSON.parse(text) as {
          error?: { message?: string };
        };
        if (parsedError.error?.message) {
          message = parsedError.error.message;
        }
      } catch {
        // Keep default message
      }
      return NextResponse.json(
        {
          error: {
            code: "LEAD_CAPTURE_ERROR",
            message,
          },
        },
        { status: res.status },
      );
    }

    const data = await res.json();
    const parsedResponse = PublicCalculatorLeadResponseSchema.safeParse(data);
    if (!parsedResponse.success) {
      console.error(
        "[calculator/report] Invalid Go API response:",
        parsedResponse.error.flatten(),
      );
      return NextResponse.json(
        {
          error: {
            code: "LEAD_CAPTURE_ERROR",
            message: "Invalid report response",
          },
        },
        { status: 502 },
      );
    }

    logEvent(EVENTS.FULL_REPORT_UNLOCKED, {
      lead_id: parsedResponse.data.lead_id,
    });

    return NextResponse.json(parsedResponse.data);
  } catch (error) {
    console.error("[calculator/report] Error:", error);
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
