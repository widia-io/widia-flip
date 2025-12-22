"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, useMemo } from "react";
import { Loader2, Search, Filter, X, ArrowUpDown } from "lucide-react";

import type { Prospect } from "@widia/shared";

import { ProspectCard } from "@/components/ProspectCard";
import { ProspectAddModal } from "@/components/ProspectAddModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProspectGridProps {
  prospects: Prospect[];
  workspaceId: string;
  statusFilter?: string;
  searchQuery?: string;
}

type SortOption = "score" | "recent" | "price" | "price_per_sqm";

const statusLabels: Record<string, string> = {
  active: "Ativos",
  discarded: "Descartados",
  converted: "Convertidos",
};

export function ProspectGrid({
  prospects,
  workspaceId,
  statusFilter,
  searchQuery,
}: ProspectGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [localStatus, setLocalStatus] = useState(statusFilter ?? "all");
  const [localSearch, setLocalSearch] = useState(searchQuery ?? "");
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  const hasFilters = statusFilter || searchQuery;

  const handleFilterChange = (status: string) => {
    setLocalStatus(status);
    const params = new URLSearchParams(searchParams.toString());
    if (status && status !== "all") {
      params.set("status", status);
    } else {
      params.delete("status");
    }
    startTransition(() => {
      router.push(`/app/prospects?${params.toString()}`);
    });
  };

  const handleSearchChange = (q: string) => {
    setLocalSearch(q);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (localSearch) {
      params.set("q", localSearch);
    } else {
      params.delete("q");
    }
    startTransition(() => {
      router.push(`/app/prospects?${params.toString()}`);
    });
  };

  const clearSearch = () => {
    setLocalSearch("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    startTransition(() => {
      router.push(`/app/prospects?${params.toString()}`);
    });
  };

  const clearAllFilters = () => {
    setLocalStatus("all");
    setLocalSearch("");
    startTransition(() => {
      router.push("/app/prospects");
    });
  };

  const removeStatusFilter = () => {
    handleFilterChange("all");
  };

  const removeSearchFilter = () => {
    clearSearch();
  };

  // Client-side sorting
  const sortedProspects = useMemo(() => {
    const sorted = [...prospects];
    switch (sortBy) {
      case "score":
        sorted.sort((a, b) => (b.flip_score ?? -1) - (a.flip_score ?? -1));
        break;
      case "recent":
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "price":
        sorted.sort((a, b) => (a.asking_price ?? Infinity) - (b.asking_price ?? Infinity));
        break;
      case "price_per_sqm":
        sorted.sort((a, b) => (a.price_per_sqm ?? Infinity) - (b.price_per_sqm ?? Infinity));
        break;
    }
    return sorted;
  }, [prospects, sortBy]);

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Select
              value={localStatus}
              onValueChange={handleFilterChange}
              disabled={isPending}
            >
              <SelectTrigger className="w-[160px]" aria-label="Filtrar por status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="discarded">Descartados</SelectItem>
                <SelectItem value="converted">Convertidos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                type="text"
                value={localSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Buscar bairro/endereço..."
                disabled={isPending}
                className="w-48 pl-9 pr-8 sm:w-64"
                aria-label="Buscar por bairro ou endereço"
              />
              {localSearch && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Limpar busca"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <Button type="submit" variant="secondary" disabled={isPending}>
              Buscar
            </Button>
          </form>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as SortOption)}
              disabled={isPending}
            >
              <SelectTrigger className="w-[140px]" aria-label="Ordenar por">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Maior Score</SelectItem>
                <SelectItem value="recent">Mais recente</SelectItem>
                <SelectItem value="price">Menor preço</SelectItem>
                <SelectItem value="price_per_sqm">Menor R$/m²</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isPending && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
          )}
        </div>

        {/* Right: Add Button */}
        <ProspectAddModal workspaceId={workspaceId} />
      </div>

      {/* Active Filters + Count */}
      {(hasFilters || prospects.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Active filter chips */}
          {statusFilter && statusFilter !== "all" && (
            <Badge variant="secondary" className="gap-1 pl-2">
              Status: {statusLabels[statusFilter] || statusFilter}
              <button
                onClick={removeStatusFilter}
                className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                aria-label="Remover filtro de status"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {searchQuery && (
            <Badge variant="secondary" className="gap-1 pl-2">
              Busca: &ldquo;{searchQuery}&rdquo;
              <button
                onClick={removeSearchFilter}
                className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                aria-label="Remover filtro de busca"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {hasFilters && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              Limpar filtros
            </button>
          )}

          {/* Results count */}
          <span className="ml-auto text-sm text-muted-foreground">
            {prospects.length} imóve{prospects.length === 1 ? "l" : "is"} encontrado{prospects.length === 1 ? "" : "s"}
          </span>
        </div>
      )}

      {/* Grid */}
      {sortedProspects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 py-16 text-center">
          <div className="rounded-full bg-muted p-4">
            <Search className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">
            Nenhum imóvel encontrado
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {searchQuery || statusFilter
              ? "Tente ajustar os filtros ou termo de busca."
              : "Comece adicionando seu primeiro imóvel para prospecção."}
          </p>
          {!searchQuery && !statusFilter && (
            <div className="mt-6">
              <ProspectAddModal workspaceId={workspaceId} />
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sortedProspects.map((prospect) => (
            <ProspectCard key={prospect.id} prospect={prospect} />
          ))}
        </div>
      )}
    </div>
  );
}
