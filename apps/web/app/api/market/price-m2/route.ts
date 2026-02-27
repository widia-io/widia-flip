import { NextRequest, NextResponse } from "next/server";

import {
  ApiErrorSchema,
  MarketPriceM2QuerySchema,
  MarketPriceM2ResponseSchema,
} from "@widia/shared";

import { getServerAccessToken, getServerSession } from "@/lib/serverAuth";

const GO_API_BASE_URL = process.env.GO_API_BASE_URL ?? "http://localhost:8080";
const CACHE_CONTROL = "s-maxage=300, stale-while-revalidate=3600";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Login required" } },
        { status: 401 },
      );
    }

    const parsedQuery = MarketPriceM2QuerySchema.safeParse({
      city: request.nextUrl.searchParams.get("city") ?? "sp",
      as_of_month: request.nextUrl.searchParams.get("as_of_month"),
      period_months: request.nextUrl.searchParams.get("period_months") ?? 6,
      property_class: request.nextUrl.searchParams.get("property_class") ?? "geral",
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
    const params = new URLSearchParams({
      city: parsedQuery.data.city,
      as_of_month: parsedQuery.data.as_of_month,
      period_months: String(parsedQuery.data.period_months),
      property_class: parsedQuery.data.property_class,
    });

    const res = await fetch(`${GO_API_BASE_URL}/api/v1/public/market/price-m2?${params.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      const maybeError = ApiErrorSchema.safeParse(safeJson(text));
      if (maybeError.success) {
        return NextResponse.json(maybeError.data, { status: res.status });
      }
      return NextResponse.json(
        { error: { code: "UPSTREAM_ERROR", message: "Failed to fetch market price data" } },
        { status: res.status },
      );
    }

    const raw = await res.json();
    const parsedResponse = MarketPriceM2ResponseSchema.safeParse(raw);
    if (!parsedResponse.success) {
      return NextResponse.json(
        { error: { code: "UPSTREAM_ERROR", message: "Invalid market price response" } },
        { status: 502 },
      );
    }

    return NextResponse.json(parsedResponse.data, {
      status: 200,
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  } catch (error) {
    console.error("[api/market/price-m2] error", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 },
    );
  }
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
