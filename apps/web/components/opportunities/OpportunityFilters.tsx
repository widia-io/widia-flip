"use client";

import { type KeyboardEvent, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, SlidersHorizontal, X } from "lucide-react";
import type { OpportunityFacetsResponse, OpportunityStatus } from "@widia/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const allOptionValue = "__all__";

export interface OpportunityFilterState {
  state?: string;
  city?: string;
  neighborhood?: string;
  minScore: number;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  bedrooms: number[];
  status: OpportunityStatus[];
  sort: string;
}

interface OpportunityFiltersProps {
  filters: OpportunityFilterState;
  facets: OpportunityFacetsResponse | null;
  facetsError?: string | null;
}

const statusLabel: Record<OpportunityStatus, string> = {
  new: "Novo",
  viewed: "Visto",
  contacted: "Contatado",
  discarded: "Descartado",
};

const sortOptions = [
  { value: "score_desc", label: "Maior score" },
  { value: "price_asc", label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
  { value: "date_desc", label: "Mais recente" },
];

function parseNumberish(value: string): number | undefined {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function onInputEnterBlur(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key === "Enter") {
    event.preventDefault();
    event.currentTarget.blur();
  }
}

export function OpportunityFilters({
  filters,
  facets,
  facetsError = null,
}: OpportunityFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const availableCities = useMemo(() => {
    if (!facets) return [];
    if (!filters.state) return facets.cities;
    return facets.cities.filter(
      (item) => item.state?.toLowerCase() === filters.state?.toLowerCase()
    );
  }, [facets, filters.state]);

  const availableNeighborhoods = useMemo(() => {
    if (!facets) return [];

    return facets.neighborhoods.filter((item) => {
      const matchState = !filters.state || item.state?.toLowerCase() === filters.state?.toLowerCase();
      const matchCity = !filters.city || item.city?.toLowerCase() === filters.city?.toLowerCase();
      return matchState && matchCity;
    });
  }, [facets, filters.state, filters.city]);

  const pushParams = (mutator: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutator(params);
    const query = params.toString();
    startTransition(() => {
      router.push(`/app/opportunities${query ? `?${query}` : ""}`);
    });
  };

  const setScalarFilter = (key: string, value?: string | number) => {
    pushParams((params) => {
      if (value === undefined || value === null || value === "") {
        params.delete(key);
        return;
      }
      params.set(key, String(value));
    });
  };

  const setArrayFilter = (key: string, values: Array<string | number>) => {
    pushParams((params) => {
      if (values.length === 0) {
        params.delete(key);
        return;
      }
      params.set(key, values.join(","));
    });
  };

  const toggleValue = <T extends string | number>(
    key: string,
    currentValues: T[],
    value: T
  ) => {
    const next = currentValues.includes(value)
      ? currentValues.filter((item) => item !== value)
      : [...currentValues, value];

    if (typeof value === "number") {
      const sorted = [...next].sort((a, b) => Number(a) - Number(b));
      setArrayFilter(key, sorted);
      return;
    }

    setArrayFilter(key, next);
  };

  const clearAllFilters = () => {
    startTransition(() => {
      router.push("/app/opportunities");
    });
  };

  const activeFilterChips: Array<{ key: string; label: string; onRemove: () => void }> = [];

  if (filters.state) {
    activeFilterChips.push({
      key: "state",
      label: `UF: ${filters.state.toUpperCase()}`,
      onRemove: () =>
        pushParams((params) => {
          params.delete("state");
          params.delete("city");
          params.delete("neighborhood");
        }),
    });
  }
  if (filters.city) {
    activeFilterChips.push({
      key: "city",
      label: `Cidade: ${filters.city}`,
      onRemove: () =>
        pushParams((params) => {
          params.delete("city");
          params.delete("neighborhood");
        }),
    });
  }
  if (filters.neighborhood) {
    activeFilterChips.push({
      key: "neighborhood",
      label: `Bairro: ${filters.neighborhood}`,
      onRemove: () => setScalarFilter("neighborhood"),
    });
  }
  if (filters.minScore !== 50) {
    activeFilterChips.push({
      key: "min_score",
      label: `Score >= ${filters.minScore}`,
      onRemove: () => setScalarFilter("min_score", 50),
    });
  }
  if (filters.minPrice) {
    activeFilterChips.push({
      key: "min_price",
      label: `Preço min: R$ ${filters.minPrice.toLocaleString("pt-BR")}`,
      onRemove: () => setScalarFilter("min_price"),
    });
  }
  if (filters.maxPrice) {
    activeFilterChips.push({
      key: "max_price",
      label: `Preço max: R$ ${filters.maxPrice.toLocaleString("pt-BR")}`,
      onRemove: () => setScalarFilter("max_price"),
    });
  }
  if (filters.minArea) {
    activeFilterChips.push({
      key: "min_area",
      label: `Área min: ${filters.minArea}m²`,
      onRemove: () => setScalarFilter("min_area"),
    });
  }
  if (filters.maxArea) {
    activeFilterChips.push({
      key: "max_area",
      label: `Área max: ${filters.maxArea}m²`,
      onRemove: () => setScalarFilter("max_area"),
    });
  }
  for (const bedroom of filters.bedrooms) {
    activeFilterChips.push({
      key: `bedrooms-${bedroom}`,
      label: `${bedroom} quartos`,
      onRemove: () => toggleValue("bedrooms", filters.bedrooms, bedroom),
    });
  }
  for (const status of filters.status) {
    activeFilterChips.push({
      key: `status-${status}`,
      label: `Status: ${statusLabel[status]}`,
      onRemove: () => toggleValue("status", filters.status, status),
    });
  }
  if (filters.sort !== "score_desc") {
    activeFilterChips.push({
      key: "sort",
      label: `Ordem: ${sortOptions.find((item) => item.value === filters.sort)?.label ?? filters.sort}`,
      onRemove: () => setScalarFilter("sort"),
    });
  }

  const hasFacetData = Boolean(facets && facets.states.length > 0);

  return (
    <div className="space-y-4 rounded-lg border border-border/80 bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Filtros</h2>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearAllFilters}
          disabled={isPending}
        >
          Limpar tudo
        </Button>
      </div>

      {facetsError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Falha ao carregar facets: {facetsError}
        </div>
      ) : null}

      {!facets && !facetsError ? (
        <div className="rounded-md border border-dashed border-border/60 p-3 text-sm text-muted-foreground">
          Carregando filtros...
        </div>
      ) : null}

      {facets && facets.states.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 p-3 text-sm text-muted-foreground">
          Ainda nao existem oportunidades indexadas para montar filtros por localizacao.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="space-y-2">
          <Label>UF</Label>
          <Select
            value={filters.state || allOptionValue}
            onValueChange={(value) => {
              if (value === allOptionValue) {
                pushParams((params) => {
                  params.delete("state");
                  params.delete("city");
                  params.delete("neighborhood");
                });
                return;
              }
              pushParams((params) => {
                params.set("state", value);
                params.delete("city");
                params.delete("neighborhood");
              });
            }}
            disabled={isPending || !hasFacetData}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={allOptionValue}>Todas</SelectItem>
              {facets?.states.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label} ({item.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Cidade</Label>
          <Select
            value={filters.city || allOptionValue}
            onValueChange={(value) => {
              if (value === allOptionValue) {
                pushParams((params) => {
                  params.delete("city");
                  params.delete("neighborhood");
                });
                return;
              }
              pushParams((params) => {
                params.set("city", value);
                params.delete("neighborhood");
              });
            }}
            disabled={isPending || availableCities.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={allOptionValue}>Todas</SelectItem>
              {availableCities.map((item) => (
                <SelectItem key={`${item.state}-${item.value}`} value={item.value}>
                  {item.label} ({item.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Bairro</Label>
          <Select
            value={filters.neighborhood || allOptionValue}
            onValueChange={(value) =>
              setScalarFilter("neighborhood", value === allOptionValue ? undefined : value)
            }
            disabled={isPending || availableNeighborhoods.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={allOptionValue}>Todos</SelectItem>
              {availableNeighborhoods.map((item) => (
                <SelectItem
                  key={`${item.state}-${item.city}-${item.value}`}
                  value={item.value}
                >
                  {item.label} ({item.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Ordenar</Label>
          <Select
            value={filters.sort}
            onValueChange={(value) => setScalarFilter("sort", value)}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>
            Score minimo: <span className="font-semibold">{filters.minScore}</span>
          </Label>
          <Slider
            value={[filters.minScore]}
            onValueCommit={(values) => setScalarFilter("min_score", values[0])}
            min={0}
            max={100}
            step={5}
            disabled={isPending}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Preco min (R$)</Label>
            <Input
              key={`min-price-${filters.minPrice ?? "empty"}`}
              type="number"
              min={0}
              step={1000}
              defaultValue={filters.minPrice ?? ""}
              onBlur={(event) => {
                const parsed = parseNumberish(event.currentTarget.value);
                setScalarFilter("min_price", parsed ? Math.round(parsed) : undefined);
              }}
              onKeyDown={onInputEnterBlur}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label>Preco max (R$)</Label>
            <Input
              key={`max-price-${filters.maxPrice ?? "empty"}`}
              type="number"
              min={0}
              step={1000}
              defaultValue={filters.maxPrice ?? ""}
              onBlur={(event) => {
                const parsed = parseNumberish(event.currentTarget.value);
                setScalarFilter("max_price", parsed ? Math.round(parsed) : undefined);
              }}
              onKeyDown={onInputEnterBlur}
              disabled={isPending}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Area min (m2)</Label>
            <Input
              key={`min-area-${filters.minArea ?? "empty"}`}
              type="number"
              min={0}
              step={1}
              defaultValue={filters.minArea ?? ""}
              onBlur={(event) => {
                const parsed = parseNumberish(event.currentTarget.value);
                setScalarFilter("min_area", parsed);
              }}
              onKeyDown={onInputEnterBlur}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label>Area max (m2)</Label>
            <Input
              key={`max-area-${filters.maxArea ?? "empty"}`}
              type="number"
              min={0}
              step={1}
              defaultValue={filters.maxArea ?? ""}
              onBlur={(event) => {
                const parsed = parseNumberish(event.currentTarget.value);
                setScalarFilter("max_area", parsed);
              }}
              onKeyDown={onInputEnterBlur}
              disabled={isPending}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Quartos</Label>
          <div className="flex flex-wrap gap-2">
            {facets?.bedrooms.length ? (
              facets.bedrooms.map((item) => {
                const active = filters.bedrooms.includes(item.value);
                return (
                  <Button
                    key={item.value}
                    type="button"
                    variant={active ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleValue("bedrooms", filters.bedrooms, item.value)}
                    disabled={isPending}
                  >
                    {item.value}q ({item.count})
                  </Button>
                );
              })
            ) : (
              <span className="text-xs text-muted-foreground">Sem dados</span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <div className="flex flex-wrap gap-2">
            {(facets?.statuses ?? []).map((item) => {
              const value = item.value as OpportunityStatus;
              const active = filters.status.includes(value);

              return (
                <Button
                  key={item.value}
                  type="button"
                  variant={active ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleValue("status", filters.status, value)}
                  disabled={isPending}
                >
                  {statusLabel[value] ?? item.label} ({item.count})
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {activeFilterChips.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-t border-border/70 pt-3">
          {activeFilterChips.map((chip) => (
            <Badge key={chip.key} variant="secondary" className="gap-1 px-2 py-1">
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                className="rounded-full p-0.5 hover:bg-background/80"
                disabled={isPending}
                aria-label={`Remover filtro ${chip.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
