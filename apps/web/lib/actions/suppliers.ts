"use server";

import { revalidatePath } from "next/cache";

import {
  CreateSupplierRequestSchema,
  UpdateSupplierRequestSchema,
  type Supplier,
  type ListSuppliersResponse,
  type ListWorkspaceSuppliersResponse,
  type CreateSupplierRequest,
  type UpdateSupplierRequest,
} from "@widia/shared";

import { apiFetch, EnforcementBlockedError } from "@/lib/apiFetch";

export async function listSuppliersAction(
  workspaceId: string,
  filters?: { category?: string }
) {
  try {
    const params = new URLSearchParams({ workspace_id: workspaceId });
    if (filters?.category) params.set("category", filters.category);

    const result = await apiFetch<ListSuppliersResponse>(
      `/api/v1/suppliers?${params.toString()}`
    );
    return { data: result };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao listar fornecedores";
    return { error: message };
  }
}

export async function getSupplierAction(supplierId: string) {
  try {
    const result = await apiFetch<Supplier>(`/api/v1/suppliers/${supplierId}`);
    return { data: result };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao buscar fornecedor";
    return { error: message };
  }
}

export async function createSupplierAction(data: CreateSupplierRequest) {
  const parsed = CreateSupplierRequestSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  try {
    const result = await apiFetch<Supplier>("/api/v1/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    revalidatePath("/app/suppliers");
    return { data: result };
  } catch (e) {
    if (e instanceof EnforcementBlockedError) {
      return { enforcement: e.response };
    }
    const message =
      e instanceof Error ? e.message : "Erro ao criar fornecedor";
    return { error: message };
  }
}

export async function updateSupplierAction(
  supplierId: string,
  data: UpdateSupplierRequest
) {
  const parsed = UpdateSupplierRequestSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  try {
    const result = await apiFetch<Supplier>(`/api/v1/suppliers/${supplierId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    revalidatePath("/app/suppliers");
    return { data: result };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao atualizar fornecedor";
    return { error: message };
  }
}

export async function deleteSupplierAction(supplierId: string) {
  try {
    await apiFetch(`/api/v1/suppliers/${supplierId}`, { method: "DELETE" });
    revalidatePath("/app/suppliers");
    return { success: true };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao deletar fornecedor";
    return { error: message };
  }
}

export interface WorkspaceSuppliersFilters {
  category?: string;
  minRating?: number;
  minHourlyRate?: number;
  maxHourlyRate?: number;
}

export async function listWorkspaceSuppliersAction(
  workspaceId: string,
  filters?: WorkspaceSuppliersFilters
) {
  try {
    const params = new URLSearchParams();
    if (filters?.category) params.set("category", filters.category);
    if (filters?.minRating)
      params.set("min_rating", filters.minRating.toString());
    if (filters?.minHourlyRate)
      params.set("min_hourly_rate", filters.minHourlyRate.toString());
    if (filters?.maxHourlyRate)
      params.set("max_hourly_rate", filters.maxHourlyRate.toString());

    const queryString = params.toString();
    const url = `/api/v1/workspaces/${workspaceId}/suppliers${queryString ? `?${queryString}` : ""}`;

    const result = await apiFetch<ListWorkspaceSuppliersResponse>(url);
    return { data: result };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao listar fornecedores";
    return { error: message };
  }
}
