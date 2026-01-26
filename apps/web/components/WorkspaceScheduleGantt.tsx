"use client";

import { useMemo, useState } from "react";
import { addDays, differenceInDays, format, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval, isBefore, startOfDay, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Building2 } from "lucide-react";
import Link from "next/link";
import type { WorkspaceScheduleItem } from "@widia/shared";
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

interface GroupedByProperty {
  propertyId: string;
  propertyName: string;
  items: WorkspaceScheduleItem[];
}

interface WorkspaceScheduleGanttProps {
  items: WorkspaceScheduleItem[];
}

export function WorkspaceScheduleGantt({ items }: WorkspaceScheduleGanttProps) {
  const [viewStart, setViewStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const viewEnd = endOfWeek(addDays(viewStart, 20), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: viewStart, end: viewEnd });
  const today = startOfDay(new Date());

  const goToPrevWeek = () => setViewStart(addDays(viewStart, -7));
  const goToNextWeek = () => setViewStart(addDays(viewStart, 7));
  const goToToday = () => setViewStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const grouped = useMemo(() => {
    const map = new Map<string, GroupedByProperty>();

    for (const item of items) {
      const itemStart = new Date(item.start_date + "T00:00:00");
      const itemEnd = new Date(item.end_date + "T23:59:59");

      const isVisible = isWithinInterval(itemStart, { start: viewStart, end: viewEnd }) ||
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

    return Array.from(map.values()).sort((a, b) => a.propertyName.localeCompare(b.propertyName));
  }, [items, viewStart, viewEnd]);

  const getBarStyle = (item: WorkspaceScheduleItem) => {
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
      <div className="grid border-b bg-muted/30" style={{ gridTemplateColumns: `200px repeat(${days.length}, 1fr)` }}>
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
            <div className="font-medium">{format(day, "EEE", { locale: ptBR })}</div>
            <div className="text-muted-foreground">{format(day, "d")}</div>
          </div>
        ))}
      </div>

      {/* Gantt rows by property */}
      {grouped.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Nenhum item neste período
        </div>
      ) : (
        <div className="divide-y">
          {grouped.map((group) => (
            <div key={group.propertyId} className="grid" style={{ gridTemplateColumns: `200px 1fr` }}>
              {/* Property label */}
              <div className="px-3 py-2 border-r bg-muted/20">
                <Link
                  href={`/app/properties/${group.propertyId}/schedule`}
                  className="flex items-center gap-2 hover:underline"
                >
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium truncate">{group.propertyName}</span>
                </Link>
              </div>

              {/* Tasks for this property */}
              <div className="relative min-h-[40px]">
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
                <div className="relative py-1 space-y-0.5">
                  {group.items.sort((a, b) => a.start_date.localeCompare(b.start_date)).map((item) => {
                    const style = getBarStyle(item);
                    const colorClass = CATEGORY_COLORS[item.category || "other"] || CATEGORY_COLORS.other;
                    const isDone = !!item.done_at;
                    const isOverdue = !isDone && new Date(item.end_date + "T23:59:59") < today;

                    return (
                      <div key={item.id} className="relative h-6">
                        <Link
                          href={`/app/properties/${item.property_id}/schedule`}
                          className={cn(
                            "absolute h-5 rounded flex items-center px-2 transition-opacity hover:opacity-80",
                            colorClass,
                            isDone && "opacity-50",
                            isOverdue && "ring-2 ring-destructive"
                          )}
                          style={style}
                        >
                          <span className={cn(
                            "text-xs font-medium text-white truncate",
                            isDone && "line-through"
                          )}>
                            {item.title}
                          </span>
                        </Link>
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
  );
}
