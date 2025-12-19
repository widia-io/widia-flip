"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import type { CostItem, CostType, CostStatus } from "@widia/shared";
import { createCostAction, updateCostAction, deleteCostAction } from "@/lib/actions/costs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
        if (oldCost) {
          const newCost = result.data;
          setTotals((prev) => {
            let planned = prev.planned;
            let paid = prev.paid;
            if (oldCost.status === "planned") planned -= oldCost.amount;
            if (oldCost.status === "paid") paid -= oldCost.amount;
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
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Planejado:</span>{" "}
                <span className="font-medium text-yellow-500">{formatCurrency(totals.planned)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Pago:</span>{" "}
                <span className="font-medium text-primary">{formatCurrency(totals.paid)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total:</span>{" "}
                <span className="font-medium">
                  {formatCurrency(totals.planned + totals.paid)}
                </span>
              </div>
            </div>
            <Button onClick={() => setShowForm(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Adicionar custo
            </Button>
          </div>
        </CardContent>
      </Card>

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
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhum custo cadastrado
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costs.map((cost) => (
                <TableRow key={cost.id}>
                  <TableCell className="font-medium">
                    {COST_TYPE_LABELS[cost.cost_type]}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{cost.category || "-"}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(cost.amount)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={cost.status === "paid" ? "default" : "secondary"}>
                      {COST_STATUS_LABELS[cost.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(cost.due_date)}</TableCell>
                  <TableCell className="text-muted-foreground">{cost.vendor || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingCost(cost)}
                      className="mr-1"
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(cost.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      Deletar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
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
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={costType} onValueChange={(v) => setCostType(v as CostType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(COST_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as CostStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(COST_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowExtras(!showExtras)}
            className="mt-3 text-primary"
          >
            {showExtras ? "- Ocultar campos extras" : "+ Mostrar campos extras"}
          </Button>

          {showExtras && (
            <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: Elétrica"
                />
              </div>
              <div className="space-y-2">
                <Label>Fornecedor</Label>
                <Input
                  type="text"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="Ex: João Elétrica"
                />
              </div>
              <div className="space-y-2 col-span-2 md:col-span-1">
                <Label>Notas</Label>
                <Input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observações"
                />
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !amount}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? "Atualizar" : "Salvar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
