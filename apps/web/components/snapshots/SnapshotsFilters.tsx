"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Banknote, CreditCard, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";

interface SnapshotsFiltersProps {
  initialFilters: {
    snapshot_type?: "cash" | "financing" | "all";
    status_pipeline?: string;
    property_search?: string;
  };
}

const STATUS_OPTIONS = [
  { value: "all", label: "Todos status", color: "text-muted-foreground" },
  { value: "prospecting", label: "Prospecção", color: "text-amber-600" },
  { value: "analyzing", label: "Analisando", color: "text-blue-600" },
  { value: "bought", label: "Comprado", color: "text-green-600" },
  { value: "renovation", label: "Reforma", color: "text-orange-600" },
  { value: "for_sale", label: "À Venda", color: "text-purple-600" },
  { value: "sold", label: "Vendido", color: "text-emerald-600" },
  { value: "archived", label: "Arquivado", color: "text-slate-500" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "Todos tipos", icon: null },
  { value: "cash", label: "À Vista", icon: Banknote },
  { value: "financing", label: "Financiamento", icon: CreditCard },
];

export function SnapshotsFilters({ initialFilters }: SnapshotsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/app/snapshots?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("search", value);
      } else {
        params.delete("search");
      }
      router.push(`/app/snapshots?${params.toString()}`);
    },
    [router, searchParams]
  );

  const hasActiveFilters =
    initialFilters.property_search ||
    (initialFilters.snapshot_type && initialFilters.snapshot_type !== "all") ||
    (initialFilters.status_pipeline && initialFilters.status_pipeline !== "all");

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar imóvel..."
          defaultValue={initialFilters.property_search ?? ""}
          onChange={handleSearchChange}
          className={cn(
            "pl-9 w-44 h-9 text-sm transition-all",
            initialFilters.property_search && "border-primary/50 bg-primary/5"
          )}
        />
      </div>

      {/* Type Filter */}
      <Select
        value={initialFilters.snapshot_type ?? "all"}
        onValueChange={(value) => updateFilter("type", value)}
      >
        <SelectTrigger
          className={cn(
            "w-[140px] h-9 text-sm",
            initialFilters.snapshot_type &&
              initialFilters.snapshot_type !== "all" &&
              "border-primary/50 bg-primary/5"
          )}
        >
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          {TYPE_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  {Icon ? (
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5",
                        option.value === "cash"
                          ? "text-green-600"
                          : "text-blue-600"
                      )}
                    />
                  ) : (
                    <div className="w-3.5" />
                  )}
                  <span>{option.label}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select
        value={initialFilters.status_pipeline ?? "all"}
        onValueChange={(value) => updateFilter("status", value)}
      >
        <SelectTrigger
          className={cn(
            "w-[140px] h-9 text-sm",
            initialFilters.status_pipeline &&
              initialFilters.status_pipeline !== "all" &&
              "border-primary/50 bg-primary/5"
          )}
        >
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                <CircleDot className={cn("h-3 w-3", option.color)} />
                <span>{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Active filters indicator */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1.5 text-xs text-primary">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span className="font-medium">Filtros ativos</span>
        </div>
      )}
    </div>
  );
}
