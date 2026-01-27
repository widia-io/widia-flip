"use server";

import { revalidatePath } from "next/cache";
import type {
  AdminStatsResponse,
  ListAdminUsersResponse,
  AdminUserDetail,
  AdminStatusResponse,
  BillingTier,
  AdminSaaSMetricsResponse,
  AdminSaaSMetricsPeriod,
} from "@widia/shared";

import { apiFetch } from "@/lib/apiFetch";

export async function getAdminStatus(): Promise<AdminStatusResponse> {
  return apiFetch<AdminStatusResponse>("/api/v1/user/admin-status");
}

export async function getAdminStats(): Promise<AdminStatsResponse> {
  return apiFetch<AdminStatsResponse>("/api/v1/admin/stats");
}

export async function listAdminUsers(params?: {
  limit?: number;
  offset?: number;
}): Promise<ListAdminUsersResponse> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));

  const query = searchParams.toString();
  const path = query ? `/api/v1/admin/users?${query}` : "/api/v1/admin/users";
  return apiFetch<ListAdminUsersResponse>(path);
}

export async function getAdminUserDetail(
  userId: string
): Promise<AdminUserDetail> {
  return apiFetch<AdminUserDetail>(`/api/v1/admin/users/${userId}`);
}

export async function updateUserTier(
  userId: string,
  tier: BillingTier
): Promise<{ status: string; tier: string }> {
  const result = await apiFetch<{ status: string; tier: string }>(
    `/api/v1/admin/users/${userId}/tier`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    }
  );
  revalidatePath("/app/admin/users");
  revalidatePath(`/app/admin/users/${userId}`);
  return result;
}

export async function updateUserStatus(
  userId: string,
  isActive: boolean
): Promise<{ status: string; isActive: boolean }> {
  const result = await apiFetch<{ status: string; isActive: boolean }>(
    `/api/v1/admin/users/${userId}/status`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    }
  );
  revalidatePath("/app/admin/users");
  revalidatePath(`/app/admin/users/${userId}`);
  return result;
}

export async function deleteUser(userId: string): Promise<void> {
  await apiFetch(`/api/v1/admin/users/${userId}`, { method: "DELETE" });
  revalidatePath("/app/admin/users");
  revalidatePath("/app/admin");
}

export async function getAdminSaaSMetrics(
  period: AdminSaaSMetricsPeriod = "30d"
): Promise<AdminSaaSMetricsResponse> {
  return apiFetch<AdminSaaSMetricsResponse>(
    `/api/v1/admin/metrics?period=${period}`
  );
}
