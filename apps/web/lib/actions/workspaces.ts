"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { CreateWorkspaceRequestSchema } from "@widia/shared";

import { apiFetch } from "@/lib/apiFetch";

export async function createWorkspaceAction(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const parsed = CreateWorkspaceRequestSchema.safeParse({ name });
  if (!parsed.success) {
    redirect("/app?error=invalid_workspace_name");
  }

  await apiFetch("/api/v1/workspaces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
  });

  revalidatePath("/app");
  redirect("/app");
}


