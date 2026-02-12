"use server";

import { revalidatePath } from "next/cache";

import {
  ListJobRunsResponseSchema,
  ListOpportunitiesResponseSchema,
  OpportunityFacetsResponseSchema,
  UpdateOpportunityStatusRequestSchema,
  UpdateOpportunityStatusResponseSchema,
  type ListJobRunsResponse,
  type ListOpportunitiesResponse,
  type OpportunityFacetsResponse,
  type OpportunityStatus,
  type UpdateOpportunityStatusResponse,
} from "@widia/shared";

import { apiFetch } from "@/lib/apiFetch";

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
  state?: string;
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

    if (params.state) searchParams.set("state", params.state);
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
    const path = `/api/v1/opportunities${query ? `?${query}` : ""}`;

    const raw = await apiFetch<ListOpportunitiesResponse>(path);
    const parsed = ListOpportunitiesResponseSchema.parse(raw);

    return { data: parsed, error: null };
  } catch (err) {
    console.error("listOpportunities error:", err);
    return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function listOpportunityFacetsAction(
  params: ListOpportunitiesParams = {}
): Promise<{ data: OpportunityFacetsResponse | null; error: string | null }> {
  try {
    const searchParams = new URLSearchParams();

    if (params.state) searchParams.set("state", params.state);
    if (params.city) searchParams.set("city", params.city);
    if (params.neighborhood) searchParams.set("neighborhood", params.neighborhood);
    if (params.minScore !== undefined) searchParams.set("min_score", String(params.minScore));
    if (params.minPrice !== undefined) searchParams.set("min_price", String(params.minPrice));
    if (params.maxPrice !== undefined) searchParams.set("max_price", String(params.maxPrice));
    if (params.minArea !== undefined) searchParams.set("min_area", String(params.minArea));
    if (params.maxArea !== undefined) searchParams.set("max_area", String(params.maxArea));
    if (params.bedrooms?.length) searchParams.set("bedrooms", params.bedrooms.join(","));
    if (params.status?.length) searchParams.set("status", params.status.join(","));

    const query = searchParams.toString();
    const path = `/api/v1/opportunities/facets${query ? `?${query}` : ""}`;

    const raw = await apiFetch<OpportunityFacetsResponse>(path);
    const parsed = OpportunityFacetsResponseSchema.parse(raw);

    return { data: parsed, error: null };
  } catch (err) {
    console.error("listOpportunityFacetsAction error:", err);
    return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function updateOpportunityStatusAction(
  opportunityId: string,
  status: OpportunityStatus
): Promise<{ data: UpdateOpportunityStatusResponse | null; error: string | null }> {
  const parsedReq = UpdateOpportunityStatusRequestSchema.safeParse({ status });
  if (!parsedReq.success) {
    return { data: null, error: parsedReq.error.errors[0]?.message ?? "Dados inválidos" };
  }

  try {
    const raw = await apiFetch<UpdateOpportunityStatusResponse>(
      `/api/v1/opportunities/${opportunityId}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedReq.data),
      }
    );
    const parsed = UpdateOpportunityStatusResponseSchema.parse(raw);
    revalidatePath("/app/opportunities");
    return { data: parsed, error: null };
  } catch (err) {
    console.error("updateOpportunityStatusAction error:", err);
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
