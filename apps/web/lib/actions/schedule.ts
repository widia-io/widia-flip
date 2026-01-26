"use server";

import { revalidatePath } from "next/cache";
import {
  CreateScheduleItemRequestSchema,
  UpdateScheduleItemRequestSchema,
  type ScheduleItem,
  type ListScheduleResponse,
  type ListWorkspaceScheduleResponse,
  type CreateScheduleItemRequest,
  type UpdateScheduleItemRequest,
} from "@widia/shared";
import { apiFetch } from "@/lib/apiFetch";

export async function listScheduleAction(propertyId: string) {
  try {
    const result = await apiFetch<ListScheduleResponse>(
      `/api/v1/properties/${propertyId}/schedule`
    );
    return { data: result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao listar cronograma";
    return { error: message };
  }
}

export async function listWorkspaceScheduleAction(workspaceId: string) {
  try {
    const result = await apiFetch<ListWorkspaceScheduleResponse>(
      `/api/v1/workspaces/${workspaceId}/schedule`
    );
    return { data: result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao listar cronograma";
    return { error: message };
  }
}

export async function createScheduleItemAction(
  propertyId: string,
  data: CreateScheduleItemRequest
) {
  const parsed = CreateScheduleItemRequestSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  try {
    const result = await apiFetch<ScheduleItem>(
      `/api/v1/properties/${propertyId}/schedule`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      }
    );
    revalidatePath(`/app/properties/${propertyId}/schedule`);
    revalidatePath(`/app/properties/${propertyId}/timeline`);
    revalidatePath(`/app/properties/${propertyId}/costs`);
    return { data: result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao criar item";
    return { error: message };
  }
}

export async function updateScheduleItemAction(
  itemId: string,
  propertyId: string,
  data: UpdateScheduleItemRequest
) {
  const parsed = UpdateScheduleItemRequestSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  try {
    const result = await apiFetch<ScheduleItem>(`/api/v1/schedule/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    revalidatePath(`/app/properties/${propertyId}/schedule`);
    revalidatePath(`/app/properties/${propertyId}/timeline`);
    revalidatePath(`/app/properties/${propertyId}/costs`);
    return { data: result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao atualizar item";
    return { error: message };
  }
}

export async function markScheduleItemDoneAction(
  itemId: string,
  propertyId: string,
  done: boolean
) {
  const doneAt = done ? new Date().toISOString() : "";
  return updateScheduleItemAction(itemId, propertyId, { done_at: doneAt });
}

export async function deleteScheduleItemAction(itemId: string, propertyId: string) {
  try {
    await apiFetch(`/api/v1/schedule/${itemId}`, { method: "DELETE" });
    revalidatePath(`/app/properties/${propertyId}/schedule`);
    revalidatePath(`/app/properties/${propertyId}/timeline`);
    revalidatePath(`/app/properties/${propertyId}/costs`);
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao deletar item";
    return { error: message };
  }
}

export async function updateScheduleDatesAction(
  itemId: string,
  propertyId: string,
  startDate: string,
  endDate: string
) {
  if (endDate < startDate) {
    return { error: "Data fim deve ser >= data início" };
  }

  try {
    const result = await apiFetch<ScheduleItem>(`/api/v1/schedule/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start_date: startDate, end_date: endDate }),
    });
    revalidatePath(`/app/properties/${propertyId}/schedule`);
    revalidatePath(`/app/properties/${propertyId}/timeline`);
    return { data: result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao atualizar datas";
    return { error: message };
  }
}
