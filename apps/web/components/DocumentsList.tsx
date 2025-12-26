"use client";

import { useState, useRef, useTransition } from "react";
import { Upload, Trash2, FileText, ImageIcon, FileSpreadsheet, File, Loader2 } from "lucide-react";
import type { Document } from "@widia/shared";
import {
  getUploadUrlAction,
  registerDocumentAction,
  deleteDocumentAction,
} from "@/lib/actions/documents";
import { usePaywall } from "@/components/PaywallModal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

function FileIcon({ contentType }: { contentType: string | null }) {
  const className = "h-4 w-4";
  if (!contentType) return <File className={className} />;
  if (contentType.startsWith("image/")) return <ImageIcon className={className} />;
  if (contentType === "application/pdf") return <FileText className={className} />;
  if (contentType.includes("excel") || contentType.includes("sheet")) return <FileSpreadsheet className={className} />;
  return <File className={className} />;
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
  const { showPaywall } = usePaywall();
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (file.size > MAX_FILE_SIZE) {
      setError("Arquivo muito grande. Máximo permitido: 50MB");
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Tipo de arquivo não permitido. Use PDF, imagens ou documentos Office.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
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

      // Use proxy route to avoid CORS issues with direct storage access
      const proxyUrl = `/api/storage/upload?url=${encodeURIComponent(upload_url)}`;
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
        xhr.open("PUT", proxyUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

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

        if ("enforcement" in registerResult && registerResult.enforcement) {
          showPaywall(registerResult.enforcement, workspaceId);
        } else if ("error" in registerResult && registerResult.error) {
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

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("Tem certeza que deseja deletar este documento?")) return;
    setDeletingId(docId);
    startTransition(async () => {
      const result = await deleteDocumentAction(docId, propertyId);
      if (result.success) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
      }
      setDeletingId(null);
    });
  };

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
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
              <Button asChild disabled={uploading}>
                <label htmlFor="file-upload" className="cursor-pointer">
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando... {uploadProgress}%
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload documento
                    </>
                  )}
                </label>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Upload progress bar */}
      {uploading && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Documents list */}
      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhum documento anexado
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Arquivo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Tamanho</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileIcon contentType={doc.content_type} />
                      <span className="font-medium">{doc.filename}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {doc.content_type?.split("/").pop() ?? "-"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatFileSize(doc.size_bytes)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(doc.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingId === doc.id || isPending}
                      className="text-destructive hover:text-destructive"
                    >
                      {deletingId === doc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

