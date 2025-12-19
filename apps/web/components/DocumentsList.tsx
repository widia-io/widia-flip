"use client";

import { useState, useRef, useTransition } from "react";
import type { Document } from "@widia/shared";
import {
  getUploadUrlAction,
  registerDocumentAction,
  deleteDocumentAction,
} from "@/lib/actions/documents";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function getFileIcon(contentType: string | null): string {
  if (!contentType) return "📄";
  if (contentType.startsWith("image/")) return "🖼️";
  if (contentType === "application/pdf") return "📕";
  if (contentType.includes("word") || contentType.includes("document")) return "📝";
  if (contentType.includes("excel") || contentType.includes("sheet")) return "📊";
  return "📄";
}

interface DocumentsListProps {
  propertyId: string;
  workspaceId: string;
  initialDocuments: Document[];
}

export function DocumentsList({
  propertyId,
  workspaceId,
  initialDocuments,
}: DocumentsListProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError("Arquivo muito grande. Máximo permitido: 50MB");
      return;
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Tipo de arquivo não permitido. Use PDF, imagens ou documentos Office.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // 1. Get presigned URL
      const urlResult = await getUploadUrlAction({
        workspace_id: workspaceId,
        property_id: propertyId,
        filename: file.name,
        content_type: file.type,
        size_bytes: file.size,
      });

      if (urlResult.error) {
        setError(urlResult.error);
        setUploading(false);
        return;
      }

      const { upload_url, storage_key } = urlResult.data!;

      // 2. Upload file directly to MinIO/S3
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        });
        xhr.addEventListener("error", () => reject(new Error("Upload failed")));
        xhr.open("PUT", upload_url);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      // 3. Register document in database
      startTransition(async () => {
        const registerResult = await registerDocumentAction(
          {
            workspace_id: workspaceId,
            property_id: propertyId,
            storage_key,
            filename: file.name,
            content_type: file.type,
            size_bytes: file.size,
            tags: [],
          },
          propertyId,
        );

        if (registerResult.error) {
          setError(registerResult.error);
        } else if (registerResult.data) {
          setDocuments((prev) => [registerResult.data!, ...prev]);
        }
        setUploading(false);
        setUploadProgress(0);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no upload");
      setUploading(false);
      setUploadProgress(0);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("Tem certeza que deseja deletar este documento?")) return;
    startTransition(async () => {
      const result = await deleteDocumentAction(docId, propertyId);
      if (result.success) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-zinc-400">
          {documents.length} documento{documents.length !== 1 ? "s" : ""}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className={`cursor-pointer rounded px-3 py-1.5 text-sm font-medium text-white ${
              uploading
                ? "bg-zinc-600 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500"
            }`}
          >
            {uploading ? `Enviando... ${uploadProgress}%` : "Upload documento"}
          </label>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-900/60 bg-red-950/50 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Upload progress bar */}
      {uploading && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-700">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Documents list */}
      {documents.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 text-center text-sm text-zinc-400">
          Nenhum documento anexado
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Arquivo</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Tipo</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-400">Tamanho</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Data</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getFileIcon(doc.content_type)}</span>
                      <span className="text-white">{doc.filename}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {doc.content_type?.split("/").pop() ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300">
                    {formatFileSize(doc.size_bytes)}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{formatDate(doc.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={isPending}
                      className="text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      Deletar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

