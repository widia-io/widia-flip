"use client";

import { useState, useMemo, useCallback } from "react";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ScheduleItem, ScheduleCategory } from "@widia/shared";
import { SCHEDULE_CATEGORY_LABELS } from "@widia/shared";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { "pt-BR": ptBR };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

const CATEGORY_COLORS: Record<string, string> = {
  demolition: "#ef4444",
  structural: "#f97316",
  electrical: "#eab308",
  plumbing: "#3b82f6",
  flooring: "#8b5cf6",
  painting: "#ec4899",
  finishing: "#14b8a6",
  cleaning: "#22c55e",
  other: "#6b7280",
};

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: ScheduleItem;
}

interface ScheduleCalendarProps {
  items: ScheduleItem[];
  onEventClick: (item: ScheduleItem) => void;
  onSlotSelect: (date: Date) => void;
}

export function ScheduleCalendar({
  items,
  onEventClick,
  onSlotSelect,
}: ScheduleCalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [currentView, setCurrentView] = useState<View>("month");

  const events: CalendarEvent[] = useMemo(() => {
    return items.map((item) => {
      const start = new Date(item.start_date + "T00:00:00");
      // End date needs to be +1 day for react-big-calendar all-day events to render correctly
      const endDate = new Date(item.end_date + "T00:00:00");
      endDate.setDate(endDate.getDate() + 1);
      return {
        id: item.id,
        title: item.title,
        start,
        end: endDate,
        allDay: true,
        resource: item,
      };
    });
  }, [items]);

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      onEventClick(event.resource);
    },
    [onEventClick]
  );

  const handleSelectSlot = useCallback(
    ({ start }: { start: Date }) => {
      onSlotSelect(start);
    },
    [onSlotSelect]
  );

  const handleNavigate = useCallback((newDate: Date) => {
    setCurrentDate(newDate);
  }, []);

  const handleViewChange = useCallback((newView: View) => {
    setCurrentView(newView);
  }, []);

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const item = event.resource;
    const isDone = !!item.done_at;
    const baseColor = item.category
      ? CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other
      : CATEGORY_COLORS.other;

    return {
      style: {
        backgroundColor: baseColor,
        opacity: isDone ? 0.5 : 1,
        borderRadius: "4px",
        border: "none",
        color: "white",
        fontSize: "12px",
        textDecoration: isDone ? "line-through" : "none",
      },
    };
  }, []);

  const messages = {
    today: "Hoje",
    previous: "Anterior",
    next: "Próximo",
    month: "Mês",
    week: "Semana",
    day: "Dia",
    agenda: "Agenda",
    date: "Data",
    time: "Hora",
    event: "Evento",
    noEventsInRange: "Nenhum item neste período",
    showMore: (total: number) => `+${total} mais`,
  };

  return (
    <div className="schedule-calendar h-[600px] bg-background rounded-lg border p-4">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        view={currentView}
        date={currentDate}
        onNavigate={handleNavigate}
        onView={handleViewChange}
        views={["month", "week", "agenda"] as View[]}
        selectable
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        eventPropGetter={eventStyleGetter}
        messages={messages}
        culture="pt-BR"
        popup
        tooltipAccessor={(event) => {
          const item = event.resource;
          const parts = [item.title];
          if (item.category) {
            parts.push(
              SCHEDULE_CATEGORY_LABELS[item.category as ScheduleCategory] ||
                item.category
            );
          }
          if (item.notes) parts.push(item.notes);
          return parts.join(" - ");
        }}
      />
    </div>
  );
}
