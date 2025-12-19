"use client";

import { useState, useTransition } from "react";

import type { FinancingPayment } from "@widia/shared";
import {
  createFinancingPaymentAction,
  deleteFinancingPaymentAction,
} from "@/lib/actions/financing";

interface FinancingPaymentsListProps {
  planId: string | undefined;
  propertyId: string;
  payments: FinancingPayment[];
  onPaymentChange: () => void;
}

export function FinancingPaymentsList({
  planId,
  propertyId,
  payments,
  onPaymentChange,
}: FinancingPaymentsListProps) {
  const [isPending, startTransition] = useTransition();
  const [isAdding, setIsAdding] = useState(false);
  const [newMonthIndex, setNewMonthIndex] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 2,
    }).format(value);
  };

  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  const handleAddPayment = async () => {
    if (!planId) {
      setError("Salve os dados do financiamento antes de adicionar prestações");
      return;
    }

    const monthIndex = parseInt(newMonthIndex, 10);
    const amount = parseFloat(newAmount);

    if (isNaN(monthIndex) || monthIndex <= 0) {
      setError("Mês deve ser um número maior que 0");
      return;
    }

    if (isNaN(amount) || amount < 0) {
      setError("Valor deve ser um número válido");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createFinancingPaymentAction(planId, propertyId, {
        month_index: monthIndex,
        amount,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setNewMonthIndex("");
        setNewAmount("");
        setIsAdding(false);
        onPaymentChange();
      }
    });
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!planId) return;

    setDeletingId(paymentId);
    startTransition(async () => {
      const result = await deleteFinancingPaymentAction(planId, paymentId, propertyId);
      setDeletingId(null);

      if (result.error) {
        setError(result.error);
      } else {
        onPaymentChange();
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddPayment();
    } else if (e.key === "Escape") {
      setIsAdding(false);
      setNewMonthIndex("");
      setNewAmount("");
      setError(null);
    }
  };

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-neutral-100">
          Prestações Pagas
        </h3>
        {isPending && (
          <span className="text-xs text-neutral-500">Processando...</span>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-900/60 bg-red-950/50 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {payments.length > 0 && (
        <div className="mb-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-xs text-neutral-500">
                <th className="pb-2 font-medium">Mês</th>
                <th className="pb-2 font-medium text-right">Valor</th>
                <th className="pb-2 font-medium text-right w-16">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50">
              {payments.map((payment) => (
                <tr key={payment.id} className="group">
                  <td className="py-2 text-sm text-neutral-300">
                    {payment.month_index}
                  </td>
                  <td className="py-2 text-sm text-neutral-300 text-right">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => handleDeletePayment(payment.id)}
                      disabled={deletingId === payment.id}
                      className="text-neutral-500 hover:text-red-400 disabled:opacity-50 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remover prestação"
                    >
                      {deletingId === payment.id ? (
                        <span className="text-xs">...</span>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-4 h-4"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Payment Form */}
      {isAdding ? (
        <div className="flex items-center gap-2 mb-4">
          <input
            type="number"
            value={newMonthIndex}
            onChange={(e) => setNewMonthIndex(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Mês"
            min="1"
            className="w-20 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none"
            autoFocus
          />
          <input
            type="number"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Valor (R$)"
            step="0.01"
            min="0"
            className="flex-1 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={handleAddPayment}
            disabled={isPending}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            OK
          </button>
          <button
            onClick={() => {
              setIsAdding(false);
              setNewMonthIndex("");
              setNewAmount("");
              setError(null);
            }}
            className="rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          disabled={!planId}
          className="mb-4 flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Adicionar Prestação
        </button>
      )}

      {/* Total */}
      <div className="border-t border-neutral-800 pt-3 flex justify-between items-center">
        <span className="text-sm text-neutral-400">Total Parcelas:</span>
        <span className="text-lg font-semibold text-neutral-100">
          {formatCurrency(total)}
        </span>
      </div>

      {!planId && payments.length === 0 && (
        <p className="mt-2 text-xs text-neutral-500">
          Salve os dados do financiamento para adicionar prestações.
        </p>
      )}
    </div>
  );
}
