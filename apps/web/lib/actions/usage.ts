"use server";

import { apiFetch } from "@/lib/apiFetch";
import { WorkspaceUsageResponseSchema, type WorkspaceUsageResponse } from "@widia/shared";

export async function getWorkspaceUsage(workspaceId: string): Promise<WorkspaceUsageResponse | null> {
  try {
    const data = await apiFetch<WorkspaceUsageResponse>(`/api/v1/workspaces/${workspaceId}/usage`);
    return WorkspaceUsageResponseSchema.parse(data);
  } catch {
    return null;
  }
}
