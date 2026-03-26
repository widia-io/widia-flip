import { NextRequest, NextResponse } from "next/server";

import {
  ApiErrorSchema,
  EnforcementErrorResponseSchema,
  OfferIntelligenceGenerateRequestSchema,
  OfferIntelligencePreviewSchema,
} from "@widia/shared";

import { getServerAccessToken, getServerSession } from "@/lib/serverAuth";
import { buildForwardedAnalyticsHeaders } from "@/lib/serverAnalytics";

const GO_API_BASE_URL = process.env.GO_API_BASE_URL ?? "http://localhost:8080";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Login required" } },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "prospect id is required" } },
        { status: 400 },
      );
    }

    const rawBody = await request.text();
    const parsedBody = OfferIntelligenceGenerateRequestSchema.safeParse(
      rawBody ? safeJson(rawBody) : {},
    );
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsedBody.error.errors[0]?.message ?? "Invalid request body",
          },
        },
        { status: 400 },
      );
    }

    const token = await getServerAccessToken();
    const upstream = await fetch(
      `${GO_API_BASE_URL}/api/v1/prospects/${id}/offer-intelligence/generate`,
      {
        method: "POST",
        headers: buildForwardedAnalyticsHeaders(request, {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
        body: JSON.stringify(parsedBody.data),
        cache: "no-store",
      },
    );

    if (!upstream.ok) {
      const text = await upstream.text();
      const parsedJson = safeJson(text);
      const maybeError = ApiErrorSchema.safeParse(parsedJson);
      const maybeEnforcement = EnforcementErrorResponseSchema.safeParse(parsedJson);
      const retryAfter = upstream.headers.get("Retry-After");
      const headers = retryAfter ? { "Retry-After": retryAfter } : undefined;

      if (maybeError.success) {
        return NextResponse.json(maybeError.data, {
          status: upstream.status,
          headers,
        });
      }
      if (maybeEnforcement.success) {
        return NextResponse.json(maybeEnforcement.data, {
          status: upstream.status,
          headers,
        });
      }

      return NextResponse.json(
        {
          error: {
            code: "UPSTREAM_ERROR",
            message: "Failed to generate offer intelligence",
          },
        },
        {
          status: upstream.status,
          headers,
        },
      );
    }

    const raw = await upstream.json();
    const parsedResponse = OfferIntelligencePreviewSchema.safeParse(raw);
    if (!parsedResponse.success) {
      return NextResponse.json(
        { error: { code: "UPSTREAM_ERROR", message: "Invalid upstream response" } },
        { status: 502 },
      );
    }

    return NextResponse.json(parsedResponse.data, { status: 200 });
  } catch (error) {
    console.error("[api/prospects/:id/offer-intelligence/generate] error", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 },
    );
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
