"use server";

import { revalidatePath } from "next/cache";

import {
  UpdateFinancingInputsRequestSchema,
  CreatePaymentRequestSchema,
  type FinancingAnalysisResponse,
  type FinancingPayment,
  type ListPaymentsResponse,
  type CreateSnapshotResponse,
  type ListFinancingSnapshotsResponse,
} from "@widia/shared";

import { apiFetch } from "@/lib/apiFetch";

// Financing Plan

export async function getFinancingAction(propertyId: string) {
  try {
    const result = await apiFetch<FinancingAnalysisResponse>(
      `/api/v1/properties/${propertyId}/financing`,
    );
    return { data: result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao buscar financiamento";
    return { error: message };
  }
}

export async function updateFinancingAction(
  propertyId: string,
  inputs: {
    purchase_price?: number;
    sale_price?: number;
    down_payment_percent?: number;
    down_payment_value?: number;
    term_months?: number;
    cet?: number;
    interest_rate?: number;
    insurance?: number;
    appraisal_fee?: number;
    other_fees?: number;
    remaining_debt?: number;
  },
) {
  const parsed = UpdateFinancingInputsRequestSchema.safeParse(inputs);
  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }

  try {
    const result = await apiFetch<FinancingAnalysisResponse>(
      `/api/v1/properties/${propertyId}/financing`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      },
    );

    revalidatePath(`/app/properties/${propertyId}/financing`);
    return { data: result };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao salvar financiamento";
    return { error: message };
  }
}

// Payments

export async function listFinancingPaymentsAction(planId: string) {
  try {
    const result = await apiFetch<ListPaymentsResponse>(
      `/api/v1/financing/${planId}/payments`,
    );
    return { data: result };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao listar prestações";
    return { error: message };
  }
}

export async function createFinancingPaymentAction(
  planId: string,
  propertyId: string,
  data: { month_index: number; amount: number },
) {
  const parsed = CreatePaymentRequestSchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }

  try {
    const result = await apiFetch<FinancingPayment>(
      `/api/v1/financing/${planId}/payments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      },
    );

    revalidatePath(`/app/properties/${propertyId}/financing`);
    return { data: result };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao criar prestação";
    return { error: message };
  }
}

export async function deleteFinancingPaymentAction(
  planId: string,
  paymentId: string,
  propertyId: string,
) {
  try {
    await apiFetch<void>(
      `/api/v1/financing/${planId}/payments/${paymentId}`,
      { method: "DELETE" },
    );

    revalidatePath(`/app/properties/${propertyId}/financing`);
    return { success: true };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao remover prestação";
    return { error: message };
  }
}

// Snapshots

export async function createFinancingSnapshotAction(propertyId: string) {
  try {
    const result = await apiFetch<CreateSnapshotResponse>(
      `/api/v1/properties/${propertyId}/analysis/financing/snapshot`,
      { method: "POST" },
    );

    revalidatePath(`/app/properties/${propertyId}/financing`);
    revalidatePath(`/app/properties/${propertyId}/timeline`);
    return { data: result };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao salvar snapshot";
    return { error: message };
  }
}

export async function listFinancingSnapshotsAction(propertyId: string) {
  try {
    const result = await apiFetch<ListFinancingSnapshotsResponse>(
      `/api/v1/properties/${propertyId}/analysis/financing/snapshots`,
    );
    return { data: result };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao listar snapshots";
    return { error: message };
  }
}
