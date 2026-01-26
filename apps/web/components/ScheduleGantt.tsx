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
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Check,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import type { ScheduleItem, ScheduleCategory } from "@widia/shared";
import { SCHEDULE_CATEGORY_LABELS } from "@widia/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

interface ScheduleGanttProps {
  items: ScheduleItem[];
  onItemClick?: (item: ScheduleItem) => void;
  onDateChange?: (
    itemId: string,
    startDate: string,
    endDate: string,
    previousStartDate: string,
    previousEndDate: string
  ) => void;
  onToggleDone?: (itemId: string, done: boolean) => void;
  onDelete?: (itemId: string) => void;
  onQuickAdd?: (date: string) => void;
}

export function ScheduleGantt({
  items,
  onItemClick,
  onDateChange,
  onToggleDone,
  onDelete,
  onQuickAdd,
}: ScheduleGanttProps) {
  const [viewStart, setViewStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [dragState, setDragState] = useState<{
    itemId: string;
    type: "move" | "resize-start" | "resize-end";
    startX: number;
    originalStartDate: string;
    originalEndDate: string;
  } | null>(null);

  // Filter & zoom state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("week");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

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
    (item: ScheduleItem) => {
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
        !item.title.toLowerCase().includes(searchQuery.toLowerCase())
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

  // Visible items (in current view range)
  const visibleItems = useMemo(() => {
    return filteredItems
      .filter((item) => {
        const itemStart = new Date(item.start_date + "T00:00:00");
        const itemEnd = new Date(item.end_date + "T23:59:59");
        return (
          isWithinInterval(itemStart, { start: viewStart, end: viewEnd }) ||
          isWithinInterval(itemEnd, { start: viewStart, end: viewEnd }) ||
          (isBefore(itemStart, viewStart) && isBefore(viewEnd, itemEnd))
        );
      })
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  }, [filteredItems, viewStart, viewEnd]);

  // Stats
  const stats = useMemo(() => {
    const overdueCount = visibleItems.filter(
      (item) => !item.done_at && isItemOverdue(item)
    ).length;
    const periodCost = visibleItems.reduce(
      (sum, item) => sum + (item.estimated_cost ?? 0),
      0
    );
    return { visibleCount: visibleItems.length, overdueCount, periodCost };
  }, [visibleItems, isItemOverdue]);

  const getBarStyle = (item: ScheduleItem) => {
    const itemStart = new Date(item.start_date + "T00:00:00");
    const itemEnd = new Date(item.end_date + "T23:59:59");

    const startDiff = Math.max(0, differenceInDays(itemStart, viewStart));
    const endDiff = Math.min(days.length - 1, differenceInDays(itemEnd, viewStart));

    const left = (startDiff / days.length) * 100;
    const width = ((endDiff - startDiff + 1) / days.length) * 100;

    return {
      left: `${left}%`,
      width: `${Math.max(width, 2)}%`,
    };
  };

  const handleMouseDown = (
    e: React.MouseEvent,
    item: ScheduleItem,
    type: "move" | "resize-start" | "resize-end"
  ) => {
    if (!onDateChange) return;
    e.preventDefault();
    e.stopPropagation();

    setDragState({
      itemId: item.id,
      type,
      startX: e.clientX,
      originalStartDate: item.start_date,
      originalEndDate: item.end_date,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState || !onDateChange) return;

    const dayWidth = (e.currentTarget as HTMLElement).offsetWidth / days.length;
    const daysDelta = Math.round((e.clientX - dragState.startX) / dayWidth);

    if (daysDelta === 0) return;

    const originalStart = new Date(dragState.originalStartDate + "T00:00:00");
    const originalEnd = new Date(dragState.originalEndDate + "T00:00:00");

    let newStartDate: Date;
    let newEndDate: Date;

    if (dragState.type === "move") {
      newStartDate = addDays(originalStart, daysDelta);
      newEndDate = addDays(originalEnd, daysDelta);
    } else if (dragState.type === "resize-start") {
      newStartDate = addDays(originalStart, daysDelta);
      newEndDate = originalEnd;
      if (newStartDate > newEndDate) {
        newStartDate = newEndDate;
      }
    } else {
      newStartDate = originalStart;
      newEndDate = addDays(originalEnd, daysDelta);
      if (newEndDate < newStartDate) {
        newEndDate = newStartDate;
      }
    }

    const newStartStr = format(newStartDate, "yyyy-MM-dd");
    const newEndStr = format(newEndDate, "yyyy-MM-dd");

    if (
      newStartStr !== dragState.originalStartDate ||
      newEndStr !== dragState.originalEndDate
    ) {
      setDragState({
        ...dragState,
        startX: dragState.startX + daysDelta * dayWidth,
        originalStartDate: newStartStr,
        originalEndDate: newEndStr,
      });
    }
  };

  const handleMouseUp = () => {
    if (dragState && onDateChange) {
      const item = items.find((i) => i.id === dragState.itemId);
      if (
        item &&
        (item.start_date !== dragState.originalStartDate ||
          item.end_date !== dragState.originalEndDate)
      ) {
        onDateChange(
          dragState.itemId,
          dragState.originalStartDate,
          dragState.originalEndDate,
          item.start_date,
          item.end_date
        );
      }
    }
    setDragState(null);
  };

  const handleGridDoubleClick = (e: React.MouseEvent, dayIndex: number) => {
    if (!onQuickAdd) return;
    const targetDay = days[dayIndex];
    if (!targetDay) return;
    const dateStr = format(targetDay, "yyyy-MM-dd");
    onQuickAdd(dateStr);
  };

  const handleBarClick = (e: React.MouseEvent, item: ScheduleItem) => {
    e.stopPropagation();
    if (dragState) return;
    setSelectedItemId(selectedItemId === item.id ? null : item.id);
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
              placeholder="Buscar tarefa..."
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
          style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}
        >
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

        {/* Gantt rows */}
        <div
          className="relative min-h-[200px]"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Grid lines */}
          <div
            className="absolute inset-0 grid"
            style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}
          >
            {days.map((day, i) => (
              <div
                key={i}
                className={cn(
                  "border-r last:border-r-0 h-full gantt-grid-line",
                  isToday(day) && "bg-primary/5",
                  day.getDay() === 0 || day.getDay() === 6 ? "bg-muted/30" : ""
                )}
                onDoubleClick={(e) => handleGridDoubleClick(e, i)}
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
          {visibleItems.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {filteredItems.length === 0 && items.length > 0
                ? "Nenhum item corresponde aos filtros"
                : "Nenhum item neste período"}
              {onQuickAdd && (
                <div className="mt-1 text-xs">
                  Dê duplo clique para adicionar
                </div>
              )}
            </div>
          ) : (
            <div className="relative py-2 space-y-1">
              {visibleItems.map((item) => {
                const style = getBarStyle(item);
                const colorClass =
                  CATEGORY_COLORS[item.category || "other"] ||
                  CATEGORY_COLORS.other;
                const isDone = !!item.done_at;
                const isOverdue = isItemOverdue(item);
                const isDragging = dragState?.itemId === item.id;
                const isSelected = selectedItemId === item.id;

                return (
                  <div key={item.id} className="relative h-8">
                    <Popover
                      open={isSelected}
                      onOpenChange={(open) =>
                        !open && setSelectedItemId(null)
                      }
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <PopoverTrigger asChild>
                            <div
                              className={cn(
                                "absolute h-7 rounded-md flex items-center gap-1 px-2 cursor-pointer gantt-bar",
                                colorClass,
                                isDone && "opacity-50",
                                isOverdue && "ring-2 ring-destructive gantt-pulse",
                                isDragging && "ring-2 ring-primary shadow-lg scale-[1.02]",
                                onDateChange && "cursor-grab active:cursor-grabbing"
                              )}
                              style={style}
                              onClick={(e) => handleBarClick(e, item)}
                              onMouseDown={(e) => handleMouseDown(e, item, "move")}
                            >
                              {/* Resize handle - start */}
                              {onDateChange && (
                                <div
                                  className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/10 rounded-l-md"
                                  onMouseDown={(e) =>
                                    handleMouseDown(e, item, "resize-start")
                                  }
                                />
                              )}

                              {/* Done checkmark */}
                              {isDone && (
                                <Check className="h-3 w-3 text-white/80 shrink-0" />
                              )}

                              {/* Title */}
                              <span
                                className={cn(
                                  "text-xs font-medium text-white truncate flex-1",
                                  isDone && "line-through"
                                )}
                              >
                                {item.title}
                              </span>

                              {/* Cost badge */}
                              {item.estimated_cost &&
                                item.estimated_cost >= 1000 && (
                                  <span className="text-[10px] bg-black/20 px-1 rounded shrink-0">
                                    {(item.estimated_cost / 1000).toFixed(0)}k
                                  </span>
                                )}

                              {/* Resize handle - end */}
                              {onDateChange && (
                                <div
                                  className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/10 rounded-r-md"
                                  onMouseDown={(e) =>
                                    handleMouseDown(e, item, "resize-end")
                                  }
                                />
                              )}
                            </div>
                          </PopoverTrigger>
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
                            {item.notes && (
                              <div className="text-xs opacity-70 truncate max-w-[200px]">
                                {item.notes}
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>

                      {/* Quick Actions Popover */}
                      <PopoverContent className="w-56 p-3" align="start">
                        <div className="space-y-3">
                          <div className="font-medium truncate">
                            {item.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDateShort(item.start_date)} {" → "}{" "}
                            {formatDateShort(item.end_date)}
                          </div>
                          {item.category && (
                            <Badge variant="secondary" className="text-xs">
                              {
                                SCHEDULE_CATEGORY_LABELS[
                                  item.category as ScheduleCategory
                                ]
                              }
                            </Badge>
                          )}
                          {item.estimated_cost && (
                            <div className="text-sm font-mono">
                              {formatCurrency(item.estimated_cost)}
                            </div>
                          )}

                          {/* Toggle done */}
                          {onToggleDone && (
                            <div className="flex items-center gap-2 pt-2 border-t">
                              <Checkbox
                                id={`done-${item.id}`}
                                checked={isDone}
                                onCheckedChange={(checked) => {
                                  onToggleDone(item.id, !!checked);
                                  setSelectedItemId(null);
                                }}
                              />
                              <label
                                htmlFor={`done-${item.id}`}
                                className="text-sm cursor-pointer"
                              >
                                Marcar como concluído
                              </label>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex gap-2 pt-2 border-t">
                            {onItemClick && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                  onItemClick(item);
                                  setSelectedItemId(null);
                                }}
                              >
                                <Pencil className="h-3 w-3 mr-1" />
                                Editar
                              </Button>
                            )}
                            {onDelete && (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="flex-1"
                                onClick={() => {
                                  onDelete(item.id);
                                  setSelectedItemId(null);
                                }}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Excluir
                              </Button>
                            )}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
