"use server";

import { revalidatePath } from "next/cache";

import {
  CreatePropertyRequestSchema,
  UpdatePropertyRequestSchema,
  UpdatePropertyStatusRequestSchema,
  UpdateCashInputsRequestSchema,
  type Property,
  type ListPropertiesResponse,
  type CashAnalysisResponse,
  type CreateSnapshotResponse,
  type ListCashSnapshotsResponse,
} from "@widia/shared";

import { apiFetch } from "@/lib/apiFetch";

// CRUD Properties

export async function listPropertiesAction(
  workspaceId: string,
  options?: {
    status_pipeline?: string;
    limit?: number;
    cursor?: string;
  },
) {
  const params = new URLSearchParams({ workspace_id: workspaceId });

  if (options?.status_pipeline) params.set("status_pipeline", options.status_pipeline);
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.cursor) params.set("cursor", options.cursor);

  try {
    const result = await apiFetch<ListPropertiesResponse>(
      `/api/v1/properties?${params.toString()}`,
    );
    return { data: result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao listar imóveis";
    return { error: message };
  }
}

export async function createPropertyAction(formData: FormData) {
  const workspaceId = String(formData.get("workspace_id") ?? "");
  const neighborhood = formData.get("neighborhood")
    ? String(formData.get("neighborhood"))
    : undefined;
  const address = formData.get("address")
    ? String(formData.get("address"))
    : undefined;
  const areaUsable = formData.get("area_usable")
    ? Number(formData.get("area_usable"))
    : undefined;
  const statusPipeline = formData.get("status_pipeline")
    ? String(formData.get("status_pipeline"))
    : undefined;

  const parsed = CreatePropertyRequestSchema.safeParse({
    workspace_id: workspaceId,
    neighborhood,
    address,
    area_usable: areaUsable,
    status_pipeline: statusPipeline,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }

  try {
    const result = await apiFetch<Property>("/api/v1/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    revalidatePath("/app/properties");
    return { success: true, property: result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao criar imóvel";
    return { error: message };
  }
}

export async function getPropertyAction(propertyId: string) {
  try {
    const result = await apiFetch<Property>(`/api/v1/properties/${propertyId}`);
    return { data: result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao buscar imóvel";
    return { error: message };
  }
}

export async function updatePropertyAction(
  propertyId: string,
  formData: FormData,
) {
  const data: Record<string, unknown> = {};

  const neighborhood = formData.get("neighborhood");
  if (neighborhood !== null) data.neighborhood = String(neighborhood);

  const address = formData.get("address");
  if (address !== null) data.address = String(address);

  const areaUsable = formData.get("area_usable");
  if (areaUsable) data.area_usable = Number(areaUsable);

  const parsed = UpdatePropertyRequestSchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }

  try {
    await apiFetch<Property>(`/api/v1/properties/${propertyId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    revalidatePath(`/app/properties/${propertyId}`);
    revalidatePath("/app/properties");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao atualizar imóvel";
    return { error: message };
  }
}

export async function updatePropertyStatusAction(
  propertyId: string,
  statusPipeline: string,
) {
  const parsed = UpdatePropertyStatusRequestSchema.safeParse({
    status_pipeline: statusPipeline,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Status inválido",
    };
  }

  try {
    await apiFetch<Property>(`/api/v1/properties/${propertyId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    revalidatePath(`/app/properties/${propertyId}`);
    revalidatePath("/app/properties");
    return { success: true };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao atualizar status";
    return { error: message };
  }
}

// Cash Analysis

export async function getCashAnalysisAction(propertyId: string) {
  try {
    const result = await apiFetch<CashAnalysisResponse>(
      `/api/v1/properties/${propertyId}/analysis/cash`,
    );
    return { data: result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao buscar análise";
    return { error: message };
  }
}

export async function updateCashAnalysisAction(
  propertyId: string,
  inputs: {
    purchase_price?: number;
    renovation_cost?: number;
    other_costs?: number;
    sale_price?: number;
  },
) {
  const parsed = UpdateCashInputsRequestSchema.safeParse(inputs);
  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }

  try {
    const result = await apiFetch<CashAnalysisResponse>(
      `/api/v1/properties/${propertyId}/analysis/cash`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      },
    );

    revalidatePath(`/app/properties/${propertyId}/viability`);
    return { data: result };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao salvar análise";
    return { error: message };
  }
}

export async function createCashSnapshotAction(propertyId: string) {
  try {
    const result = await apiFetch<CreateSnapshotResponse>(
      `/api/v1/properties/${propertyId}/analysis/cash/snapshot`,
      { method: "POST" },
    );

    revalidatePath(`/app/properties/${propertyId}/viability`);
    revalidatePath(`/app/properties/${propertyId}/timeline`);
    return { data: result };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao salvar snapshot";
    return { error: message };
  }
}

export async function listCashSnapshotsAction(propertyId: string) {
  try {
    const result = await apiFetch<ListCashSnapshotsResponse>(
      `/api/v1/properties/${propertyId}/analysis/cash/snapshots`,
    );
    return { data: result };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao listar snapshots";
    return { error: message };
  }
}
