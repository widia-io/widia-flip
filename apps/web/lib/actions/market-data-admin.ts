"use server";

import { revalidatePath } from "next/cache";
import {
  ApproveMarketRegionAliasRequestSchema,
  ListMarketIngestionRunsResponseSchema,
  ListMarketRegionAliasesQuerySchema,
  ListMarketRegionAliasesResponseSchema,
  MarketIngestionRunSchema,
  MarketIngestionUploadUrlRequestSchema,
  MarketIngestionUploadUrlResponseSchema,
  MarketRegionAliasSchema,
  RunMarketIngestionRequestSchema,
  RunMarketIngestionResponseSchema,
  type ListMarketIngestionRunsResponse,
  type ListMarketRegionAliasesResponse,
  type MarketIngestionRun,
  type MarketIngestionUploadUrlResponse,
  type MarketRegionAlias,
  type RunMarketIngestionRequest,
  type RunMarketIngestionResponse,
} from "@widia/shared";

import { apiFetch } from "@/lib/apiFetch";

function rethrowWithEndpointHint(error: unknown): never {
  const message = error instanceof Error ? error.message : "Erro desconhecido";
  if (message.includes("API_ERROR_404")) {
    throw new Error(
      "Endpoint de Market Data Admin nao encontrado na API. Reinicie/redeploy o backend e aplique as migrations 0045 e 0046."
    );
  }
  if (error instanceof Error) {
    throw error;
  }
  throw new Error(message);
}

export async function listMarketIngestionRuns(params?: {
  city?: "sp";
  limit?: number;
  offset?: number;
}): Promise<{ data: ListMarketIngestionRunsResponse | null; error: string | null }> {
  try {
    const searchParams = new URLSearchParams();
    searchParams.set("city", params?.city ?? "sp");
    if (typeof params?.limit === "number") {
      searchParams.set("limit", String(params.limit));
    }
    if (typeof params?.offset === "number") {
      searchParams.set("offset", String(params.offset));
    }

    const raw = await apiFetch(`/api/v1/admin/market/ingestions?${searchParams.toString()}`);
    const parsed = ListMarketIngestionRunsResponseSchema.parse(raw);
    return { data: parsed, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Erro desconhecido" };
  }
}

export async function getMarketIngestionRun(runId: string): Promise<MarketIngestionRun | null> {
  try {
    const raw = await apiFetch(`/api/v1/admin/market/ingestions/${runId}`);
    return MarketIngestionRunSchema.parse(raw);
  } catch (error) {
    rethrowWithEndpointHint(error);
  }
}

export async function getMarketIngestionUploadUrl(input: {
  city?: "sp";
  filename: string;
  content_type: string;
  size_bytes: number;
}): Promise<MarketIngestionUploadUrlResponse> {
  try {
    const payload = MarketIngestionUploadUrlRequestSchema.parse({
      city: input.city ?? "sp",
      filename: input.filename,
      content_type: input.content_type,
      size_bytes: input.size_bytes,
    });

    const raw = await apiFetch("/api/v1/admin/market/ingestions/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return MarketIngestionUploadUrlResponseSchema.parse(raw);
  } catch (error) {
    rethrowWithEndpointHint(error);
  }
}

export async function runMarketIngestion(input: RunMarketIngestionRequest): Promise<RunMarketIngestionResponse> {
  try {
    const payload = RunMarketIngestionRequestSchema.parse(input);
    const raw = await apiFetch("/api/v1/admin/market/ingestions/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const parsed = RunMarketIngestionResponseSchema.parse(raw);

    revalidatePath("/app/admin/market-data");
    revalidatePath("/app/market-data");

    return parsed;
  } catch (error) {
    rethrowWithEndpointHint(error);
  }
}

export async function listMarketRegionAliases(params?: {
  city?: "sp";
  status?: "pending" | "approved" | "rejected";
  limit?: number;
  offset?: number;
}): Promise<{ data: ListMarketRegionAliasesResponse | null; error: string | null }> {
  try {
    const query = ListMarketRegionAliasesQuerySchema.parse({
      city: params?.city ?? "sp",
      status: params?.status,
      limit: params?.limit,
      offset: params?.offset,
    });

    const searchParams = new URLSearchParams();
    searchParams.set("city", query.city);
    if (query.status) {
      searchParams.set("status", query.status);
    }
    searchParams.set("limit", String(query.limit));
    searchParams.set("offset", String(query.offset));

    const raw = await apiFetch(`/api/v1/admin/market/aliases?${searchParams.toString()}`);
    const parsed = ListMarketRegionAliasesResponseSchema.parse(raw);
    return { data: parsed, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Erro desconhecido" };
  }
}

export async function approveMarketRegionAlias(aliasId: string, canonicalName: string): Promise<MarketRegionAlias> {
  try {
    const payload = ApproveMarketRegionAliasRequestSchema.parse({
      canonical_name: canonicalName,
    });

    const raw = await apiFetch(`/api/v1/admin/market/aliases/${aliasId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const parsed = MarketRegionAliasSchema.parse(raw);
    revalidatePath("/app/admin/market-data");
    return parsed;
  } catch (error) {
    rethrowWithEndpointHint(error);
  }
}

export async function rejectMarketRegionAlias(aliasId: string): Promise<MarketRegionAlias> {
  try {
    const raw = await apiFetch(`/api/v1/admin/market/aliases/${aliasId}/reject`, {
      method: "POST",
    });

    const parsed = MarketRegionAliasSchema.parse(raw);
    revalidatePath("/app/admin/market-data");
    return parsed;
  } catch (error) {
    rethrowWithEndpointHint(error);
  }
}
