"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  CreateWorkspaceRequestSchema,
  UpdateWorkspaceRequestSchema,
  type EnforcementErrorResponse,
} from "@widia/shared";

import { apiFetch, EnforcementBlockedError } from "@/lib/apiFetch";

export async function createWorkspaceAction(name: string) {
  const parsed = CreateWorkspaceRequestSchema.safeParse({ name });
  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Nome inválido",
    };
  }

  try {
    await apiFetch("/api/v1/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    revalidatePath("/app");
    revalidatePath("/app/workspaces");
    return { success: true };
  } catch (e) {
    // M12 - Handle enforcement errors
    if (e instanceof EnforcementBlockedError) {
      return { enforcement: e.response };
    }
    const message = e instanceof Error ? e.message : "Erro ao criar projeto";
    return { error: message };
  }
}

// Type for workspace action result with enforcement support
export type CreateWorkspaceActionResult =
  | { success: true }
  | { error: string }
  | { enforcement: EnforcementErrorResponse };

export async function updateWorkspaceAction(workspaceId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const pjTaxRateStr = formData.get("pjTaxRate");
  
  const parsed = UpdateWorkspaceRequestSchema.safeParse({ name });
  if (!parsed.success) {
    redirect(`/app/workspaces/${workspaceId}/settings?error=invalid_workspace_name`);
  }

  // Update workspace name
  await apiFetch(`/api/v1/workspaces/${workspaceId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
  });

  // Update workspace settings (PJ tax rate)
  if (pjTaxRateStr !== null) {
    const pjTaxRate = parseFloat(String(pjTaxRateStr)) / 100;
    if (!isNaN(pjTaxRate) && pjTaxRate >= 0 && pjTaxRate <= 1) {
      await apiFetch(`/api/v1/workspaces/${workspaceId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pj_tax_rate: pjTaxRate }),
      });
    }
  }

  revalidatePath("/app");
  revalidatePath("/app/workspaces");
  revalidatePath(`/app/workspaces/${workspaceId}/settings`);
  redirect(`/app/workspaces/${workspaceId}/settings?success=workspace_updated`);
}

export async function deleteWorkspaceAction(workspaceId: string) {
  await apiFetch(`/api/v1/workspaces/${workspaceId}`, {
    method: "DELETE",
  });

  revalidatePath("/app");
  revalidatePath("/app/workspaces");
  redirect("/app/workspaces?success=workspace_deleted");
}

