"use client";

import { useState, useTransition, useMemo } from "react";
import { Plus, Loader2, ChevronDown, ChevronRight, Trash2, Pencil } from "lucide-react";
import type { ScheduleItem, ScheduleSummary, ScheduleCategory } from "@widia/shared";
import { SCHEDULE_CATEGORY_LABELS } from "@widia/shared";
import {
  createScheduleItemAction,
  updateScheduleItemAction,
  markScheduleItemDoneAction,
  deleteScheduleItemAction,
} from "@/lib/actions/schedule";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

function formatCurrency(value: number | null): string {
  if (value === null) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + "T12:00:00");
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return dateStr;
  }
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getIn7DaysStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isOverdue(plannedDate: string, doneAt: string | null): boolean {
  if (doneAt) return false;
  return plannedDate < getTodayStr();
}

function isUpcoming7Days(plannedDate: string, doneAt: string | null): boolean {
  if (doneAt) return false;
  const todayStr = getTodayStr();
  const in7DaysStr = getIn7DaysStr();
  return plannedDate >= todayStr && plannedDate <= in7DaysStr;
}

interface ScheduleListProps {
  propertyId: string;
  initialItems: ScheduleItem[];
  summary?: ScheduleSummary;
}

export function ScheduleList({ propertyId, initialItems }: ScheduleListProps) {
  const [items, setItems] = useState<ScheduleItem[]>(initialItems);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [completedOpen, setCompletedOpen] = useState(false);

  // Group items
  const { overdue, upcoming, future, completed } = useMemo(() => {
    const overdue: ScheduleItem[] = [];
    const upcoming: ScheduleItem[] = [];
    const future: ScheduleItem[] = [];
    const completed: ScheduleItem[] = [];

    for (const item of items) {
      if (item.done_at) {
        completed.push(item);
      } else if (isOverdue(item.planned_date, item.done_at)) {
        overdue.push(item);
      } else if (isUpcoming7Days(item.planned_date, item.done_at)) {
        upcoming.push(item);
      } else {
        future.push(item);
      }
    }

    return { overdue, upcoming, future, completed };
  }, [items]);

  // Compute summary
  const summary = useMemo(() => {
    const totalItems = items.length;
    const completedItems = completed.length;
    const overdueItems = overdue.length;
    const upcoming7Days = upcoming.length;
    const progressPercent = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
    const estimatedTotal = items.reduce((sum, i) => sum + (i.estimated_cost ?? 0), 0);
    const completedEstimated = completed.reduce((sum, i) => sum + (i.estimated_cost ?? 0), 0);
    return {
      total_items: totalItems,
      completed_items: completedItems,
      overdue_items: overdueItems,
      upcoming_7_days: upcoming7Days,
      progress_percent: progressPercent,
      estimated_total: estimatedTotal,
      completed_estimated: completedEstimated,
    };
  }, [items, completed, overdue, upcoming]);

  const handleCreate = async (data: {
    title: string;
    planned_date: string;
    notes?: string;
    category?: string;
    estimated_cost?: number;
  }) => {
    startTransition(async () => {
      const result = await createScheduleItemAction(propertyId, data);
      if (result.data) {
        setItems((prev) => [...prev, result.data!].sort((a, b) =>
          a.planned_date.localeCompare(b.planned_date)
        ));
        setShowForm(false);
      }
    });
  };

  const handleUpdate = async (
    itemId: string,
    data: {
      title?: string;
      planned_date?: string;
      notes?: string;
      category?: string;
      estimated_cost?: number;
    }
  ) => {
    startTransition(async () => {
      const result = await updateScheduleItemAction(itemId, propertyId, data);
      if (result.data) {
        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? result.data! : i))
        );
        setEditingItem(null);
      }
    });
  };

  const handleToggleDone = async (itemId: string, done: boolean) => {
    startTransition(async () => {
      const result = await markScheduleItemDoneAction(itemId, propertyId, done);
      if (result.data) {
        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? result.data! : i))
        );
      }
    });
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm("Tem certeza que deseja deletar este item?")) return;
    startTransition(async () => {
      const result = await deleteScheduleItemAction(itemId, propertyId);
      if (result.success) {
        setItems((prev) => prev.filter((i) => i.id !== itemId));
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total:</span>{" "}
                  <span className="font-medium">{summary.total_items}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Concluídos:</span>{" "}
                  <span className="font-medium text-primary">{summary.completed_items}</span>
                </div>
                {summary.overdue_items > 0 && (
                  <div>
                    <span className="text-muted-foreground">Atrasados:</span>{" "}
                    <span className="font-medium text-destructive">{summary.overdue_items}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Progress value={summary.progress_percent} className="h-2 w-32" />
                <span className="text-xs text-muted-foreground">
                  {summary.progress_percent.toFixed(0)}%
                </span>
                {summary.estimated_total > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {formatCurrency(summary.completed_estimated)} / {formatCurrency(summary.estimated_total)}
                  </span>
                )}
              </div>
            </div>
            <Button onClick={() => setShowForm(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Adicionar item
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      {showForm && (
        <ScheduleItemForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          isPending={isPending}
        />
      )}

      {/* Edit Form */}
      {editingItem && (
        <ScheduleItemForm
          initialData={editingItem}
          onSubmit={(data) => handleUpdate(editingItem.id, data)}
          onCancel={() => setEditingItem(null)}
          isPending={isPending}
        />
      )}

      {/* Empty State */}
      {items.length === 0 && !showForm && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhum item no cronograma
          </CardContent>
        </Card>
      )}

      {/* Overdue Section */}
      {overdue.length > 0 && (
        <ScheduleSection
          title="Atrasados"
          count={overdue.length}
          items={overdue}
          variant="destructive"
          onToggleDone={handleToggleDone}
          onEdit={setEditingItem}
          onDelete={handleDelete}
          isPending={isPending}
        />
      )}

      {/* Upcoming Section */}
      {upcoming.length > 0 && (
        <ScheduleSection
          title="Próximos 7 dias"
          count={upcoming.length}
          items={upcoming}
          variant="warning"
          onToggleDone={handleToggleDone}
          onEdit={setEditingItem}
          onDelete={handleDelete}
          isPending={isPending}
        />
      )}

      {/* Future Section */}
      {future.length > 0 && (
        <ScheduleSection
          title="Futuros"
          count={future.length}
          items={future}
          variant="default"
          onToggleDone={handleToggleDone}
          onEdit={setEditingItem}
          onDelete={handleDelete}
          isPending={isPending}
        />
      )}

      {/* Completed Section (Collapsible) */}
      {completed.length > 0 && (
        <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <button className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-2">
                  {completedOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-medium text-muted-foreground">Concluídos</span>
                  <Badge variant="secondary" className="text-xs">
                    {completed.length}
                  </Badge>
                </div>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t">
                {completed.map((item) => (
                  <ScheduleItemRow
                    key={item.id}
                    item={item}
                    onToggleDone={handleToggleDone}
                    onEdit={setEditingItem}
                    onDelete={handleDelete}
                    isPending={isPending}
                    completed
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
}

interface ScheduleSectionProps {
  title: string;
  count: number;
  items: ScheduleItem[];
  variant: "destructive" | "warning" | "default";
  onToggleDone: (itemId: string, done: boolean) => void;
  onEdit: (item: ScheduleItem) => void;
  onDelete: (itemId: string) => void;
  isPending: boolean;
}

function ScheduleSection({
  title,
  count,
  items,
  variant,
  onToggleDone,
  onEdit,
  onDelete,
  isPending,
}: ScheduleSectionProps) {
  const borderColor = variant === "destructive" ? "border-l-destructive" :
                      variant === "warning" ? "border-l-yellow-500" : "border-l-border";

  return (
    <Card className={`border-l-4 ${borderColor}`}>
      <div className="px-4 py-2 border-b flex items-center gap-2">
        <span className="font-medium text-sm">{title}</span>
        <Badge variant="secondary" className="text-xs">{count}</Badge>
      </div>
      <div>
        {items.map((item) => (
          <ScheduleItemRow
            key={item.id}
            item={item}
            onToggleDone={onToggleDone}
            onEdit={onEdit}
            onDelete={onDelete}
            isPending={isPending}
          />
        ))}
      </div>
    </Card>
  );
}

interface ScheduleItemRowProps {
  item: ScheduleItem;
  onToggleDone: (itemId: string, done: boolean) => void;
  onEdit: (item: ScheduleItem) => void;
  onDelete: (itemId: string) => void;
  isPending: boolean;
  completed?: boolean;
}

function ScheduleItemRow({
  item,
  onToggleDone,
  onEdit,
  onDelete,
  isPending,
  completed,
}: ScheduleItemRowProps) {
  const isDone = !!item.done_at;

  return (
    <div className="px-4 py-3 flex items-center gap-3 border-b last:border-b-0 hover:bg-accent/30 transition-colors group">
      <Checkbox
        checked={isDone}
        onCheckedChange={(checked) => onToggleDone(item.id, !!checked)}
        disabled={isPending}
        className="h-5 w-5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium truncate ${completed ? "line-through text-muted-foreground" : ""}`}>
            {item.title}
          </span>
          {item.category && (
            <Badge variant="outline" className="text-xs shrink-0">
              {SCHEDULE_CATEGORY_LABELS[item.category as ScheduleCategory] || item.category}
            </Badge>
          )}
          {item.linked_cost_id && (
            <Badge variant="secondary" className="text-xs shrink-0">
              💰
            </Badge>
          )}
        </div>
        {item.notes && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {item.notes}
          </p>
        )}
      </div>
      <div className="text-sm text-muted-foreground shrink-0">
        {formatDate(item.planned_date)}
      </div>
      {item.estimated_cost !== null && (
        <div className="text-sm font-mono text-muted-foreground shrink-0">
          {formatCurrency(item.estimated_cost)}
        </div>
      )}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onEdit(item)}
          disabled={isPending}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => onDelete(item.id)}
          disabled={isPending}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

interface ScheduleItemFormProps {
  initialData?: ScheduleItem;
  onSubmit: (data: {
    title: string;
    planned_date: string;
    notes?: string;
    category?: string;
    estimated_cost?: number;
  }) => void;
  onCancel: () => void;
  isPending: boolean;
}

function ScheduleItemForm({
  initialData,
  onSubmit,
  onCancel,
  isPending,
}: ScheduleItemFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [plannedDate, setPlannedDate] = useState(initialData?.planned_date ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [category, setCategory] = useState(initialData?.category ?? "");
  const [estimatedCost, setEstimatedCost] = useState<number | null>(
    initialData?.estimated_cost ?? null
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !plannedDate) return;

    onSubmit({
      title: title.trim(),
      planned_date: plannedDate,
      notes: notes.trim() || undefined,
      category: category || undefined,
      estimated_cost: estimatedCost ?? undefined,
    });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label>Título *</Label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Instalação elétrica"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Data prevista *</Label>
              <Input
                type="date"
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={category || "__none__"}
                onValueChange={(v) => setCategory(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhuma</SelectItem>
                  {Object.entries(SCHEDULE_CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Custo estimado (R$)</Label>
              <NumberInput
                value={estimatedCost}
                onChange={setEstimatedCost}
                placeholder="1.500,00"
                allowDecimals
                decimalPlaces={2}
              />
              {estimatedCost && estimatedCost > 0 && (
                <p className="text-xs text-muted-foreground">
                  Custo será criado automaticamente em Custos
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Label>Notas</Label>
            <Input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações..."
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !title.trim() || !plannedDate}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? "Atualizar" : "Salvar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
