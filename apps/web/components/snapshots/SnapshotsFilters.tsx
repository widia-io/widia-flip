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

interface SnapshotsFiltersProps {
  initialFilters: {
    snapshot_type?: "cash" | "financing" | "all";
    status_pipeline?: string;
    property_search?: string;
  };
}

const STATUS_OPTIONS = [
  { value: "all", label: "Todos status" },
  { value: "prospecting", label: "Prospecção" },
  { value: "analyzing", label: "Analisando" },
  { value: "bought", label: "Comprado" },
  { value: "renovation", label: "Reforma" },
  { value: "for_sale", label: "À Venda" },
  { value: "sold", label: "Vendido" },
  { value: "archived", label: "Arquivado" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "Todos tipos" },
  { value: "cash", label: "À Vista" },
  { value: "financing", label: "Financiamento" },
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

  return (
    <div className="flex flex-wrap gap-2">
      <Input
        placeholder="Buscar imóvel..."
        defaultValue={initialFilters.property_search ?? ""}
        onChange={handleSearchChange}
        className="w-40"
      />

      <Select
        value={initialFilters.snapshot_type ?? "all"}
        onValueChange={(value) => updateFilter("type", value)}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          {TYPE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={initialFilters.status_pipeline ?? "all"}
        onValueChange={(value) => updateFilter("status", value)}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
