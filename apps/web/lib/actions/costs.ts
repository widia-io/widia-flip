"use server";

import { revalidatePath } from "next/cache";

import {
  CreateCostRequestSchema,
  UpdateCostRequestSchema,
  type CostItem,
  type ListCostsResponse,
  type ListWorkspaceCostsResponse,
  type CreateCostRequest,
  type UpdateCostRequest,
} from "@widia/shared";

import { apiFetch } from "@/lib/apiFetch";

export async function listCostsAction(propertyId: string) {
  try {
    const result = await apiFetch<ListCostsResponse>(
      `/api/v1/properties/${propertyId}/costs`,
    );
    return { data: result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao listar custos";
    return { error: message };
  }
}

export async function createCostAction(
  propertyId: string,
  data: CreateCostRequest,
) {
  const parsed = CreateCostRequestSchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }

  try {
    const result = await apiFetch<CostItem>(
      `/api/v1/properties/${propertyId}/costs`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      },
    );

    revalidatePath(`/app/properties/${propertyId}/costs`);
    revalidatePath(`/app/properties/${propertyId}/timeline`);
    return { data: result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao criar custo";
    return { error: message };
  }
}

export async function updateCostAction(
  costId: string,
  propertyId: string,
  data: UpdateCostRequest,
) {
  const parsed = UpdateCostRequestSchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }

  try {
    const result = await apiFetch<CostItem>(`/api/v1/costs/${costId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    revalidatePath(`/app/properties/${propertyId}/costs`);
    revalidatePath(`/app/properties/${propertyId}/timeline`);
    return { data: result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao atualizar custo";
    return { error: message };
  }
}

export async function deleteCostAction(costId: string, propertyId: string) {
  try {
    await apiFetch(`/api/v1/costs/${costId}`, {
      method: "DELETE",
    });

    revalidatePath(`/app/properties/${propertyId}/costs`);
    revalidatePath(`/app/properties/${propertyId}/timeline`);
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao deletar custo";
    return { error: message };
  }
}

// Mark cost as paid (quick action)
export async function markCostAsPaidAction(propertyId: string, costId: string) {
  try {
    const result = await apiFetch<CostItem>(`/api/v1/costs/${costId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paid" }),
    });

    revalidatePath(`/app/properties/${propertyId}/costs`);
    revalidatePath(`/app/properties/${propertyId}/timeline`);
    revalidatePath(`/app/costs`);
    return { data: result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao marcar como pago";
    return { error: message };
  }
}

// Workspace-level costs (Custos centralizado)
export async function listWorkspaceCostsAction(workspaceId: string) {
  try {
    const result = await apiFetch<ListWorkspaceCostsResponse>(
      `/api/v1/workspaces/${workspaceId}/costs`,
    );
    return { data: result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao listar custos";
    return { error: message };
  }
}
