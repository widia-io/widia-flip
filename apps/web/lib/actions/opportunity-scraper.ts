"use server";

import { revalidatePath } from "next/cache";
import {
  ListOpportunityScraperPlaceholdersResponseSchema,
  OpportunityScraperPlaceholderSchema,
  RunOpportunityScraperRequestSchema,
  RunOpportunityScraperResponseSchema,
  UpsertOpportunityScraperPlaceholderRequestSchema,
  type OpportunityScraperPlaceholder,
  type RunOpportunityScraperResponse,
  type UpsertOpportunityScraperPlaceholderRequest,
} from "@widia/shared";

import { apiFetch } from "@/lib/apiFetch";

function rethrowWithEndpointHint(error: unknown): never {
  const message = error instanceof Error ? error.message : "Erro desconhecido";
  if (message.includes("API_ERROR_404")) {
    throw new Error(
      "Endpoint do scraper nao encontrado na API. Reinicie o backend (npm run dev:api) e aplique as migrations pendentes (0038/0039)."
    );
  }
  if (error instanceof Error) {
    throw error;
  }
  throw new Error(message);
}

export async function listOpportunityScraperPlaceholders(): Promise<OpportunityScraperPlaceholder[]> {
  try {
    const raw = await apiFetch("/api/v1/admin/opportunities/scraper/placeholders");
    const parsed = ListOpportunityScraperPlaceholdersResponseSchema.parse(raw);
    return parsed.items;
  } catch (error) {
    rethrowWithEndpointHint(error);
  }
}

export async function createOpportunityScraperPlaceholder(
  input: UpsertOpportunityScraperPlaceholderRequest
): Promise<OpportunityScraperPlaceholder> {
  try {
    const payload = UpsertOpportunityScraperPlaceholderRequestSchema.parse(input);

    const raw = await apiFetch("/api/v1/admin/opportunities/scraper/placeholders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const placeholder = OpportunityScraperPlaceholderSchema.parse(raw);
    revalidatePath("/app/admin/opportunities");

    return placeholder;
  } catch (error) {
    rethrowWithEndpointHint(error);
  }
}

export async function updateOpportunityScraperPlaceholder(
  id: string,
  input: UpsertOpportunityScraperPlaceholderRequest
): Promise<OpportunityScraperPlaceholder> {
  try {
    const payload = UpsertOpportunityScraperPlaceholderRequestSchema.parse(input);

    const raw = await apiFetch(`/api/v1/admin/opportunities/scraper/placeholders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const placeholder = OpportunityScraperPlaceholderSchema.parse(raw);
    revalidatePath("/app/admin/opportunities");

    return placeholder;
  } catch (error) {
    rethrowWithEndpointHint(error);
  }
}

export async function runOpportunityScraper(input: {
  state?: string;
  city?: string;
  neighborhood?: string;
  placeholder_id?: string;
  limit?: number;
  dry_run?: boolean;
}): Promise<RunOpportunityScraperResponse> {
  try {
    const payload = RunOpportunityScraperRequestSchema.parse(input);

    const raw = await apiFetch("/api/v1/admin/opportunities/scraper/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const response = RunOpportunityScraperResponseSchema.parse(raw);

    revalidatePath("/app/admin/opportunities");
    revalidatePath("/app/admin/job-runs");
    revalidatePath("/app/opportunities");

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    if (message.includes("INVALID_BODY") && input.dry_run) {
      throw new Error(
        "A API em execucao nao suporta dry-run ainda. Reinicie/redeploy o backend (npm run dev:api)."
      );
    }
    rethrowWithEndpointHint(error);
  }
}
