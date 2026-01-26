"use client";

import { useMemo, useState, useCallback } from "react";
import {
  addDays,
  differenceInDays,
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isWithinInterval,
  isBefore,
  startOfDay,
  isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Building2, Search, X, Check } from "lucide-react";
import Link from "next/link";
import type { WorkspaceScheduleItem, ScheduleCategory } from "@widia/shared";
import { SCHEDULE_CATEGORY_LABELS } from "@widia/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, string> = {
  demolition: "bg-red-500",
  structural: "bg-orange-500",
  electrical: "bg-yellow-500",
  plumbing: "bg-blue-500",
  flooring: "bg-violet-500",
  painting: "bg-pink-500",
  finishing: "bg-teal-500",
  cleaning: "bg-green-500",
  other: "bg-gray-500",
};

const ZOOM_CONFIG = {
  day: { days: 14, label: "2 semanas" },
  week: { days: 21, label: "3 semanas" },
  month: { days: 42, label: "6 semanas" },
};

type ZoomLevel = keyof typeof ZOOM_CONFIG;
type StatusFilter = "all" | "pending" | "overdue" | "done";

function formatCurrency(value: number | null): string {
  if (value === null) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDateShort(dateStr: string): string {
  try {
    const date = new Date(dateStr + "T12:00:00");
    return format(date, "d MMM", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

interface GroupedByProperty {
  propertyId: string;
  propertyName: string;
  items: WorkspaceScheduleItem[];
}

interface WorkspaceScheduleGanttProps {
  items: WorkspaceScheduleItem[];
}

export function WorkspaceScheduleGantt({ items }: WorkspaceScheduleGanttProps) {
  const [viewStart, setViewStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  // Filter & zoom state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("week");

  const today = startOfDay(new Date());
  const zoomDays = ZOOM_CONFIG[zoomLevel].days;
  const viewEnd = endOfWeek(addDays(viewStart, zoomDays - 7), {
    weekStartsOn: 1,
  });
  const days = eachDayOfInterval({ start: viewStart, end: viewEnd });

  const goToPrevWeek = () => setViewStart(addDays(viewStart, -7));
  const goToNextWeek = () => setViewStart(addDays(viewStart, 7));
  const goToToday = () =>
    setViewStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Check if item is overdue
  const isItemOverdue = useCallback(
    (item: WorkspaceScheduleItem) => {
      return !item.done_at && new Date(item.end_date + "T23:59:59") < today;
    },
    [today]
  );

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search filter
      if (
        searchQuery &&
        !item.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.property_name.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      // Status filter
      if (statusFilter === "pending" && item.done_at) return false;
      if (statusFilter === "done" && !item.done_at) return false;
      if (statusFilter === "overdue" && (item.done_at || !isItemOverdue(item)))
        return false;
      return true;
    });
  }, [items, searchQuery, statusFilter, isItemOverdue]);

  // Group by property
  const grouped = useMemo(() => {
    const map = new Map<string, GroupedByProperty>();

    for (const item of filteredItems) {
      const itemStart = new Date(item.start_date + "T00:00:00");
      const itemEnd = new Date(item.end_date + "T23:59:59");

      const isVisible =
        isWithinInterval(itemStart, { start: viewStart, end: viewEnd }) ||
        isWithinInterval(itemEnd, { start: viewStart, end: viewEnd }) ||
        (isBefore(itemStart, viewStart) && isBefore(viewEnd, itemEnd));

      if (!isVisible) continue;

      if (!map.has(item.property_id)) {
        map.set(item.property_id, {
          propertyId: item.property_id,
          propertyName: item.property_name,
          items: [],
        });
      }

      map.get(item.property_id)!.items.push(item);
    }

    return Array.from(map.values()).sort((a, b) =>
      a.propertyName.localeCompare(b.propertyName)
    );
  }, [filteredItems, viewStart, viewEnd]);

  // Stats
  const stats = useMemo(() => {
    const visibleItems = grouped.flatMap((g) => g.items);
    const overdueCount = visibleItems.filter(
      (item) => !item.done_at && isItemOverdue(item)
    ).length;
    const periodCost = visibleItems.reduce(
      (sum, item) => sum + (item.estimated_cost ?? 0),
      0
    );
    return { visibleCount: visibleItems.length, overdueCount, periodCost };
  }, [grouped, isItemOverdue]);

  const getBarStyle = (item: WorkspaceScheduleItem) => {
    const itemStart = new Date(item.start_date + "T00:00:00");
    const itemEnd = new Date(item.end_date + "T23:59:59");

    const startDiff = Math.max(0, differenceInDays(itemStart, viewStart));
    const endDiff = Math.min(
      days.length - 1,
      differenceInDays(itemEnd, viewStart)
    );

    const left = (startDiff / days.length) * 100;
    const width = ((endDiff - startDiff + 1) / days.length) * 100;

    return {
      left: `${left}%`,
      width: `${Math.max(width, 2)}%`,
    };
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="border rounded-lg overflow-hidden bg-card">
        {/* Header with navigation and stats */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToPrevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoje
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Stats mini-panel */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">Visíveis:</span>
              <span className="font-medium">{stats.visibleCount}</span>
            </div>
            {stats.overdueCount > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-destructive gantt-pulse" />
                <span className="text-destructive font-medium">
                  {stats.overdueCount} atrasada{stats.overdueCount > 1 ? "s" : ""}
                </span>
              </div>
            )}
            {stats.periodCost > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Custo:</span>
                <span className="font-medium font-mono">
                  {formatCurrency(stats.periodCost)}
                </span>
              </div>
            )}
          </div>

          <div className="text-sm font-medium">
            {format(viewStart, "d MMM", { locale: ptBR })} -{" "}
            {format(viewEnd, "d MMM yyyy", { locale: ptBR })}
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/30">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tarefa ou imóvel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status chips */}
          <div className="flex gap-1">
            {(["all", "pending", "overdue", "done"] as StatusFilter[]).map(
              (status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-7 text-xs",
                    statusFilter === status &&
                      status === "overdue" &&
                      "bg-destructive hover:bg-destructive/90"
                  )}
                  onClick={() => setStatusFilter(status)}
                >
                  {status === "all" && "Todos"}
                  {status === "pending" && "Pendentes"}
                  {status === "overdue" && "Atrasados"}
                  {status === "done" && "Concluídos"}
                </Button>
              )
            )}
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-muted-foreground">Zoom:</span>
            <ToggleGroup
              type="single"
              value={zoomLevel}
              onValueChange={(v) => v && setZoomLevel(v as ZoomLevel)}
            >
              <ToggleGroupItem value="day" size="sm" className="h-7 w-7 text-xs">
                D
              </ToggleGroupItem>
              <ToggleGroupItem value="week" size="sm" className="h-7 w-7 text-xs">
                S
              </ToggleGroupItem>
              <ToggleGroupItem value="month" size="sm" className="h-7 w-7 text-xs">
                M
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Timeline header */}
        <div
          className="grid border-b bg-muted/30"
          style={{ gridTemplateColumns: `200px repeat(${days.length}, 1fr)` }}
        >
          <div className="px-3 py-1 border-r font-medium text-sm flex items-center">
            Imóvel
          </div>
          {days.map((day, i) => (
            <div
              key={i}
              className={cn(
                "text-center py-1 text-xs border-r last:border-r-0",
                isToday(day) && "bg-primary/10 font-medium",
                day.getDay() === 0 || day.getDay() === 6 ? "bg-muted/50" : ""
              )}
            >
              <div className="font-medium">
                {format(day, "EEE", { locale: ptBR })}
              </div>
              <div className="text-muted-foreground">{format(day, "d")}</div>
            </div>
          ))}
        </div>

        {/* Gantt rows by property */}
        {grouped.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {filteredItems.length === 0 && items.length > 0
              ? "Nenhum item corresponde aos filtros"
              : "Nenhum item neste período"}
          </div>
        ) : (
          <div className="divide-y">
            {grouped.map((group) => (
              <div
                key={group.propertyId}
                className="grid"
                style={{ gridTemplateColumns: `200px 1fr` }}
              >
                {/* Property label */}
                <div className="px-3 py-2 border-r bg-muted/20">
                  <Link
                    href={`/app/properties/${group.propertyId}/schedule`}
                    className="flex items-center gap-2 hover:underline"
                  >
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">
                      {group.propertyName}
                    </span>
                  </Link>
                </div>

                {/* Tasks for this property */}
                <div className="relative min-h-[40px]">
                  {/* Grid lines */}
                  <div
                    className="absolute inset-0 grid pointer-events-none"
                    style={{
                      gridTemplateColumns: `repeat(${days.length}, 1fr)`,
                    }}
                  >
                    {days.map((day, i) => (
                      <div
                        key={i}
                        className={cn(
                          "border-r last:border-r-0 h-full gantt-grid-line",
                          isToday(day) && "bg-primary/5",
                          day.getDay() === 0 || day.getDay() === 6
                            ? "bg-muted/30"
                            : ""
                        )}
                      />
                    ))}
                  </div>

                  {/* Today line */}
                  {isWithinInterval(today, { start: viewStart, end: viewEnd }) && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
                      style={{
                        left: `${(differenceInDays(today, viewStart) / days.length) * 100}%`,
                      }}
                    />
                  )}

                  {/* Task bars */}
                  <div className="relative py-1 space-y-0.5">
                    {group.items
                      .sort((a, b) => a.start_date.localeCompare(b.start_date))
                      .map((item) => {
                        const style = getBarStyle(item);
                        const colorClass =
                          CATEGORY_COLORS[item.category || "other"] ||
                          CATEGORY_COLORS.other;
                        const isDone = !!item.done_at;
                        const isOverdue = isItemOverdue(item);

                        return (
                          <div key={item.id} className="relative h-6">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link
                                  href={`/app/properties/${item.property_id}/schedule`}
                                  className={cn(
                                    "absolute h-5 rounded flex items-center gap-1 px-2 gantt-bar",
                                    colorClass,
                                    isDone && "opacity-50",
                                    isOverdue && "ring-2 ring-destructive gantt-pulse"
                                  )}
                                  style={style}
                                >
                                  {isDone && (
                                    <Check className="h-2.5 w-2.5 text-white/80 shrink-0" />
                                  )}
                                  <span
                                    className={cn(
                                      "text-xs font-medium text-white truncate",
                                      isDone && "line-through"
                                    )}
                                  >
                                    {item.title}
                                  </span>
                                  {item.estimated_cost &&
                                    item.estimated_cost >= 1000 && (
                                      <span className="text-[10px] bg-black/20 px-1 rounded shrink-0">
                                        {(item.estimated_cost / 1000).toFixed(0)}k
                                      </span>
                                    )}
                                </Link>
                              </TooltipTrigger>

                              {/* Hover Tooltip */}
                              <TooltipContent
                                side="top"
                                className="max-w-xs bg-popover text-popover-foreground border shadow-lg p-2"
                              >
                                <div className="space-y-1.5">
                                  <div className="font-semibold">{item.title}</div>
                                  <div className="text-xs opacity-80">
                                    {formatDateShort(item.start_date)} {" → "}{" "}
                                    {formatDateShort(item.end_date)}
                                  </div>
                                  {item.category && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs h-5"
                                    >
                                      {
                                        SCHEDULE_CATEGORY_LABELS[
                                          item.category as ScheduleCategory
                                        ]
                                      }
                                    </Badge>
                                  )}
                                  {item.estimated_cost && (
                                    <div className="text-xs">
                                      Custo: {formatCurrency(item.estimated_cost)}
                                    </div>
                                  )}
                                  {isDone && (
                                    <Badge variant="outline" className="text-xs h-5">
                                      Concluído
                                    </Badge>
                                  )}
                                  {isOverdue && (
                                    <Badge
                                      variant="destructive"
                                      className="text-xs h-5"
                                    >
                                      Atrasado
                                    </Badge>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-2 px-4 py-2 border-t bg-muted/30">
          {Object.entries(SCHEDULE_CATEGORY_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1 text-xs">
              <div className={cn("w-3 h-3 rounded", CATEGORY_COLORS[key])} />
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
