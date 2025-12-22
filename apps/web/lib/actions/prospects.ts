"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recomputeFlipScoreAction } from "@/lib/actions/flip-score";

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
  
  // Helper to get optional string
  const getString = (key: string): string | undefined => {
    const val = formData.get(key);
    return val ? String(val) : undefined;
  };
  
  // Helper to get optional number
  const getNumber = (key: string): number | undefined => {
    const val = formData.get(key);
    if (!val) return undefined;
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  };
  
  // Helper to get optional integer
  const getInt = (key: string): number | undefined => {
    const val = formData.get(key);
    if (!val) return undefined;
    const num = parseInt(String(val), 10);
    return isNaN(num) ? undefined : num;
  };
  
  // Helper to get optional boolean
  const getBool = (key: string): boolean | undefined => {
    const val = formData.get(key);
    if (!val) return undefined;
    return val === "true";
  };

  const data = {
    workspace_id: workspaceId,
    // Location
    neighborhood: getString("neighborhood"),
    address: getString("address"),
    link: getString("link"),
    // Property characteristics
    area_usable: getNumber("area_usable"),
    bedrooms: getInt("bedrooms"),
    suites: getInt("suites"),
    bathrooms: getInt("bathrooms"),
    parking: getInt("parking"),
    // Building characteristics
    floor: getInt("floor"),
    elevator: getBool("elevator"),
    face: getString("face"),
    gas: getString("gas"),
    // Financial
    asking_price: getNumber("asking_price"),
    condo_fee: getNumber("condo_fee"),
    iptu: getNumber("iptu"),
    // Contact
    agency: getString("agency"),
    broker_name: getString("broker_name"),
    broker_phone: getString("broker_phone"),
    // Notes
    comments: getString("comments"),
  };

  const parsed = CreateProspectRequestSchema.safeParse(data);

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
  
  // Additional fields
  const bedrooms = formData.get("bedrooms");
  if (bedrooms) data.bedrooms = parseInt(String(bedrooms), 10);
  
  const suites = formData.get("suites");
  if (suites) data.suites = parseInt(String(suites), 10);
  
  const bathrooms = formData.get("bathrooms");
  if (bathrooms) data.bathrooms = parseInt(String(bathrooms), 10);
  
  const parking = formData.get("parking");
  if (parking) data.parking = parseInt(String(parking), 10);
  
  const floor = formData.get("floor");
  if (floor) data.floor = parseInt(String(floor), 10);
  
  const elevator = formData.get("elevator");
  if (elevator !== null) data.elevator = elevator === "true";
  
  const face = formData.get("face");
  if (face !== null) data.face = String(face);
  
  const gas = formData.get("gas");
  if (gas !== null) data.gas = String(gas);
  
  const condoFee = formData.get("condo_fee");
  if (condoFee) data.condo_fee = Number(condoFee);

  const iptu = formData.get("iptu");
  if (iptu) data.iptu = Number(iptu);

  const agency = formData.get("agency");
  if (agency !== null) data.agency = String(agency);
  
  const brokerName = formData.get("broker_name");
  if (brokerName !== null) data.broker_name = String(brokerName);
  
  const brokerPhone = formData.get("broker_phone");
  if (brokerPhone !== null) data.broker_phone = String(brokerPhone);

  // M9 - Flip Score v1 investment inputs
  const offerPrice = formData.get("offer_price");
  if (offerPrice) data.offer_price = Number(offerPrice);

  const expectedSalePrice = formData.get("expected_sale_price");
  if (expectedSalePrice) data.expected_sale_price = Number(expectedSalePrice);

  const renovationCostEstimate = formData.get("renovation_cost_estimate");
  if (renovationCostEstimate) data.renovation_cost_estimate = Number(renovationCostEstimate);

  const holdMonths = formData.get("hold_months");
  if (holdMonths) data.hold_months = parseInt(String(holdMonths), 10);

  const otherCostsEstimate = formData.get("other_costs_estimate");
  if (otherCostsEstimate) data.other_costs_estimate = Number(otherCostsEstimate);

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

    // Auto-recalculate flip score when expected_sale_price is set (enables v1 scoring)
    if (data.expected_sale_price != null) {
      recomputeFlipScoreAction(prospectId, false).catch(() => {
        // Silent fail - score recalc is best-effort
      });
    }

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
    revalidatePath("/app/properties");
    redirect(`/app/properties/${result.property_id}`);
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

export async function restoreProspectAction(prospectId: string) {
  try {
    await apiFetch(`/api/v1/prospects/${prospectId}/restore`, {
      method: "POST",
    });

    revalidatePath("/app/prospects");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao restaurar prospect";
    return { error: message };
  }
}
