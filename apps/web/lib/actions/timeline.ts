"use server";

import { type ListTimelineResponse } from "@widia/shared";

import { apiFetch } from "@/lib/apiFetch";

export async function listTimelineEventsAction(propertyId: string) {
  try {
    const result = await apiFetch<ListTimelineResponse>(
      `/api/v1/properties/${propertyId}/timeline`,
    );
    return { data: result };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao listar timeline";
    return { error: message };
  }
}
