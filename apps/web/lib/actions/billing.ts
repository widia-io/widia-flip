"use server";

import { apiFetch } from "@/lib/apiFetch";
import { type UserEntitlements } from "@widia/shared";

export async function getUserEntitlements(): Promise<UserEntitlements | null> {
  try {
    return await apiFetch<UserEntitlements>("/api/v1/billing/me");
  } catch {
    return null;
  }
}
