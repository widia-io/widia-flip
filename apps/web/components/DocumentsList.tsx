"use client";

import { useState, useRef, useTransition, useMemo } from "react";
import {
  Upload,
  Trash2,
  FileText,
  ImageIcon,
  FileSpreadsheet,
  File,
  Loader2,
  HardDrive,
  Files,
  Calendar,
  Plus,
} from "lucide-react";
import type { Document } from "@widia/shared";
import {
  getUploadUrlAction,
  registerDocumentAction,
  deleteDocumentAction,
} from "@/lib/actions/documents";
import { usePaywall } from "@/components/PaywallModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

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
    });
  } catch {
    return dateStr;
  }
}

function getFileIconBg(contentType: string | null): string {
  if (!contentType) return "bg-gray-500/10";
  if (contentType === "application/pdf") return "bg-red-500/10";
  if (contentType.startsWith("image/")) return "bg-blue-500/10";
  if (contentType.includes("excel") || contentType.includes("sheet"))
    return "bg-green-500/10";
  if (contentType.includes("word") || contentType.includes("document"))
    return "bg-purple-500/10";
  return "bg-gray-500/10";
}

function getFileTypeBadgeClass(contentType: string | null): string {
  if (!contentType) return "border-gray-300 text-gray-600";
  if (contentType === "application/pdf") return "border-red-300 text-red-600";
  if (contentType.startsWith("image/")) return "border-blue-300 text-blue-600";
  if (contentType.includes("excel") || contentType.includes("sheet"))
    return "border-green-300 text-green-600";
  if (contentType.includes("word") || contentType.includes("document"))
    return "border-purple-300 text-purple-600";
  return "border-gray-300 text-gray-600";
}

function getFileTypeLabel(contentType: string | null): string {
  if (!contentType) return "Arquivo";
  if (contentType === "application/pdf") return "PDF";
  if (contentType.startsWith("image/")) return "Imagem";
  if (contentType.includes("excel") || contentType.includes("sheet"))
    return "Planilha";
  if (contentType.includes("word") || contentType.includes("document"))
    return "Documento";
  return "Arquivo";
}

function FileIcon({ contentType }: { contentType: string | null }) {
  if (!contentType) return <File className="h-4 w-4 text-gray-500" />;
  if (contentType.startsWith("image/"))
    return <ImageIcon className="h-4 w-4 text-blue-500" />;
  if (contentType === "application/pdf")
    return <FileText className="h-4 w-4 text-red-500" />;
  if (contentType.includes("excel") || contentType.includes("sheet"))
    return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
  if (contentType.includes("word") || contentType.includes("document"))
    return <File className="h-4 w-4 text-purple-500" />;
  return <File className="h-4 w-4 text-gray-500" />;
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

  const totalSize = useMemo(
    () => documents.reduce((acc, d) => acc + (d.size_bytes ?? 0), 0),
    [documents]
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (file.size > MAX_FILE_SIZE) {
      setError("Arquivo muito grande. Maximo permitido: 50MB");
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(
        "Tipo de arquivo nao permitido. Use PDF, imagens ou documentos Office."
      );
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
          propertyId
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
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {/* Total Documents */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Documentos
                </p>
                <p className="text-3xl font-bold tabular-nums">
                  {documents.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Size */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
                <HardDrive className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Armazenamento
                </p>
                <p className="text-3xl font-bold tabular-nums">
                  {formatFileSize(totalSize)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload area */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Upload de Documentos</h3>
                <p className="text-sm text-muted-foreground">
                  Arraste arquivos ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, imagens, Word, Excel (max 50MB)
                </p>
              </div>
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
              <Button asChild disabled={uploading} size="lg">
                <label htmlFor="file-upload" className="cursor-pointer">
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {uploadProgress}%
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Selecionar arquivo
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
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-3">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Upload progress bar */}
      {uploading && (
        <Card className="overflow-hidden">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Enviando...</span>
              <span className="text-sm tabular-nums text-muted-foreground">
                {uploadProgress}%
              </span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Documents list */}
      {documents.length === 0 ? (
        <Card className="border-dashed">
          <EmptyState
            icon={FileText}
            title="Nenhum documento anexado"
            description="Adicione documentos como contratos, fotos ou notas fiscais."
            tip="Clique em 'Selecionar arquivo' para comecar."
          />
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                <Files className="h-4 w-4" />
              </div>
              <CardTitle className="text-base">Documentos</CardTitle>
              <Badge variant="secondary" className="ml-auto font-mono text-xs">
                {documents.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Arquivo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Tamanho</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right pr-6">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow
                    key={doc.id}
                    className="group hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-lg ${getFileIconBg(doc.content_type)}`}
                        >
                          <FileIcon contentType={doc.content_type} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[200px]">
                            {doc.filename}
                          </p>
                          {doc.schedule_item_title && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Calendar className="h-3 w-3" />
                              {doc.schedule_item_title}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getFileTypeBadgeClass(doc.content_type)}
                      >
                        {getFileTypeLabel(doc.content_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatFileSize(doc.size_bytes)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(doc.created_at)}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(doc.id)}
                        disabled={deletingId === doc.id || isPending}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
