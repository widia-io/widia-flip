"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Search, Filter } from "lucide-react";

import type { Prospect } from "@widia/shared";

import { ProspectCard } from "@/components/ProspectCard";
import { ProspectAddModal } from "@/components/ProspectAddModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={localStatus}
              onValueChange={handleFilterChange}
              disabled={isPending}
            >
              <SelectTrigger className="w-[160px]">
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
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={localSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Buscar bairro/endereço..."
                disabled={isPending}
                className="w-48 pl-9 sm:w-64"
              />
            </div>
            <Button type="submit" variant="secondary" disabled={isPending}>
              Buscar
            </Button>
          </form>

          {isPending && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Right: Add Button */}
        <ProspectAddModal workspaceId={workspaceId} />
      </div>

      {/* Grid */}
      {prospects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 py-16 text-center">
          <div className="rounded-full bg-muted p-4">
            <Search className="h-8 w-8 text-muted-foreground" />
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
          {prospects.map((prospect) => (
            <ProspectCard key={prospect.id} prospect={prospect} />
          ))}
        </div>
      )}

      {/* Results count */}
      {prospects.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          {prospects.length} imóve{prospects.length === 1 ? "l" : "is"}{" "}
          encontrado{prospects.length === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}

