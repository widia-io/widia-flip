"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OpportunityFiltersProps {
  minScore: number;
  sort: string;
}

export function OpportunityFilters({ minScore, sort }: OpportunityFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string | number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(key, String(value));
      router.push(`/app/opportunities?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-wrap items-end gap-6 rounded-lg border bg-card p-4">
      {/* Score Filter */}
      <div className="flex-1 min-w-[200px] space-y-2">
        <Label className="text-xs text-muted-foreground">
          Score mínimo: <span className="font-bold text-foreground">{minScore}</span>
        </Label>
        <Slider
          value={[minScore]}
          onValueChange={(values: number[]) => updateFilter("min_score", values[0])}
          onValueCommit={(values: number[]) => updateFilter("min_score", values[0])}
          min={0}
          max={100}
          step={5}
          className="w-full"
        />
      </div>

      {/* Sort Filter */}
      <div className="min-w-[150px] space-y-2">
        <Label className="text-xs text-muted-foreground">Ordenar por</Label>
        <Select value={sort} onValueChange={(value) => updateFilter("sort", value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="score_desc">Maior Score</SelectItem>
            <SelectItem value="price_asc">Menor Preço</SelectItem>
            <SelectItem value="price_desc">Maior Preço</SelectItem>
            <SelectItem value="date_desc">Mais Recente</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
