"use server";

import { revalidatePath } from "next/cache";

import {
  UserPreferencesSchema,
  UpdateUserPreferencesRequestSchema,
  type UserPreferences,
  type OnboardingChecklist,
} from "@widia/shared";

import { apiFetch } from "@/lib/apiFetch";

export async function getUserPreferences(): Promise<UserPreferences | null> {
  try {
    const data = await apiFetch("/api/v1/user/preferences");
    const parsed = UserPreferencesSchema.safeParse(data);
    if (!parsed.success) {
      console.error("Invalid preferences response:", parsed.error);
      return null;
    }
    return parsed.data;
  } catch (e) {
    console.error("Failed to get user preferences:", e);
    return null;
  }
}

export async function updateUserPreferences(updates: {
  onboarding_completed?: boolean;
  onboarding_checklist?: Partial<OnboardingChecklist>;
  feature_tour_completed?: boolean;
}): Promise<UserPreferences | null> {
  const parsed = UpdateUserPreferencesRequestSchema.safeParse(updates);
  if (!parsed.success) {
    console.error("Invalid preferences update:", parsed.error);
    return null;
  }

  try {
    const data = await apiFetch("/api/v1/user/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    const result = UserPreferencesSchema.safeParse(data);
    if (!result.success) {
      console.error("Invalid preferences response:", result.error);
      return null;
    }

    revalidatePath("/app");
    return result.data;
  } catch (e) {
    console.error("Failed to update user preferences:", e);
    return null;
  }
}

export async function markChecklistStep(
  step: keyof OnboardingChecklist
): Promise<UserPreferences | null> {
  const current = await getUserPreferences();
  if (!current) return null;

  const updatedChecklist = {
    ...current.onboarding_checklist,
    [step]: true,
  };

  // Check if all steps are complete
  const allComplete = Object.values(updatedChecklist).every(Boolean);

  return updateUserPreferences({
    onboarding_checklist: { [step]: true },
    onboarding_completed: allComplete ? true : undefined,
  });
}

export async function completeFeatureTour(): Promise<UserPreferences | null> {
  return updateUserPreferences({ feature_tour_completed: true });
}

export async function dismissOnboarding(): Promise<UserPreferences | null> {
  return updateUserPreferences({ onboarding_completed: true });
}
