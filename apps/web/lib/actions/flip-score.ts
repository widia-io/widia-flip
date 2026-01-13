"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, EnforcementBlockedError } from "@/lib/apiFetch";
import { markChecklistStep } from "@/lib/actions/userPreferences";
import type { RecomputeFlipScoreResponse, EnforcementErrorResponse } from "@widia/shared";

export async function recomputeFlipScoreAction(
  prospectId: string,
  options: { force?: boolean; version?: "v0" | "v1" } = {}
): Promise<
  | { success: true; data: RecomputeFlipScoreResponse }
  | { error: string }
  | { enforcement: EnforcementErrorResponse }
> {
  try {
    const params = new URLSearchParams();
    if (options.force) params.set("force", "true");
    if (options.version) params.set("version", options.version);
    const queryString = params.toString();
    const url = `/api/v1/prospects/${prospectId}/flip-score/recompute${queryString ? `?${queryString}` : ""}`;
    const result = await apiFetch<RecomputeFlipScoreResponse>(url, {
      method: "POST",
    });

    markChecklistStep("calculated_score").catch(() => {});

    revalidatePath("/app/prospects");
    return { success: true, data: result };
  } catch (e) {
    if (e instanceof EnforcementBlockedError) {
      return { enforcement: e.response };
    }
    const message = e instanceof Error ? e.message : "Erro ao calcular score";
    return { error: message };
  }
}
