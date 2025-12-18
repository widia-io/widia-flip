"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import type { Prospect } from "@widia/shared";

import { ProspectQuickAdd } from "@/components/ProspectQuickAdd";
import { ProspectRow } from "@/components/ProspectRow";

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
  const [localStatus, setLocalStatus] = useState(statusFilter ?? "");
  const [localSearch, setLocalSearch] = useState(searchQuery ?? "");

  const handleFilterChange = (status: string) => {
    setLocalStatus(status);
    const params = new URLSearchParams(searchParams.toString());
    if (status) {
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
    <div className="rounded-lg border border-neutral-800 bg-neutral-950">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 border-b border-neutral-800 p-4">
        <select
          value={localStatus}
          onChange={(e) => handleFilterChange(e.target.value)}
          disabled={isPending}
          className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
        >
          <option value="">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="discarded">Descartados</option>
          <option value="converted">Convertidos</option>
        </select>

        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="text"
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar bairro/endereço..."
            disabled={isPending}
            className="w-48 rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 hover:bg-neutral-800 disabled:opacity-50"
          >
            Buscar
          </button>
        </form>

        {isPending && (
          <span className="text-xs text-neutral-500">Carregando...</span>
        )}
      </div>

      {/* Quick Add */}
      <ProspectQuickAdd workspaceId={workspaceId} />

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-800 text-left text-xs text-neutral-500">
              <th className="px-4 py-3 font-medium">Bairro</th>
              <th className="px-4 py-3 font-medium">Endereço</th>
              <th className="px-4 py-3 font-medium text-right">Área</th>
              <th className="px-4 py-3 font-medium text-right">Valor</th>
              <th className="px-4 py-3 font-medium text-right">R$/m²</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {prospects.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-neutral-400"
                >
                  Nenhum prospect encontrado. Use o campo acima para adicionar o
                  primeiro.
                </td>
              </tr>
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
