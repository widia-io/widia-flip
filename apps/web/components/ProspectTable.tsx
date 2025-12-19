"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import type { Prospect } from "@widia/shared";

import { ProspectQuickAdd } from "@/components/ProspectQuickAdd";
import { ProspectRow } from "@/components/ProspectRow";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

interface ProspectTableProps {
  prospects: Prospect[];
  workspaceId: string;
  statusFilter?: string;
  searchQuery?: string;
}

export function ProspectTable({
  prospects,
  workspaceId,
  statusFilter,
  searchQuery,
}: ProspectTableProps) {
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

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatArea = (value: number | null | undefined) => {
    if (value == null) return "-";
    return `${value} m²`;
  };

  const formatPricePerSqm = (value: number | null | undefined) => {
    if (value == null) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 border-b border-border p-4">
        <Select
          value={localStatus}
          onValueChange={handleFilterChange}
          disabled={isPending}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="discarded">Descartados</SelectItem>
            <SelectItem value="converted">Convertidos</SelectItem>
          </SelectContent>
        </Select>

        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <Input
            type="text"
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar bairro/endereço..."
            disabled={isPending}
            className="w-48"
          />
          <Button type="submit" variant="secondary" disabled={isPending}>
            Buscar
          </Button>
        </form>

        {isPending && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Quick Add */}
      <ProspectQuickAdd workspaceId={workspaceId} />

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Bairro</TableHead>
            <TableHead>Endereço</TableHead>
            <TableHead className="text-right">Área</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">R$/m²</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {prospects.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="h-24 text-center text-muted-foreground"
              >
                Nenhum prospect encontrado. Use o campo acima para adicionar o
                primeiro.
              </TableCell>
            </TableRow>
          ) : (
            prospects.map((prospect) => (
              <ProspectRow
                key={prospect.id}
                prospect={prospect}
                formatCurrency={formatCurrency}
                formatArea={formatArea}
                formatPricePerSqm={formatPricePerSqm}
              />
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
