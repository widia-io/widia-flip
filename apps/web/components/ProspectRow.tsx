"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { Prospect } from "@widia/shared";

import {
  deleteProspectAction,
  convertProspectAction,
} from "@/lib/actions/prospects";

interface ProspectRowProps {
  prospect: Prospect;
  formatCurrency: (value: number | null | undefined) => string;
  formatArea: (value: number | null | undefined) => string;
  formatPricePerSqm: (value: number | null | undefined) => string;
}

export function ProspectRow({
  prospect,
  formatCurrency,
  formatArea,
  formatPricePerSqm,
}: ProspectRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmConvert, setShowConfirmConvert] = useState(false);

  const statusLabels: Record<string, string> = {
    active: "Ativo",
    discarded: "Descartado",
    converted: "Convertido",
  };

  const statusColors: Record<string, string> = {
    active: "bg-emerald-900/50 text-emerald-300",
    discarded: "bg-neutral-700/50 text-neutral-400",
    converted: "bg-blue-900/50 text-blue-300",
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteProspectAction(prospect.id);
      setShowConfirmDelete(false);
      router.refresh();
    });
  };

  const handleConvert = () => {
    startTransition(async () => {
      await convertProspectAction(prospect.id);
      setShowConfirmConvert(false);
    });
  };

  const isConverted = prospect.status === "converted";

  return (
    <tr className="hover:bg-neutral-900/50">
      <td className="px-4 py-3 text-sm text-neutral-100">
        {prospect.neighborhood ?? "-"}
      </td>
      <td className="px-4 py-3 text-sm text-neutral-100">
        {prospect.address ?? "-"}
      </td>
      <td className="px-4 py-3 text-right text-sm text-neutral-100">
        {formatArea(prospect.area_usable)}
      </td>
      <td className="px-4 py-3 text-right text-sm text-neutral-100">
        {formatCurrency(prospect.asking_price)}
      </td>
      <td className="px-4 py-3 text-right text-sm text-neutral-400">
        {formatPricePerSqm(prospect.price_per_sqm)}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColors[prospect.status] ?? "bg-neutral-700/50 text-neutral-400"}`}
        >
          {statusLabels[prospect.status] ?? prospect.status}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {/* Convert button */}
          {!isConverted && (
            <>
              {showConfirmConvert ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleConvert}
                    disabled={isPending}
                    className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isPending ? "..." : "Sim"}
                  </button>
                  <button
                    onClick={() => setShowConfirmConvert(false)}
                    disabled={isPending}
                    className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-800"
                  >
                    Não
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowConfirmConvert(true)}
                  disabled={isPending}
                  className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
                  title="Converter para imóvel"
                >
                  Converter
                </button>
              )}
            </>
          )}

          {/* Delete button */}
          {showConfirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "..." : "Sim"}
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                disabled={isPending}
                className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-800"
              >
                Não
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirmDelete(true)}
              disabled={isPending}
              className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-red-400 disabled:opacity-50"
              title="Excluir"
            >
              Excluir
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
