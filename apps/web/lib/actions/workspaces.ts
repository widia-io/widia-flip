"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { CreateWorkspaceRequestSchema, UpdateWorkspaceRequestSchema } from "@widia/shared";

import { apiFetch } from "@/lib/apiFetch";

export async function createWorkspaceAction(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const parsed = CreateWorkspaceRequestSchema.safeParse({ name });
  if (!parsed.success) {
    redirect("/app/workspaces?error=invalid_workspace_name");
  }

  await apiFetch("/api/v1/workspaces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
  });

  revalidatePath("/app");
  revalidatePath("/app/workspaces");
  redirect("/app/workspaces");
}

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

