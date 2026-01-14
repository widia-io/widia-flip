"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, useEffect, useMemo } from "react";
import {
  Loader2,
  ExternalLink,
  Building2,
  Lightbulb,
  ArrowRight,
  Search,
  TableIcon,
  LayoutGrid,
  Columns,
} from "lucide-react";

import type { Property } from "@widia/shared";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertyKanbanView } from "@/components/properties/PropertyKanbanView";
import { getStatusConfig, PROPERTY_STATUS_CONFIG } from "@/lib/constants/property-status";

interface PropertyTableProps {
  readonly properties: Property[];
  readonly statusFilter?: string;
}

type ViewMode = "table" | "cards" | "kanban";
type SortOption = "recent" | "area" | "status";

const STORAGE_KEY = "property-view-mode";

export function PropertyTable({
  properties,
  statusFilter,
}: PropertyTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // View mode with localStorage persistence
  const [view, setView] = useState<ViewMode>("kanban");
  const [localStatus, setLocalStatus] = useState(statusFilter ?? "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  // Load view preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "table" || saved === "cards" || saved === "kanban") {
      setView(saved);
    }
  }, []);

  // Save view preference to localStorage
  const handleViewChange = (newView: string) => {
    const validView = newView as ViewMode;
    setView(validView);
    localStorage.setItem(STORAGE_KEY, validView);
  };

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

  // Client-side filtering and sorting
  const filteredProperties = useMemo(() => {
    let result = [...properties];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.address?.toLowerCase().includes(q) ||
          p.neighborhood?.toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sortBy) {
      case "recent":
        result.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case "area":
        result.sort((a, b) => (b.area_usable ?? 0) - (a.area_usable ?? 0));
        break;
      case "status":
        result.sort(
          (a, b) =>
            (PROPERTY_STATUS_CONFIG[a.status_pipeline]?.progressIndex ?? 0) -
            (PROPERTY_STATUS_CONFIG[b.status_pipeline]?.progressIndex ?? 0)
        );
        break;
    }

    return result;
  }, [properties, searchQuery, sortBy]);

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
          Vá para <strong>Prospecção</strong>, avalie um lead com o Flip Score e
          clique em <strong>Converter</strong>.
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

  const renderSearchEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
        <Search className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">Nenhum resultado</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Nenhum imóvel encontrado para &quot;{searchQuery}&quot;
      </p>
      <Button
        className="mt-4"
        variant="outline"
        onClick={() => setSearchQuery("")}
      >
        Limpar busca
      </Button>
    </div>
  );

  const renderTable = () => (
    <Card className="hidden lg:block">
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
          {filteredProperties.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="p-0">
                {searchQuery ? renderSearchEmptyState() : renderEmptyState()}
              </TableCell>
            </TableRow>
          ) : (
            filteredProperties.map((property) => {
              const status = getStatusConfig(property.status_pipeline);

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
  );

  const renderCards = () => (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {filteredProperties.length === 0 ? (
        <Card className="col-span-full p-6">
          {searchQuery ? renderSearchEmptyState() : renderEmptyState()}
        </Card>
      ) : (
        filteredProperties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))
      )}
    </div>
  );

  const renderKanban = () => (
    <>
      {properties.length === 0 ? (
        <Card className="p-6">{renderEmptyState()}</Card>
      ) : (
        <PropertyKanbanView properties={filteredProperties} />
      )}
    </>
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Search + Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar endereço, bairro..."
                className="pl-9"
              />
            </div>

            {/* Status filter */}
            <Select
              value={localStatus}
              onValueChange={handleFilterChange}
              disabled={isPending}
            >
              <SelectTrigger className={`w-full sm:w-[160px] ${localStatus !== "all" ? "border-primary" : ""}`}>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="prospecting">Prospecção</SelectItem>
                <SelectItem value="analyzing">Analisando</SelectItem>
                <SelectItem value="bought">Comprado</SelectItem>
                <SelectItem value="renovation">Em Obra</SelectItem>
                <SelectItem value="for_sale">À Venda</SelectItem>
                <SelectItem value="sold">Vendido</SelectItem>
                <SelectItem value="archived">Arquivado</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as SortOption)}
            >
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais recente</SelectItem>
                <SelectItem value="area">Maior área</SelectItem>
                <SelectItem value="status">Por etapa</SelectItem>
              </SelectContent>
            </Select>

            {isPending && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* View toggle - desktop only */}
          <div className="hidden lg:block">
            <Tabs value={view} onValueChange={handleViewChange}>
              <TabsList>
                <TabsTrigger value="table" className="gap-1.5">
                  <TableIcon className="h-4 w-4" />
                  Tabela
                </TabsTrigger>
                <TabsTrigger value="cards" className="gap-1.5">
                  <LayoutGrid className="h-4 w-4" />
                  Cards
                </TabsTrigger>
                <TabsTrigger value="kanban" className="gap-1.5">
                  <Columns className="h-4 w-4" />
                  Kanban
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </Card>

      {/* Mobile: Always cards */}
      <div className="lg:hidden">
        {filteredProperties.length === 0 ? (
          <Card className="p-6">
            {searchQuery ? renderSearchEmptyState() : renderEmptyState()}
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>

      {/* Desktop: Based on view selection */}
      <div className="hidden lg:block">
        {view === "table" && renderTable()}
        {view === "cards" && renderCards()}
        {view === "kanban" && renderKanban()}
      </div>
    </div>
  );
}
