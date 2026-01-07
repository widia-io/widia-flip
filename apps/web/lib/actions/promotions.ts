"use server";

import { revalidatePath } from "next/cache";
import type {
  Promotion,
  ListPromotionsResponse,
  CreatePromotionRequest,
  UpdatePromotionRequest,
} from "@widia/shared";

import { apiFetch } from "@/lib/apiFetch";

export async function listPromotions(): Promise<ListPromotionsResponse> {
  return apiFetch<ListPromotionsResponse>("/api/v1/admin/promotions");
}

export async function getPromotion(id: string): Promise<Promotion> {
  return apiFetch<Promotion>(`/api/v1/admin/promotions/${id}`);
}

export async function createPromotion(
  data: CreatePromotionRequest
): Promise<Promotion> {
  const result = await apiFetch<Promotion>("/api/v1/admin/promotions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  revalidatePath("/app/admin/promotions");
  return result;
}

export async function updatePromotion(
  id: string,
  data: UpdatePromotionRequest
): Promise<Promotion> {
  const result = await apiFetch<Promotion>(`/api/v1/admin/promotions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  revalidatePath("/app/admin/promotions");
  return result;
}

export async function deletePromotion(id: string): Promise<void> {
  await apiFetch(`/api/v1/admin/promotions/${id}`, { method: "DELETE" });
  revalidatePath("/app/admin/promotions");
}

export async function togglePromotionActive(
  id: string,
  isActive: boolean
): Promise<Promotion> {
  return updatePromotion(id, { isActive });
}
