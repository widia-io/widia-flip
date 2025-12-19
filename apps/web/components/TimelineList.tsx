"use client";

import type { TimelineEvent } from "@widia/shared";

interface TimelineListProps {
  events: TimelineEvent[];
}

const EVENT_LABELS: Record<string, string> = {
  status_changed: "Status alterado",
  analysis_cash_saved: "Análise à vista salva",
  analysis_financing_saved: "Análise financiada salva",
  cost_added: "Custo adicionado",
  cost_updated: "Custo atualizado",
  doc_uploaded: "Documento anexado",
};

const EVENT_ICONS: Record<string, string> = {
  status_changed: "🔄",
  analysis_cash_saved: "💵",
  analysis_financing_saved: "🏦",
  cost_added: "💰",
  cost_updated: "✏️",
  doc_uploaded: "📎",
};

const COST_TYPE_LABELS: Record<string, string> = {
  renovation: "Reforma",
  legal: "Jurídico",
  tax: "Impostos",
  other: "Outros",
};

export function TimelineList({ events }: TimelineListProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const renderPayload = (event: TimelineEvent) => {
    if (!event.payload) return null;

    const payload = event.payload as Record<string, unknown>;

    if (event.event_type === "status_changed") {
      const fromStatus = payload.from_status as string | null;
      const toStatus = payload.to_status as string;

      const statusLabels: Record<string, string> = {
        prospecting: "Prospecção",
        analyzing: "Analisando",
        bought: "Comprado",
        renovation: "Reforma",
        for_sale: "À Venda",
        sold: "Vendido",
        archived: "Arquivado",
      };

      if (fromStatus) {
        return (
          <span className="text-neutral-400">
            {statusLabels[fromStatus] || fromStatus} → {statusLabels[toStatus] || toStatus}
          </span>
        );
      } else {
        return (
          <span className="text-neutral-400">
            Status inicial: {statusLabels[toStatus] || toStatus}
          </span>
        );
      }
    }

    if (event.event_type === "analysis_cash_saved" || event.event_type === "analysis_financing_saved") {
      const netProfit = payload.net_profit as number | undefined;
      const roi = payload.roi as number | undefined;

      return (
        <span className="text-neutral-400">
          {netProfit !== undefined && (
            <>Lucro: {formatCurrency(netProfit)}</>
          )}
          {roi !== undefined && (
            <> | ROI: {roi.toFixed(2)}%</>
          )}
        </span>
      );
    }

    if (event.event_type === "cost_added") {
      const costType = payload.cost_type as string | undefined;
      const amount = payload.amount as number | undefined;

      return (
        <span className="text-neutral-400">
          {costType && <>{COST_TYPE_LABELS[costType] || costType}</>}
          {amount !== undefined && <> - {formatCurrency(amount)}</>}
        </span>
      );
    }

    if (event.event_type === "cost_updated") {
      const changes = payload.changes as Record<string, unknown> | undefined;
      if (!changes) return null;

      const parts: string[] = [];
      if (changes.status) parts.push(`Status: ${changes.status === "paid" ? "Pago" : "Planejado"}`);
      if (changes.amount !== undefined) parts.push(`Valor: ${formatCurrency(changes.amount as number)}`);
      if (changes.cost_type) parts.push(`Tipo: ${COST_TYPE_LABELS[changes.cost_type as string] || changes.cost_type}`);

      return (
        <span className="text-neutral-400">
          {parts.join(" | ") || "Dados atualizados"}
        </span>
      );
    }

    if (event.event_type === "doc_uploaded") {
      const filename = payload.filename as string | undefined;

      return (
        <span className="text-neutral-400">
          {filename || "Documento"}
        </span>
      );
    }

    return null;
  };

  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-8 text-center">
        <p className="text-sm text-neutral-400">
          Nenhum evento registrado ainda.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950">
      <div className="border-b border-neutral-800 px-4 py-3">
        <h3 className="text-sm font-medium text-neutral-100">
          Histórico de Eventos
        </h3>
      </div>
      <ul className="divide-y divide-neutral-800">
        {events.map((event) => (
          <li key={event.id} className="flex items-start gap-4 px-4 py-4">
            <span className="text-xl">
              {EVENT_ICONS[event.event_type] || "📌"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-100">
                {EVENT_LABELS[event.event_type] || event.event_type}
              </p>
              <div className="mt-1 text-xs">
                {renderPayload(event)}
              </div>
            </div>
            <time className="text-xs text-neutral-500 whitespace-nowrap">
              {formatDate(event.created_at)}
            </time>
          </li>
        ))}
      </ul>
    </div>
  );
}
