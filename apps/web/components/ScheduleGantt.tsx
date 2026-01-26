"use client";

import { useMemo, useState } from "react";
import { addDays, differenceInDays, format, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval, isBefore, startOfDay, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ScheduleItem } from "@widia/shared";
import { SCHEDULE_CATEGORY_LABELS } from "@widia/shared";
import { Button } from "@/components/ui/button";
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

interface ScheduleGanttProps {
  items: ScheduleItem[];
  onItemClick?: (item: ScheduleItem) => void;
  onDateChange?: (itemId: string, startDate: string, endDate: string, previousStartDate: string, previousEndDate: string) => void;
}

export function ScheduleGantt({ items, onItemClick, onDateChange }: ScheduleGanttProps) {
  const [viewStart, setViewStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [dragState, setDragState] = useState<{
    itemId: string;
    type: "move" | "resize-start" | "resize-end";
    startX: number;
    originalStartDate: string;
    originalEndDate: string;
  } | null>(null);

  const viewEnd = endOfWeek(addDays(viewStart, 20), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: viewStart, end: viewEnd });

  const today = startOfDay(new Date());

  const goToPrevWeek = () => setViewStart(addDays(viewStart, -7));
  const goToNextWeek = () => setViewStart(addDays(viewStart, 7));
  const goToToday = () => setViewStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const visibleItems = useMemo(() => {
    return items.filter(item => {
      const itemStart = new Date(item.start_date + "T00:00:00");
      const itemEnd = new Date(item.end_date + "T23:59:59");
      return isWithinInterval(itemStart, { start: viewStart, end: viewEnd }) ||
             isWithinInterval(itemEnd, { start: viewStart, end: viewEnd }) ||
             (isBefore(itemStart, viewStart) && isBefore(viewEnd, itemEnd));
    }).sort((a, b) => a.start_date.localeCompare(b.start_date));
  }, [items, viewStart, viewEnd]);

  const getBarStyle = (item: ScheduleItem) => {
    const itemStart = new Date(item.start_date + "T00:00:00");
    const itemEnd = new Date(item.end_date + "T23:59:59");

    const startDiff = Math.max(0, differenceInDays(itemStart, viewStart));
    const endDiff = Math.min(days.length - 1, differenceInDays(itemEnd, viewStart));

    const left = (startDiff / days.length) * 100;
    const width = ((endDiff - startDiff + 1) / days.length) * 100;

    return {
      left: `${left}%`,
      width: `${width}%`,
    };
  };

  const handleMouseDown = (e: React.MouseEvent, item: ScheduleItem, type: "move" | "resize-start" | "resize-end") => {
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

    if (newStartStr !== dragState.originalStartDate || newEndStr !== dragState.originalEndDate) {
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
      const item = items.find(i => i.id === dragState.itemId);
      if (item && (item.start_date !== dragState.originalStartDate || item.end_date !== dragState.originalEndDate)) {
        onDateChange(dragState.itemId, dragState.originalStartDate, dragState.originalEndDate, item.start_date, item.end_date);
      }
    }
    setDragState(null);
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Header */}
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
        <div className="text-sm font-medium">
          {format(viewStart, "d MMM", { locale: ptBR })} - {format(viewEnd, "d MMM yyyy", { locale: ptBR })}
        </div>
      </div>

      {/* Timeline header */}
      <div className="grid border-b bg-muted/30" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
        {days.map((day, i) => (
          <div
            key={i}
            className={cn(
              "text-center py-1 text-xs border-r last:border-r-0",
              isToday(day) && "bg-primary/10 font-medium",
              day.getDay() === 0 || day.getDay() === 6 ? "bg-muted/50" : ""
            )}
          >
            <div className="font-medium">{format(day, "EEE", { locale: ptBR })}</div>
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
        <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
          {days.map((day, i) => (
            <div
              key={i}
              className={cn(
                "border-r last:border-r-0 h-full",
                isToday(day) && "bg-primary/5",
                day.getDay() === 0 || day.getDay() === 6 ? "bg-muted/30" : ""
              )}
            />
          ))}
        </div>

        {/* Today line */}
        {isWithinInterval(today, { start: viewStart, end: viewEnd }) && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
            style={{ left: `${(differenceInDays(today, viewStart) / days.length) * 100}%` }}
          />
        )}

        {/* Task bars */}
        {visibleItems.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Nenhum item neste período
          </div>
        ) : (
          <div className="relative py-2 space-y-1">
            {visibleItems.map((item) => {
              const style = getBarStyle(item);
              const colorClass = CATEGORY_COLORS[item.category || "other"] || CATEGORY_COLORS.other;
              const isDone = !!item.done_at;
              const isOverdue = !isDone && new Date(item.end_date + "T23:59:59") < today;
              const isDragging = dragState?.itemId === item.id;

              return (
                <div key={item.id} className="relative h-8">
                  <div
                    className={cn(
                      "absolute h-7 rounded-md flex items-center gap-1 px-2 cursor-pointer transition-all",
                      colorClass,
                      isDone && "opacity-50",
                      isOverdue && "ring-2 ring-destructive",
                      isDragging && "ring-2 ring-primary shadow-lg",
                      onDateChange && "cursor-grab active:cursor-grabbing"
                    )}
                    style={style}
                    onClick={() => !isDragging && onItemClick?.(item)}
                    onMouseDown={(e) => handleMouseDown(e, item, "move")}
                  >
                    {/* Resize handle - start */}
                    {onDateChange && (
                      <div
                        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/10"
                        onMouseDown={(e) => handleMouseDown(e, item, "resize-start")}
                      />
                    )}

                    <span className={cn(
                      "text-xs font-medium text-white truncate flex-1",
                      isDone && "line-through"
                    )}>
                      {item.title}
                    </span>

                    {/* Resize handle - end */}
                    {onDateChange && (
                      <div
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/10"
                        onMouseDown={(e) => handleMouseDown(e, item, "resize-end")}
                      />
                    )}
                  </div>
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
  );
}
