"use server";

import { type DashboardResponse } from "@widia/shared";
import { apiFetch } from "@/lib/apiFetch";

export async function getDashboardAction(workspaceId: string) {
  try {
    const result = await apiFetch<DashboardResponse>(
      `/api/v1/workspaces/${workspaceId}/dashboard`
    );
    return { data: result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao carregar dashboard";
    return { error: message };
  }
}
