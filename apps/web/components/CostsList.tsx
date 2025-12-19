"use client";

import { useState, useTransition } from "react";
import type { CostItem, CostType, CostStatus } from "@widia/shared";
import { createCostAction, updateCostAction, deleteCostAction } from "@/lib/actions/costs";

const COST_TYPE_LABELS: Record<CostType, string> = {
  renovation: "Reforma",
  legal: "Jurídico",
  tax: "Impostos",
  other: "Outros",
};

const COST_STATUS_LABELS: Record<CostStatus, string> = {
  planned: "Planejado",
  paid: "Pago",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  } catch {
    return dateStr;
  }
}

interface CostsListProps {
  propertyId: string;
  initialCosts: CostItem[];
  totalPlanned: number;
  totalPaid: number;
}

export function CostsList({
  propertyId,
  initialCosts,
  totalPlanned,
  totalPaid,
}: CostsListProps) {
  const [costs, setCosts] = useState<CostItem[]>(initialCosts);
  const [totals, setTotals] = useState({ planned: totalPlanned, paid: totalPaid });
  const [showForm, setShowForm] = useState(false);
  const [editingCost, setEditingCost] = useState<CostItem | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCreate = async (data: {
    cost_type: CostType;
    amount: number;
    status?: CostStatus;
    category?: string;
    due_date?: string;
    vendor?: string;
    notes?: string;
  }) => {
    startTransition(async () => {
      const result = await createCostAction(propertyId, data);
      if (result.data) {
        setCosts((prev) => [result.data!, ...prev]);
        const newCost = result.data;
        setTotals((prev) => ({
          planned: newCost.status === "planned" ? prev.planned + newCost.amount : prev.planned,
          paid: newCost.status === "paid" ? prev.paid + newCost.amount : prev.paid,
        }));
        setShowForm(false);
      }
    });
  };

  const handleUpdate = async (
    costId: string,
    data: {
      cost_type: CostType;
      amount: number;
      status?: CostStatus;
      category?: string;
      due_date?: string;
      vendor?: string;
      notes?: string;
    },
  ) => {
    const oldCost = costs.find((c) => c.id === costId);
    startTransition(async () => {
      const result = await updateCostAction(costId, propertyId, data);
      if (result.data) {
        setCosts((prev) =>
          prev.map((c) => (c.id === costId ? result.data! : c)),
        );
        // Update totals
        if (oldCost) {
          const newCost = result.data;
          setTotals((prev) => {
            let planned = prev.planned;
            let paid = prev.paid;
            // Remove old amount from old status
            if (oldCost.status === "planned") planned -= oldCost.amount;
            if (oldCost.status === "paid") paid -= oldCost.amount;
            // Add new amount to new status
            if (newCost.status === "planned") planned += newCost.amount;
            if (newCost.status === "paid") paid += newCost.amount;
            return { planned, paid };
          });
        }
        setEditingCost(null);
      }
    });
  };

  const handleDelete = async (costId: string) => {
    const costToDelete = costs.find((c) => c.id === costId);
    if (!confirm("Tem certeza que deseja deletar este custo?")) return;
    startTransition(async () => {
      const result = await deleteCostAction(costId, propertyId);
      if (result.success) {
        setCosts((prev) => prev.filter((c) => c.id !== costId));
        if (costToDelete) {
          setTotals((prev) => ({
            planned:
              costToDelete.status === "planned"
                ? prev.planned - costToDelete.amount
                : prev.planned,
            paid:
              costToDelete.status === "paid"
                ? prev.paid - costToDelete.amount
                : prev.paid,
          }));
        }
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-zinc-400">Planejado:</span>{" "}
            <span className="font-medium text-amber-400">{formatCurrency(totals.planned)}</span>
          </div>
          <div>
            <span className="text-zinc-400">Pago:</span>{" "}
            <span className="font-medium text-green-400">{formatCurrency(totals.paid)}</span>
          </div>
          <div>
            <span className="text-zinc-400">Total:</span>{" "}
            <span className="font-medium text-white">
              {formatCurrency(totals.planned + totals.paid)}
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
        >
          Adicionar custo
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <CostForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          isPending={isPending}
        />
      )}

      {/* Edit Form */}
      {editingCost && (
        <CostForm
          initialData={editingCost}
          onSubmit={(data) => handleUpdate(editingCost.id, data)}
          onCancel={() => setEditingCost(null)}
          isPending={isPending}
        />
      )}

      {/* Table */}
      {costs.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 text-center text-sm text-zinc-400">
          Nenhum custo cadastrado
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Categoria</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-400">Valor</th>
                <th className="px-4 py-3 text-center font-medium text-zinc-400">Status</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Data</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Fornecedor</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {costs.map((cost) => (
                <tr key={cost.id} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3 text-white">
                    {COST_TYPE_LABELS[cost.cost_type]}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{cost.category || "-"}</td>
                  <td className="px-4 py-3 text-right font-mono text-white">
                    {formatCurrency(cost.amount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        cost.status === "paid"
                          ? "bg-green-900/50 text-green-300"
                          : "bg-amber-900/50 text-amber-300"
                      }`}
                    >
                      {COST_STATUS_LABELS[cost.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{formatDate(cost.due_date)}</td>
                  <td className="px-4 py-3 text-zinc-300">{cost.vendor || "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditingCost(cost)}
                      className="mr-2 text-blue-400 hover:text-blue-300"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(cost.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Deletar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface CostFormProps {
  initialData?: CostItem;
  onSubmit: (data: {
    cost_type: CostType;
    amount: number;
    status?: CostStatus;
    category?: string;
    due_date?: string;
    vendor?: string;
    notes?: string;
  }) => void;
  onCancel: () => void;
  isPending: boolean;
}

function CostForm({ initialData, onSubmit, onCancel, isPending }: CostFormProps) {
  const [costType, setCostType] = useState<CostType>(initialData?.cost_type ?? "renovation");
  const [amount, setAmount] = useState(initialData?.amount?.toString() ?? "");
  const [status, setStatus] = useState<CostStatus>(initialData?.status ?? "planned");
  const [category, setCategory] = useState(initialData?.category ?? "");
  const [dueDate, setDueDate] = useState(initialData?.due_date?.split("T")[0] ?? "");
  const [vendor, setVendor] = useState(initialData?.vendor ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [showExtras, setShowExtras] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) return;

    onSubmit({
      cost_type: costType,
      amount: parsedAmount,
      status,
      category: category || undefined,
      due_date: dueDate || undefined,
      vendor: vendor || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Tipo *</label>
          <select
            value={costType}
            onChange={(e) => setCostType(e.target.value as CostType)}
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
          >
            {Object.entries(COST_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Valor (R$) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
            placeholder="0,00"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as CostStatus)}
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
          >
            {Object.entries(COST_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Data</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowExtras(!showExtras)}
        className="mt-3 text-xs text-blue-400 hover:text-blue-300"
      >
        {showExtras ? "- Ocultar campos extras" : "+ Mostrar campos extras"}
      </button>

      {showExtras && (
        <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Categoria</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
              placeholder="Ex: Elétrica"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Fornecedor</label>
            <input
              type="text"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
              placeholder="Ex: João Elétrica"
            />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="mb-1 block text-xs text-zinc-400">Notas</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
              placeholder="Observações"
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending || !amount}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {isPending ? "Salvando..." : initialData ? "Atualizar" : "Salvar"}
        </button>
      </div>
    </form>
  );
}

