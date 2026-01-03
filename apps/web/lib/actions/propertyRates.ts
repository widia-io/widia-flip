"use server";

import { apiFetch } from "@/lib/apiFetch";
import {
  UpdatePropertyRatesRequestSchema,
  type PropertyRatesResponse,
  type UpdatePropertyRatesRequest,
} from "@widia/shared";

export async function getPropertyRatesAction(propertyId: string) {
  try {
    const result = await apiFetch<PropertyRatesResponse>(
      `/api/v1/properties/${propertyId}/rates`
    );
    return { data: result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao buscar taxas" };
  }
}

export async function updatePropertyRatesAction(
  propertyId: string,
  rates: UpdatePropertyRatesRequest
) {
  const parsed = UpdatePropertyRatesRequestSchema.safeParse(rates);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados invalidos" };
  }

  try {
    const result = await apiFetch<PropertyRatesResponse>(
      `/api/v1/properties/${propertyId}/rates`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      }
    );
    return { data: result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao salvar taxas" };
  }
}
