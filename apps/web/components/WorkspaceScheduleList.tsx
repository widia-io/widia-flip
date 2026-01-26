"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, CheckCircle2, AlertCircle, Clock, List, CalendarDays, GanttChart } from "lucide-react";
import type { WorkspaceScheduleItem, ScheduleSummary, ScheduleCategory } from "@widia/shared";
import { SCHEDULE_CATEGORY_LABELS } from "@widia/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { WorkspaceScheduleCalendar } from "@/components/WorkspaceScheduleCalendar";
import { WorkspaceScheduleGantt } from "@/components/WorkspaceScheduleGantt";

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

function isOverdue(endDate: string, doneAt: string | null): boolean {
  if (doneAt) return false;
  return endDate < getTodayStr();
}

interface WorkspaceScheduleListProps {
  items: WorkspaceScheduleItem[];
  summary: ScheduleSummary;
}

interface GroupedByProperty {
  propertyId: string;
  propertyName: string;
  propertyAddress: string | null;
  items: WorkspaceScheduleItem[];
  stats: {
    total: number;
    completed: number;
    overdue: number;
  };
}

export function WorkspaceScheduleList({ items, summary }: WorkspaceScheduleListProps) {
  const [viewMode, setViewMode] = useState<"list" | "calendar" | "gantt">("list");

  const grouped = useMemo(() => {
    const map = new Map<string, GroupedByProperty>();

    for (const item of items) {
      if (!map.has(item.property_id)) {
        map.set(item.property_id, {
          propertyId: item.property_id,
          propertyName: item.property_name,
          propertyAddress: item.property_address,
          items: [],
          stats: { total: 0, completed: 0, overdue: 0 },
        });
      }

      const group = map.get(item.property_id)!;
      group.items.push(item);
      group.stats.total++;
      if (item.done_at) {
        group.stats.completed++;
      } else if (isOverdue(item.end_date, item.done_at)) {
        group.stats.overdue++;
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      // Sort by overdue count DESC, then by name
      if (b.stats.overdue !== a.stats.overdue) return b.stats.overdue - a.stats.overdue;
      return a.propertyName.localeCompare(b.propertyName);
    });
  }, [items]);

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Nenhum item no cronograma
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Total:</span>
                <span className="font-medium">{summary.total_items}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Concluídos:</span>
                <span className="font-medium text-primary">{summary.completed_items}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-muted-foreground">Atrasados:</span>
                <span className="font-medium text-destructive">{summary.overdue_items}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Custo estimado:</span>
                <span className="font-medium">{formatCurrency(summary.estimated_total)}</span>
              </div>
            </div>
            <ToggleGroup type="single" value={viewMode} onValueChange={(v: string) => v && setViewMode(v as "list" | "calendar" | "gantt")}>
              <ToggleGroupItem value="list" aria-label="Ver como lista" size="sm">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="calendar" aria-label="Ver como calendário" size="sm">
                <CalendarDays className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="gantt" aria-label="Ver como Gantt" size="sm">
                <GanttChart className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Progresso geral</span>
              <span>{summary.progress_percent.toFixed(0)}%</span>
            </div>
            <Progress value={summary.progress_percent} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <WorkspaceScheduleCalendar items={items} />
      )}

      {/* Gantt View */}
      {viewMode === "gantt" && (
        <WorkspaceScheduleGantt items={items} />
      )}

      {/* List View - Grouped by property */}
      {viewMode === "list" && grouped.map((group) => (
        <Card key={group.propertyId}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <Link
                href={`/app/properties/${group.propertyId}/schedule`}
                className="hover:underline"
              >
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" />
                  {group.propertyName}
                </CardTitle>
                {group.propertyAddress && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {group.propertyAddress}
                  </p>
                )}
              </Link>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline">
                  {group.stats.completed}/{group.stats.total}
                </Badge>
                {group.stats.overdue > 0 && (
                  <Badge variant="destructive">
                    {group.stats.overdue} atrasado{group.stats.overdue > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="divide-y">
              {group.items.map((item) => (
                <ScheduleItemRow key={item.id} item={item} />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ScheduleItemRow({ item }: { item: WorkspaceScheduleItem }) {
  const completed = !!item.done_at;
  const overdue = isOverdue(item.end_date, item.done_at);

  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className={`h-2 w-2 rounded-full shrink-0 ${
          completed ? "bg-primary" : overdue ? "bg-destructive" : "bg-muted-foreground/30"
        }`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm truncate ${
              completed ? "line-through text-muted-foreground" : ""
            }`}
          >
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
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {item.estimated_cost && (
          <span className="text-xs text-muted-foreground font-mono">
            {formatCurrency(item.estimated_cost)}
          </span>
        )}
        <span
          className={`text-xs ${
            overdue ? "text-destructive font-medium" : "text-muted-foreground"
          }`}
        >
          {item.start_date === item.end_date
            ? formatDate(item.start_date)
            : `${formatDate(item.start_date)} - ${formatDate(item.end_date)}`}
        </span>
      </div>
    </div>
  );
}
