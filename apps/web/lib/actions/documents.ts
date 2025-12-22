"use server";

import { revalidatePath } from "next/cache";

import {
  GetUploadUrlRequestSchema,
  RegisterDocumentRequestSchema,
  type Document,
  type ListDocumentsResponse,
  type GetUploadUrlRequest,
  type GetUploadUrlResponse,
  type RegisterDocumentRequest,
} from "@widia/shared";

import { apiFetch } from "@/lib/apiFetch";

export async function getUploadUrlAction(data: GetUploadUrlRequest) {
  const parsed = GetUploadUrlRequestSchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }

  try {
    const result = await apiFetch<GetUploadUrlResponse>(
      `/api/v1/documents/upload-url`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      },
    );
    return { data: result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao gerar URL de upload";
    return { error: message };
  }
}

export async function registerDocumentAction(
  data: RegisterDocumentRequest,
  propertyId?: string,
) {
  const parsed = RegisterDocumentRequestSchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: parsed.error.errors[0]?.message ?? "Dados inválidos",
    };
  }

  try {
    const result = await apiFetch<Document>(`/api/v1/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    if (propertyId) {
      revalidatePath(`/app/properties/${propertyId}/documents`);
      revalidatePath(`/app/properties/${propertyId}/timeline`);
    }
    return { data: result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao registrar documento";
    return { error: message };
  }
}

export async function listDocumentsAction(propertyId: string) {
  try {
    const result = await apiFetch<ListDocumentsResponse>(
      `/api/v1/properties/${propertyId}/documents`,
    );
    return { data: result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao listar documentos";
    return { error: message };
  }
}

export async function deleteDocumentAction(docId: string, propertyId: string) {
  try {
    await apiFetch(`/api/v1/documents/${docId}`, {
      method: "DELETE",
    });

    revalidatePath(`/app/properties/${propertyId}/documents`);
    revalidatePath(`/app/properties/${propertyId}/timeline`);
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao deletar documento";
    return { error: message };
  }
}


