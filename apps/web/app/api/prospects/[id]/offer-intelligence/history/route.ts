import { NextRequest, NextResponse } from "next/server";

import {
  ApiErrorSchema,
  EnforcementErrorResponseSchema,
  OfferIntelligenceHistoryQuerySchema,
  OfferIntelligenceHistoryResponseSchema,
} from "@widia/shared";

import { getServerAccessToken, getServerSession } from "@/lib/serverAuth";

const GO_API_BASE_URL = process.env.GO_API_BASE_URL ?? "http://localhost:8080";

export async function GET(
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

    const parsedQuery = OfferIntelligenceHistoryQuerySchema.safeParse({
      limit: request.nextUrl.searchParams.get("limit") ?? 20,
      cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    });
    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsedQuery.error.errors[0]?.message ?? "Invalid query",
          },
        },
        { status: 400 },
      );
    }

    const token = await getServerAccessToken();
    const query = new URLSearchParams({ limit: String(parsedQuery.data.limit) });
    if (parsedQuery.data.cursor) {
      query.set("cursor", parsedQuery.data.cursor);
    }

    const upstream = await fetch(
      `${GO_API_BASE_URL}/api/v1/prospects/${id}/offer-intelligence/history?${query.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
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
            message: "Failed to fetch offer intelligence history",
          },
        },
        { status: upstream.status },
      );
    }

    const raw = await upstream.json();
    const parsedResponse = OfferIntelligenceHistoryResponseSchema.safeParse(raw);
    if (!parsedResponse.success) {
      return NextResponse.json(
        { error: { code: "UPSTREAM_ERROR", message: "Invalid upstream response" } },
        { status: 502 },
      );
    }

    return NextResponse.json(parsedResponse.data, { status: 200 });
  } catch (error) {
    console.error("[api/prospects/:id/offer-intelligence/history] error", error);
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
