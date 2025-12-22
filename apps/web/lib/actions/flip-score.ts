"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/apiFetch";
import type { RecomputeFlipScoreResponse } from "@widia/shared";

export async function recomputeFlipScoreAction(
  prospectId: string,
  force: boolean = false
): Promise<{ success: true; data: RecomputeFlipScoreResponse } | { error: string }> {
  try {
    const url = `/api/v1/prospects/${prospectId}/flip-score/recompute${force ? "?force=true" : ""}`;
    const result = await apiFetch<RecomputeFlipScoreResponse>(url, {
      method: "POST",
    });

    revalidatePath("/app/prospects");
    return { success: true, data: result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao calcular score";
    return { error: message };
  }
}
