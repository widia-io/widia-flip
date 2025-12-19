"use client";

import { useState, useTransition } from "react";
import { Plus, X, Loader2 } from "lucide-react";

import type { FinancingPayment } from "@widia/shared";
import {
  createFinancingPaymentAction,
  deleteFinancingPaymentAction,
} from "@/lib/actions/financing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Prestações Pagas</CardTitle>
        {isPending && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {payments.length > 0 && (
          <Table className="mb-4">
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right w-16">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id} className="group">
                  <TableCell>{payment.month_index}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePayment(payment.id)}
                      disabled={deletingId === payment.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    >
                      {deletingId === payment.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Add Payment Form */}
        {isAdding ? (
          <div className="flex items-center gap-2 mb-4">
            <Input
              type="number"
              value={newMonthIndex}
              onChange={(e) => setNewMonthIndex(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Mês"
              min="1"
              className="w-20"
              autoFocus
            />
            <Input
              type="number"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Valor (R$)"
              step="0.01"
              min="0"
              className="flex-1"
            />
            <Button onClick={handleAddPayment} disabled={isPending} size="sm">
              OK
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAdding(false);
                setNewMonthIndex("");
                setNewAmount("");
                setError(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(true)}
            disabled={!planId}
            className="mb-4 text-primary"
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Prestação
          </Button>
        )}

        {/* Total */}
        <div className="border-t border-border pt-3 flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total Parcelas:</span>
          <span className="text-lg font-semibold">
            {formatCurrency(total)}
          </span>
        </div>

        {!planId && payments.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Salve os dados do financiamento para adicionar prestações.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
