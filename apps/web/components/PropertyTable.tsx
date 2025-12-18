"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import type { Property } from "@widia/shared";

interface PropertyTableProps {
  properties: Property[];
  statusFilter?: string;
}

const STATUS_LABELS: Record<string, string> = {
  prospecting: "Prospecção",
  analyzing: "Analisando",
  bought: "Comprado",
  renovation: "Reforma",
  for_sale: "À Venda",
  sold: "Vendido",
  archived: "Arquivado",
};

const STATUS_COLORS: Record<string, string> = {
  prospecting: "bg-blue-900/50 text-blue-300",
  analyzing: "bg-yellow-900/50 text-yellow-300",
  bought: "bg-green-900/50 text-green-300",
  renovation: "bg-orange-900/50 text-orange-300",
  for_sale: "bg-purple-900/50 text-purple-300",
  sold: "bg-emerald-900/50 text-emerald-300",
  archived: "bg-neutral-800 text-neutral-400",
};

export function PropertyTable({
  properties,
  statusFilter,
}: PropertyTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [localStatus, setLocalStatus] = useState(statusFilter ?? "");

  const handleFilterChange = (status: string) => {
    setLocalStatus(status);
    const params = new URLSearchParams(searchParams.toString());
    if (status) {
      params.set("status_pipeline", status);
    } else {
      params.delete("status_pipeline");
    }
    startTransition(() => {
      router.push(`/app/properties?${params.toString()}`);
    });
  };

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
          <option value="prospecting">Prospecção</option>
          <option value="analyzing">Analisando</option>
          <option value="bought">Comprado</option>
          <option value="renovation">Reforma</option>
          <option value="for_sale">À Venda</option>
          <option value="sold">Vendido</option>
          <option value="archived">Arquivado</option>
        </select>

        {isPending && (
          <span className="text-xs text-neutral-500">Carregando...</span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-800 text-left text-xs text-neutral-500">
              <th className="px-4 py-3 font-medium">Endereço</th>
              <th className="px-4 py-3 font-medium">Bairro</th>
              <th className="px-4 py-3 font-medium text-right">Área</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Criado em</th>
              <th className="px-4 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {properties.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-neutral-400"
                >
                  Nenhum imóvel encontrado. Converta um prospect ou crie um novo
                  imóvel.
                </td>
              </tr>
            ) : (
              properties.map((property) => (
                <tr
                  key={property.id}
                  className="hover:bg-neutral-900/50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-neutral-100">
                    <Link
                      href={`/app/properties/${property.id}`}
                      className="hover:text-blue-400 hover:underline"
                    >
                      {property.address || "-"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-300">
                    {property.neighborhood || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-300 text-right">
                    {formatArea(property.area_usable)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[property.status_pipeline] || "bg-neutral-800 text-neutral-400"}`}
                    >
                      {STATUS_LABELS[property.status_pipeline] ||
                        property.status_pipeline}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-400">
                    {formatDate(property.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/app/properties/${property.id}`}
                      className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs text-neutral-100 hover:bg-neutral-700"
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
