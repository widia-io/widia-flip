"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { Property } from "@widia/shared";
import { updatePropertyStatusAction } from "@/lib/actions/properties";

interface PropertyOverviewProps {
  property: Property;
}

const STATUS_OPTIONS = [
  { value: "prospecting", label: "Prospecção" },
  { value: "analyzing", label: "Analisando" },
  { value: "bought", label: "Comprado" },
  { value: "renovation", label: "Reforma" },
  { value: "for_sale", label: "À Venda" },
  { value: "sold", label: "Vendido" },
  { value: "archived", label: "Arquivado" },
];

export function PropertyOverview({ property }: PropertyOverviewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = async (newStatus: string) => {
    setError(null);
    startTransition(async () => {
      const result = await updatePropertyStatusAction(property.id, newStatus);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
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
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-900/60 bg-red-950/50 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Status Change */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6">
        <h3 className="text-sm font-medium text-neutral-400 mb-3">
          Alterar Status
        </h3>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleStatusChange(option.value)}
              disabled={isPending || property.status_pipeline === option.value}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                property.status_pipeline === option.value
                  ? "bg-blue-600 text-white cursor-default"
                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700 disabled:opacity-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {isPending && (
          <p className="mt-2 text-xs text-neutral-500">Atualizando...</p>
        )}
      </div>

      {/* Property Details */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6">
        <h3 className="text-sm font-medium text-neutral-400 mb-4">
          Informações do Imóvel
        </h3>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-neutral-500">Endereço</dt>
            <dd className="mt-1 text-sm text-neutral-100">
              {property.address || "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Bairro</dt>
            <dd className="mt-1 text-sm text-neutral-100">
              {property.neighborhood || "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Área Útil</dt>
            <dd className="mt-1 text-sm text-neutral-100">
              {formatArea(property.area_usable)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">ID</dt>
            <dd className="mt-1 text-sm text-neutral-400 font-mono text-xs">
              {property.id}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Criado em</dt>
            <dd className="mt-1 text-sm text-neutral-100">
              {formatDate(property.created_at)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Atualizado em</dt>
            <dd className="mt-1 text-sm text-neutral-100">
              {formatDate(property.updated_at)}
            </dd>
          </div>
        </dl>
      </div>

      {property.origin_prospect_id && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6">
          <h3 className="text-sm font-medium text-neutral-400 mb-2">
            Origem
          </h3>
          <p className="text-sm text-neutral-300">
            Este imóvel foi convertido de uma prospecção.
          </p>
          <p className="mt-1 text-xs text-neutral-500 font-mono">
            Prospect ID: {property.origin_prospect_id}
          </p>
        </div>
      )}
    </div>
  );
}
