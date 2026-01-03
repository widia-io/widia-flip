"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, useMemo } from "react";
import { Loader2, Search, Filter, X, ArrowUpDown, HelpCircle, ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";

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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface ProspectGridProps {
  prospects: Prospect[];
  workspaceId: string;
  statusFilter?: string;
  searchQuery?: string;
  canAccessFlipScoreV1?: boolean;
}

type SortOption = "score" | "recent" | "price" | "price_per_sqm";

const statusLabels: Record<string, string> = {
  active: "Ativos",
  discarded: "Descartados",
  converted: "Convertidos",
};

const sortLabels: Record<SortOption, string> = {
  score: "Maior Score",
  recent: "Mais recente",
  price: "Menor preço",
  price_per_sqm: "Menor R$/m²",
};

export function ProspectGrid({
  prospects,
  workspaceId,
  statusFilter,
  searchQuery,
  canAccessFlipScoreV1 = false,
}: ProspectGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [localStatus, setLocalStatus] = useState(statusFilter ?? "all");
  const [localSearch, setLocalSearch] = useState(searchQuery ?? "");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [guideOpen, setGuideOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const hasFilters = statusFilter || searchQuery;
  const activeFiltersCount = (statusFilter && statusFilter !== "all" ? 1 : 0) + (searchQuery ? 1 : 0);

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
    setFiltersOpen(false);
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

  // Filter controls component (used in both desktop and mobile)
  const FilterControls = ({ inSheet = false }: { inSheet?: boolean }) => (
    <div className={inSheet ? "space-y-4" : "flex flex-wrap items-center gap-3"}>
      <div className={inSheet ? "space-y-2" : "flex items-center gap-2"}>
        {inSheet && <label className="text-sm font-medium">Status</label>}
        {!inSheet && <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
        <Select
          value={localStatus}
          onValueChange={handleFilterChange}
          disabled={isPending}
        >
          <SelectTrigger className={inSheet ? "w-full" : "w-[160px]"} aria-label="Filtrar por status">
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

      <div className={inSheet ? "space-y-2" : "flex items-center gap-2"}>
        {inSheet && <label className="text-sm font-medium">Ordenar por</label>}
        {!inSheet && <ArrowUpDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
        <Select
          value={sortBy}
          onValueChange={(v) => setSortBy(v as SortOption)}
          disabled={isPending}
        >
          <SelectTrigger className={inSheet ? "w-full" : "w-[140px]"} aria-label="Ordenar por">
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

      {inSheet && (
        <form onSubmit={handleSearchSubmit} className="space-y-2">
          <label className="text-sm font-medium">Buscar</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="text"
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Bairro, rua, imobiliária..."
              disabled={isPending}
              className="w-full pl-9 pr-8"
              aria-label="Buscar"
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
          <Button type="submit" variant="secondary" className="w-full" disabled={isPending}>
            Buscar
          </Button>
        </form>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Commercial Header + Guide */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground line-clamp-2 sm:line-clamp-none">
          Capture anúncios/leads, priorize pelo Flip Score e converta para Imóveis quando decidir analisar a fundo.
        </p>
        <Collapsible open={guideOpen} onOpenChange={setGuideOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground">
              <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Como funciona?
              {guideOpen ? (
                <ChevronUp className="h-3 w-3" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3 w-3" aria-hidden="true" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <ol className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">1</span>
                  <span><strong className="text-foreground">Adicione um lead</strong> — cole a URL do anúncio ou preencha manualmente</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">2</span>
                  <span><strong className="text-foreground">Revise os dados</strong> — abra o lead para completar informações e calcular o Flip Score</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">3</span>
                  <span><strong className="text-foreground">Converta para Imóveis</strong> — quando decidir avançar, inicie a análise de viabilidade</span>
                </li>
              </ol>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Mobile Filters Sheet */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="right" className="w-80 sm:w-96">
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <FilterControls inSheet />
          </div>
          {hasFilters && (
            <div className="mt-6 pt-4 border-t">
              <Button variant="outline" className="w-full" onClick={clearAllFilters}>
                Limpar filtros
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3">
        {/* Mobile: Filters button + Add button */}
        <div className="flex items-center gap-2 lg:hidden">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
          <ProspectAddModal workspaceId={workspaceId} canAccessFlipScoreV1={canAccessFlipScoreV1} />
        </div>

        {/* Desktop: Full filters bar */}
        <div className="hidden lg:flex lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <FilterControls />

            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  type="text"
                  value={localSearch}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Buscar bairro, rua, imobiliária..."
                  disabled={isPending}
                  className="w-48 pl-9 pr-8 sm:w-64"
                  aria-label="Buscar por bairro, rua, imobiliária ou corretor"
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

            {isPending && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
            )}
          </div>

          <ProspectAddModal workspaceId={workspaceId} canAccessFlipScoreV1={canAccessFlipScoreV1} />
        </div>
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
              className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              Limpar filtros
            </button>
          )}

          {/* Results count */}
          <span className="ml-auto text-sm text-muted-foreground">
            {prospects.length} {prospects.length === 1 ? "lead" : "leads"}
          </span>
        </div>
      )}

      {/* Grid */}
      {sortedProspects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 py-12 sm:py-16 text-center px-4">
          <div className="rounded-full bg-muted p-4">
            <Search className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">
            {searchQuery || statusFilter ? "Nenhum lead encontrado" : "Nenhum lead ainda"}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {searchQuery || statusFilter
              ? "Tente ajustar os filtros ou termo de busca."
              : "Adicione seu primeiro lead para começar a priorizar pelo Flip Score."}
          </p>
          {!searchQuery && !statusFilter && (
            <div className="mt-6">
              <ProspectAddModal workspaceId={workspaceId} canAccessFlipScoreV1={canAccessFlipScoreV1} />
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {sortedProspects.map((prospect) => (
            <ProspectCard key={prospect.id} prospect={prospect} canAccessFlipScoreV1={canAccessFlipScoreV1} />
          ))}
        </div>
      )}
    </div>
  );
}
