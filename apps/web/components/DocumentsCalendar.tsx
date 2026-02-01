"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  type View,
} from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import type { WorkspaceDocumentItem } from "@widia/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { "pt-BR": ptBR };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

const TYPE_COLORS: Record<string, string> = {
  pdf: "#ef4444",
  image: "#3b82f6",
  excel: "#22c55e",
  word: "#8b5cf6",
  other: "#6b7280",
};

const TYPE_LABELS: Record<string, string> = {
  pdf: "PDF",
  image: "Imagem",
  excel: "Planilha",
  word: "Documento",
  other: "Outro",
};

function getDocumentType(contentType: string | null): string {
  if (!contentType) return "other";
  if (contentType === "application/pdf") return "pdf";
  if (contentType.startsWith("image/")) return "image";
  if (contentType.includes("excel") || contentType.includes("sheet")) return "excel";
  if (contentType.includes("word") || contentType.includes("document")) return "word";
  return "other";
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: WorkspaceDocumentItem;
}

interface DocumentsCalendarProps {
  items: WorkspaceDocumentItem[];
  onEventClick?: (item: WorkspaceDocumentItem) => void;
}

export function DocumentsCalendar({
  items,
  onEventClick,
}: DocumentsCalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [currentView, setCurrentView] = useState<View>("month");

  const events: CalendarEvent[] = useMemo(() => {
    return items.map((item) => {
      const date = new Date(item.created_at);
      return {
        id: item.id,
        title: item.filename,
        start: date,
        end: date,
        allDay: true,
        resource: item,
      };
    });
  }, [items]);

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      onEventClick?.(event.resource);
    },
    [onEventClick]
  );

  const handleNavigate = useCallback((newDate: Date) => {
    setCurrentDate(newDate);
  }, []);

  const handleViewChange = useCallback((newView: View) => {
    setCurrentView(newView);
  }, []);

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const item = event.resource;
    const docType = getDocumentType(item.content_type);
    const baseColor = TYPE_COLORS[docType] || TYPE_COLORS.other;

    return {
      style: {
        backgroundColor: baseColor,
        borderRadius: "4px",
        border: "none",
        color: "white",
        fontSize: "12px",
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
    event: "Documento",
    noEventsInRange: "Nenhum documento neste período",
    showMore: (total: number) => `+${total} mais`,
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-base font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <CalendarDays className="h-4 w-4 text-primary" />
            </div>
            Calendario de Documentos
          </CardTitle>
          {/* Desktop Legend - inline */}
          <div className="hidden sm:flex items-center gap-4">
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5 text-xs">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-muted-foreground">{TYPE_LABELS[type]}</span>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="documents-calendar h-[600px]">
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
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventStyleGetter}
            messages={messages}
            culture="pt-BR"
            popup
            tooltipAccessor={(event) => {
              const item = event.resource;
              const parts = [item.filename];
              if (item.property_name) parts.push(item.property_name);
              if (item.schedule_item_title)
                parts.push(`📅 ${item.schedule_item_title}`);
              return parts.join(" - ");
            }}
          />
        </div>
        {/* Mobile Legend - below calendar */}
        <div className="sm:hidden flex flex-wrap items-center justify-center gap-4 mt-4 pt-4 border-t">
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-muted-foreground">{TYPE_LABELS[type]}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
