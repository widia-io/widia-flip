"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Building2, FileText, ImageIcon, FileSpreadsheet, File } from "lucide-react";
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

function FileIcon({ contentType }: { contentType: string | null }) {
  const className = "h-4 w-4";
  if (!contentType) return <File className={className} />;
  if (contentType.startsWith("image/")) return <ImageIcon className={className} />;
  if (contentType === "application/pdf") return <FileText className={className} />;
  if (contentType.includes("excel") || contentType.includes("sheet")) return <FileSpreadsheet className={className} />;
  return <File className={className} />;
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

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Nenhum documento encontrado
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Total:</span>
              <span className="font-medium">{totalDocs} documento{totalDocs !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Tamanho:</span>
              <span className="font-medium">{formatFileSize(totalSize)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Imóveis:</span>
              <span className="font-medium">{grouped.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grouped by property */}
      {grouped.map((group) => (
        <Card key={group.propertyId}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <Link
                href={`/app/properties/${group.propertyId}/documents`}
                className="hover:underline"
              >
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" />
                  {group.propertyName}
                </CardTitle>
              </Link>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline">
                  {group.items.length} doc{group.items.length !== 1 ? "s" : ""}
                </Badge>
                <span className="text-muted-foreground">
                  {formatFileSize(group.totalSize)}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead className="text-right">Tamanho</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.items.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileIcon contentType={doc.content_type} />
                        <span className="font-medium truncate max-w-[200px]">{doc.filename}</span>
                        {doc.schedule_item_title && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            📅 {doc.schedule_item_title}
                          </Badge>
                        )}
                        {doc.cost_item_id && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            💰 Custo
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatFileSize(doc.size_bytes)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
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
