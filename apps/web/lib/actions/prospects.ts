"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  CreateProspectRequestSchema,
  UpdateProspectRequestSchema,
  type Prospect,
  type ListProspectsResponse,
  type ConvertProspectResponse,
} from "@widia/shared";

import { apiFetch } from "@/lib/apiFetch";

export async function createProspectAction(formData: FormData) {
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
  const askingPrice = formData.get("asking_price")
    ? Number(formData.get("asking_price"))
    : undefined;

  const parsed = CreateProspectRequestSchema.safeParse({
    workspace_id: workspaceId,
    neighborhood,
    address,
    area_usable: areaUsable,
    asking_price: askingPrice,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }

  try {
    await apiFetch<Prospect>("/api/v1/prospects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    revalidatePath("/app/prospects");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao criar prospect";
    return { error: message };
  }
}

export async function updateProspectAction(
  prospectId: string,
  formData: FormData,
) {
  const data: Record<string, unknown> = {};

  const status = formData.get("status");
  if (status) data.status = String(status);

  const neighborhood = formData.get("neighborhood");
  if (neighborhood !== null) data.neighborhood = String(neighborhood);

  const address = formData.get("address");
  if (address !== null) data.address = String(address);

  const areaUsable = formData.get("area_usable");
  if (areaUsable) data.area_usable = Number(areaUsable);

  const askingPrice = formData.get("asking_price");
  if (askingPrice) data.asking_price = Number(askingPrice);

  const link = formData.get("link");
  if (link !== null) data.link = String(link);

  const comments = formData.get("comments");
  if (comments !== null) data.comments = String(comments);

  const parsed = UpdateProspectRequestSchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }

  try {
    await apiFetch<Prospect>(`/api/v1/prospects/${prospectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    revalidatePath("/app/prospects");
    return { success: true };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao atualizar prospect";
    return { error: message };
  }
}

export async function deleteProspectAction(prospectId: string) {
  try {
    await apiFetch(`/api/v1/prospects/${prospectId}`, {
      method: "DELETE",
    });

    revalidatePath("/app/prospects");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao excluir prospect";
    return { error: message };
  }
}

export async function convertProspectAction(prospectId: string) {
  try {
    const result = await apiFetch<ConvertProspectResponse>(
      `/api/v1/prospects/${prospectId}/convert`,
      { method: "POST" },
    );

    revalidatePath("/app/prospects");
    // For now, redirect to prospects list since property page doesn't exist yet
    redirect("/app/prospects");
    return { success: true, propertyId: result.property_id };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao converter prospect";
    return { error: message };
  }
}

export async function listProspectsAction(
  workspaceId: string,
  options?: {
    status?: string;
    q?: string;
    limit?: number;
    cursor?: string;
  },
) {
  const params = new URLSearchParams({ workspace_id: workspaceId });

  if (options?.status) params.set("status", options.status);
  if (options?.q) params.set("q", options.q);
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.cursor) params.set("cursor", options.cursor);

  try {
    const result = await apiFetch<ListProspectsResponse>(
      `/api/v1/prospects?${params.toString()}`,
    );
    return { data: result };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao listar prospects";
    return { error: message };
  }
}
