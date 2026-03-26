import { NextRequest, NextResponse } from "next/server";

import {
  ApiErrorSchema,
  EnforcementErrorResponseSchema,
} from "@widia/shared";

import { getServerAccessToken, getServerSession } from "@/lib/serverAuth";
import { buildForwardedAnalyticsHeaders } from "@/lib/serverAnalytics";

const GO_API_BASE_URL = process.env.GO_API_BASE_URL ?? "http://localhost:8080";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; recommendationId: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Login required" } },
        { status: 401 },
      );
    }

    const { id, recommendationId } = await context.params;
    if (!id || !recommendationId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "prospect id and recommendation id are required" } },
        { status: 400 },
      );
    }

    const token = await getServerAccessToken();
    const upstream = await fetch(
      `${GO_API_BASE_URL}/api/v1/prospects/${id}/offer-intelligence/${recommendationId}`,
      {
        method: "DELETE",
        headers: buildForwardedAnalyticsHeaders(request, {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        }),
        cache: "no-store",
      },
    );

    if (!upstream.ok) {
      const text = await upstream.text();
      const parsedJson = safeJson(text);
      const maybeError = ApiErrorSchema.safeParse(parsedJson);
      const maybeEnforcement = EnforcementErrorResponseSchema.safeParse(parsedJson);

      if (maybeError.success) {
        return NextResponse.json(maybeError.data, { status: upstream.status });
      }
      if (maybeEnforcement.success) {
        return NextResponse.json(maybeEnforcement.data, { status: upstream.status });
      }

      return NextResponse.json(
        {
          error: {
            code: "UPSTREAM_ERROR",
            message: "Failed to delete offer intelligence",
          },
        },
        { status: upstream.status },
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(
      "[api/prospects/:id/offer-intelligence/[recommendationId]] error",
      error,
    );
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
