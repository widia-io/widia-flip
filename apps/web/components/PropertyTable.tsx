"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, ExternalLink, Building2, Lightbulb, ArrowRight } from "lucide-react";

import type { Property } from "@widia/shared";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PropertyCard } from "@/components/PropertyCard";

interface PropertyTableProps {
  properties: Property[];
  statusFilter?: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  prospecting: { label: "Prospecção", variant: "outline" },
  analyzing: { label: "Analisando", variant: "secondary" },
  bought: { label: "Comprado", variant: "default" },
  renovation: { label: "Reforma", variant: "secondary" },
  for_sale: { label: "À Venda", variant: "outline" },
  sold: { label: "Vendido", variant: "default" },
  archived: { label: "Arquivado", variant: "secondary" },
};

export function PropertyTable({
  properties,
  statusFilter,
}: PropertyTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [localStatus, setLocalStatus] = useState(statusFilter ?? "all");

  const handleFilterChange = (status: string) => {
    setLocalStatus(status);
    const params = new URLSearchParams(searchParams.toString());
    if (status && status !== "all") {
      params.set("status_pipeline", status);
    } else {
      params.delete("status_pipeline");
    }
    startTransition(() => {
      router.push(`/app/properties?${params.toString()}`);
    });
  };

  const formatArea = (value: number | null | undefined) => {
    if (value == null) return "-";
    return `${value} m²`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  };

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
        <Building2 className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">Nenhum imóvel cadastrado</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Imóveis são criados a partir de leads convertidos na Prospecção.
      </p>
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-primary/5 px-4 py-3 text-left max-w-sm">
        <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
        <p className="text-xs text-muted-foreground">
          Vá para <strong>Prospecção</strong>, avalie um lead com o Flip Score e clique em <strong>Converter</strong>.
        </p>
      </div>
      <Link href="/app/prospects">
        <Button className="mt-6" variant="default">
          Ir para Prospecção
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    </div>
  );

  return (
    <div>
      {/* Filters */}
      <Card className="mb-4 lg:mb-0 lg:rounded-b-none">
        <div className="flex flex-wrap items-center gap-4 p-4 lg:border-b lg:border-border">
          <Select
            value={localStatus}
            onValueChange={handleFilterChange}
            disabled={isPending}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="prospecting">Prospecção</SelectItem>
              <SelectItem value="analyzing">Analisando</SelectItem>
              <SelectItem value="bought">Comprado</SelectItem>
              <SelectItem value="renovation">Reforma</SelectItem>
              <SelectItem value="for_sale">À Venda</SelectItem>
              <SelectItem value="sold">Vendido</SelectItem>
              <SelectItem value="archived">Arquivado</SelectItem>
            </SelectContent>
          </Select>

          {isPending && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </Card>

      {/* Mobile: Card list */}
      <div className="lg:hidden space-y-3">
        {properties.length === 0 ? (
          <Card className="p-6">{renderEmptyState()}</Card>
        ) : (
          properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))
        )}
      </div>

      {/* Desktop: Table */}
      <Card className="hidden lg:block lg:rounded-t-none lg:border-t-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Endereço</TableHead>
              <TableHead>Bairro</TableHead>
              <TableHead className="text-right">Área</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  {renderEmptyState()}
                </TableCell>
              </TableRow>
            ) : (
              properties.map((property) => {
                const status = STATUS_CONFIG[property.status_pipeline] ?? {
                  label: property.status_pipeline,
                  variant: "secondary" as const,
                };

                return (
                  <TableRow key={property.id}>
                    <TableCell>
                      <Link
                        href={`/app/properties/${property.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {property.address || "-"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {property.neighborhood || "-"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatArea(property.area_usable)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(property.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/app/properties/${property.id}`}>
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Abrir
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
