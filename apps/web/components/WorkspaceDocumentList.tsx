"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  FileText,
  ImageIcon,
  FileSpreadsheet,
  File,
  List,
  CalendarDays,
  HardDrive,
  FolderOpen,
  Calendar,
} from "lucide-react";
import type { WorkspaceDocumentItem } from "@widia/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DocumentsCalendar } from "@/components/DocumentsCalendar";
import { EmptyState } from "@/components/ui/empty-state";

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

interface WorkspaceDocumentListProps {
  workspaceId: string;
  items: WorkspaceDocumentItem[];
}

interface GroupedByProperty {
  propertyId: string;
  propertyName: string;
  items: WorkspaceDocumentItem[];
  totalSize: number;
}

export function WorkspaceDocumentList({ items }: WorkspaceDocumentListProps) {
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  const grouped = useMemo(() => {
    const map = new Map<string, GroupedByProperty>();

    for (const item of items) {
      const propId = item.property_id ?? "orphan";
      if (!map.has(propId)) {
        map.set(propId, {
          propertyId: propId,
          propertyName: item.property_name,
          items: [],
          totalSize: 0,
        });
      }

      const group = map.get(propId)!;
      group.items.push(item);
      group.totalSize += item.size_bytes ?? 0;
    }

    return Array.from(map.values()).sort((a, b) =>
      a.propertyName.localeCompare(b.propertyName)
    );
  }, [items]);

  const totalDocs = items.length;
  const totalSize = items.reduce((acc, d) => acc + (d.size_bytes ?? 0), 0);

  const typeStats = useMemo(() => {
    let pdfCount = 0;
    let imageCount = 0;
    let otherCount = 0;
    for (const item of items) {
      if (item.content_type === "application/pdf") pdfCount++;
      else if (item.content_type?.startsWith("image/")) imageCount++;
      else otherCount++;
    }
    return { pdfCount, imageCount, otherCount };
  }, [items]);

  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <EmptyState
          icon={FileText}
          title="Nenhum documento encontrado"
          description="Seus documentos aparecerao aqui organizados por imovel."
          tip="Adicione documentos na pagina de cada imovel ou pelo cronograma."
          action={{
            label: "Ver imoveis",
            href: "/app/properties",
          }}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Documents */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Total Documentos
                </p>
                <p className="text-3xl font-bold tabular-nums">{totalDocs}</p>
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

        {/* Properties Count */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <Building2 className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Imoveis
                </p>
                <p className="text-3xl font-bold tabular-nums">
                  {grouped.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PDFs Count */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                <FileText className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  PDFs
                </p>
                <p className="text-3xl font-bold tabular-nums">
                  {typeStats.pdfCount}
                </p>
                <p className="text-sm text-muted-foreground">
                  {typeStats.imageCount} img, {typeStats.otherCount} outros
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                <FolderOpen className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">Por Imovel</span>
              <Badge variant="secondary" className="font-mono text-xs">
                {grouped.length}
              </Badge>
            </div>
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(v: string) =>
                v && setViewMode(v as "list" | "calendar")
              }
            >
              <ToggleGroupItem value="list" aria-label="Ver como lista" size="sm">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="calendar"
                aria-label="Ver como calendario"
                size="sm"
              >
                <CalendarDays className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardContent>
      </Card>

      {/* Calendar View */}
      {viewMode === "calendar" && <DocumentsCalendar items={items} />}

      {/* List View - Grouped by property */}
      {viewMode === "list" &&
        grouped.map((group) => (
          <Card key={group.propertyId}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Link
                  href={`/app/properties/${group.propertyId}/documents`}
                  className="flex items-center gap-3 hover:text-primary transition-colors group"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {group.propertyName}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(group.totalSize)}
                    </p>
                  </div>
                </Link>
                <Badge variant="outline" className="tabular-nums">
                  {group.items.length} doc{group.items.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Arquivo</TableHead>
                    <TableHead className="text-right">Tamanho</TableHead>
                    <TableHead className="pr-6">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.items.map((doc) => (
                    <TableRow
                      key={doc.id}
                      className="group hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg ${getFileIconBg(doc.content_type)}`}
                          >
                            <FileIcon contentType={doc.content_type} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[250px]">
                              {doc.filename}
                            </p>
                            {doc.schedule_item_title && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Calendar className="h-3 w-3" />
                                {doc.schedule_item_title}
                              </p>
                            )}
                          </div>
                          {doc.cost_item_id && (
                            <Badge
                              variant="secondary"
                              className="text-xs shrink-0"
                            >
                              Custo
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatFileSize(doc.size_bytes)}
                      </TableCell>
                      <TableCell className="text-muted-foreground pr-6">
                        {formatDate(doc.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
