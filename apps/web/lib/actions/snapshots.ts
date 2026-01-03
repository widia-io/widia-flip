"use server";

import { revalidatePath } from "next/cache";

import type {
  ListUnifiedSnapshotsResponse,
  ListAnnotationsResponse,
  SnapshotAnnotation,
  SnapshotType,
  CompareSnapshotsResponse,
} from "@widia/shared";

import { apiFetch } from "@/lib/apiFetch";

export type ListSnapshotsFilters = {
  snapshot_type?: "cash" | "financing" | "all";
  status_pipeline?: string;
  min_roi?: number;
  property_search?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
};

export async function listWorkspaceSnapshotsAction(
  workspaceId: string,
  filters?: ListSnapshotsFilters,
) {
  const params = new URLSearchParams({ workspace_id: workspaceId });

  if (filters?.snapshot_type && filters.snapshot_type !== "all") {
    params.set("snapshot_type", filters.snapshot_type);
  }
  if (filters?.status_pipeline) params.set("status_pipeline", filters.status_pipeline);
  if (filters?.min_roi !== undefined) params.set("min_roi", String(filters.min_roi));
  if (filters?.property_search) params.set("property_search", filters.property_search);
  if (filters?.date_from) params.set("date_from", filters.date_from);
  if (filters?.date_to) params.set("date_to", filters.date_to);
  if (filters?.limit) params.set("limit", String(filters.limit));
  if (filters?.offset) params.set("offset", String(filters.offset));

  try {
    const result = await apiFetch<ListUnifiedSnapshotsResponse>(
      `/api/v1/snapshots?${params.toString()}`,
    );
    return { data: result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao listar análises";
    return { error: message };
  }
}

export async function listAnnotationsAction(
  snapshotId: string,
  snapshotType: SnapshotType,
) {
  try {
    const result = await apiFetch<ListAnnotationsResponse>(
      `/api/v1/snapshots/${snapshotId}/annotations?type=${snapshotType}`,
    );
    return { data: result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao listar anotações";
    return { error: message };
  }
}

export async function createAnnotationAction(
  snapshotId: string,
  snapshotType: SnapshotType,
  note: string,
) {
  try {
    const result = await apiFetch<SnapshotAnnotation>("/api/v1/snapshots/annotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        snapshot_id: snapshotId,
        snapshot_type: snapshotType,
        note,
      }),
    });
    revalidatePath("/app/snapshots");
    return { data: result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao criar anotação";
    return { error: message };
  }
}

export async function updateAnnotationAction(annotationId: string, note: string) {
  try {
    const result = await apiFetch<SnapshotAnnotation>(
      `/api/v1/snapshots/annotations/${annotationId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      },
    );
    revalidatePath("/app/snapshots");
    return { data: result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao atualizar anotação";
    return { error: message };
  }
}

export async function deleteAnnotationAction(annotationId: string) {
  try {
    await apiFetch(`/api/v1/snapshots/annotations/${annotationId}`, {
      method: "DELETE",
    });
    revalidatePath("/app/snapshots");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao deletar anotação";
    return { error: message };
  }
}

export async function compareSnapshotsAction(
  ids: [string, string],
  types: [SnapshotType, SnapshotType],
) {
  try {
    const result = await apiFetch<CompareSnapshotsResponse>(
      `/api/v1/snapshots/compare?ids=${ids.join(",")}&types=${types.join(",")}`,
    );
    return { data: result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao comparar análises";
    return { error: message };
  }
}
