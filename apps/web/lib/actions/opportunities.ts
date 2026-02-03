"use server";

import { ListOpportunitiesResponseSchema, ListJobRunsResponseSchema, type ListOpportunitiesResponse, type ListJobRunsResponse } from "@widia/shared";

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || "http://localhost:8080";
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

async function internalFetch<T>(path: string): Promise<T> {
  if (!INTERNAL_API_SECRET) {
    throw new Error("INTERNAL_API_SECRET not configured");
  }

  const res = await fetch(`${INTERNAL_API_URL}${path}`, {
    headers: {
      "X-Internal-Secret": INTERNAL_API_SECRET,
      "Accept": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Internal API error: ${res.status} - ${text}`);
  }

  return res.json();
}

export interface ListOpportunitiesParams {
  city?: string;
  neighborhood?: string;
  minScore?: number;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  bedrooms?: number[];
  status?: string[];
  sort?: string;
  limit?: number;
  offset?: number;
}

export async function listOpportunities(
  params: ListOpportunitiesParams = {}
): Promise<{ data: ListOpportunitiesResponse | null; error: string | null }> {
  try {
    const searchParams = new URLSearchParams();

    if (params.city) searchParams.set("city", params.city);
    if (params.neighborhood) searchParams.set("neighborhood", params.neighborhood);
    if (params.minScore !== undefined) searchParams.set("min_score", String(params.minScore));
    if (params.minPrice !== undefined) searchParams.set("min_price", String(params.minPrice));
    if (params.maxPrice !== undefined) searchParams.set("max_price", String(params.maxPrice));
    if (params.minArea !== undefined) searchParams.set("min_area", String(params.minArea));
    if (params.maxArea !== undefined) searchParams.set("max_area", String(params.maxArea));
    if (params.bedrooms?.length) searchParams.set("bedrooms", params.bedrooms.join(","));
    if (params.status?.length) searchParams.set("status", params.status.join(","));
    if (params.sort) searchParams.set("sort", params.sort);
    if (params.limit !== undefined) searchParams.set("limit", String(params.limit));
    if (params.offset !== undefined) searchParams.set("offset", String(params.offset));

    const query = searchParams.toString();
    const path = `/api/v1/internal/opportunities${query ? `?${query}` : ""}`;

    const raw = await internalFetch<ListOpportunitiesResponse>(path);
    const parsed = ListOpportunitiesResponseSchema.parse(raw);

    return { data: parsed, error: null };
  } catch (err) {
    console.error("listOpportunities error:", err);
    return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function listJobRuns(
  limit = 20
): Promise<{ data: ListJobRunsResponse | null; error: string | null }> {
  try {
    const path = `/api/v1/internal/job-runs?limit=${limit}`;
    const raw = await internalFetch<ListJobRunsResponse>(path);
    const parsed = ListJobRunsResponseSchema.parse(raw);

    return { data: parsed, error: null };
  } catch (err) {
    console.error("listJobRuns error:", err);
    return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
