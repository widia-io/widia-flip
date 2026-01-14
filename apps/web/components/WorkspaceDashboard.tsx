"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  DollarSign,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import type {
  DashboardResponse,
  DashboardTimelineEvent,
  UpcomingItem,
} from "@widia/shared";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS_LABELS: Record<string, string> = {
  prospecting: "Prospecção",
  analyzing: "Análise",
  bought: "Comprado",
  renovation: "Em Reforma",
  for_sale: "À Venda",
  sold: "Vendido",
  archived: "Arquivado",
};

const STATUS_COLORS: Record<string, string> = {
  prospecting: "bg-slate-100 text-slate-700",
  analyzing: "bg-blue-100 text-blue-700",
  bought: "bg-purple-100 text-purple-700",
  renovation: "bg-amber-100 text-amber-700",
  for_sale: "bg-emerald-100 text-emerald-700",
  sold: "bg-green-100 text-green-700",
  archived: "bg-gray-100 text-gray-500",
};

const PIPELINE_ORDER = ["prospecting", "analyzing", "bought", "renovation", "for_sale", "sold"];

const EVENT_TYPE_CONFIG: Record<string, { icon: typeof Building2; label: string; color: string }> = {
  status_changed: { icon: TrendingUp, label: "Status alterado", color: "text-blue-600" },
  cost_added: { icon: DollarSign, label: "Custo adicionado", color: "text-amber-600" },
  schedule_item_created: { icon: Calendar, label: "Tarefa criada", color: "text-purple-600" },
  schedule_item_completed: { icon: CheckCircle2, label: "Tarefa concluida", color: "text-green-600" },
  doc_uploaded: { icon: FileText, label: "Documento enviado", color: "text-slate-600" },
  analysis_cash_saved: { icon: DollarSign, label: "Analise salva", color: "text-emerald-600" },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `${diffMins}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return "ontem";
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

interface WorkspaceDashboardProps {
  data: DashboardResponse;
  workspaceSlug: string;
}

export function WorkspaceDashboard({ data, workspaceSlug }: WorkspaceDashboardProps) {
  const { properties, costs, schedule, upcoming_items, recent_events } = data;

  const metrics = useMemo(() => {
    const budgetExecution = costs.total_planned > 0
      ? (costs.total_paid / costs.total_planned) * 100
      : 0;

    const activeProperties = properties.total - (properties.by_status["archived"] || 0);
    const renovationCount = properties.by_status["renovation"] || 0;
    const forSaleCount = properties.by_status["for_sale"] || 0;

    const attentionCount = costs.overdue_count + schedule.overdue_items;

    return {
      budgetExecution,
      activeProperties,
      renovationCount,
      forSaleCount,
      attentionCount,
    };
  }, [properties, costs, schedule]);

  const pipelineData = useMemo(() => {
    const total = PIPELINE_ORDER.reduce((sum, status) => sum + (properties.by_status[status] || 0), 0);
    return PIPELINE_ORDER.map(status => ({
      status,
      label: STATUS_LABELS[status],
      count: properties.by_status[status] || 0,
      percentage: total > 0 ? ((properties.by_status[status] || 0) / total) * 100 : 0,
    }));
  }, [properties.by_status]);

  const getBudgetColor = (percentage: number) => {
    if (percentage < 90) return { bg: "bg-green-500/10", text: "text-green-600", progress: "bg-green-500" };
    if (percentage <= 100) return { bg: "bg-yellow-500/10", text: "text-yellow-600", progress: "bg-yellow-500" };
    return { bg: "bg-destructive/10", text: "text-destructive", progress: "bg-destructive" };
  };

  const budgetColor = getBudgetColor(metrics.budgetExecution);

  if (properties.total === 0) {
    return (
      <Card className="border-dashed">
        <EmptyState
          icon={Building2}
          title="Nenhum imovel cadastrado"
          description="Adicione imoveis ao seu workspace para visualizar o dashboard."
          tip="Comece prospectando oportunidades ou adicionando imoveis manualmente."
          action={{
            label: "Adicionar imovel",
            href: `/app/workspaces/${workspaceSlug}/properties`,
          }}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Properties */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Imoveis Ativos
                </p>
                <p className="text-3xl font-bold tabular-nums">{metrics.activeProperties}</p>
              </div>
            </div>
            {(metrics.renovationCount > 0 || metrics.forSaleCount > 0) && (
              <p className="mt-3 text-sm text-muted-foreground">
                {metrics.renovationCount > 0 && `${metrics.renovationCount} em reforma`}
                {metrics.renovationCount > 0 && metrics.forSaleCount > 0 && ", "}
                {metrics.forSaleCount > 0 && `${metrics.forSaleCount} a venda`}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Budget Execution */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${budgetColor.bg}`}>
                <DollarSign className={`h-5 w-5 ${budgetColor.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Orcamento
                </p>
                <p className={`text-3xl font-bold tabular-nums ${budgetColor.text}`}>
                  {costs.total_planned > 0 ? `${metrics.budgetExecution.toFixed(0)}%` : "—"}
                </p>
              </div>
            </div>
            {costs.total_planned > 0 && (
              <>
                <Progress value={Math.min(metrics.budgetExecution, 100)} className="mt-3 h-2" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {formatCurrency(costs.total_paid)} de {formatCurrency(costs.total_planned)}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Schedule Progress */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Cronograma
                </p>
                <p className="text-3xl font-bold tabular-nums text-purple-600">
                  {schedule.total_items > 0 ? `${schedule.progress_percent.toFixed(0)}%` : "—"}
                </p>
              </div>
            </div>
            {schedule.total_items > 0 && (
              <>
                <Progress value={schedule.progress_percent} className="mt-3 h-2" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {schedule.completed_items} de {schedule.total_items} tarefas
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Attention Required */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                metrics.attentionCount > 0 ? "bg-destructive/10" : "bg-green-500/10"
              }`}>
                {metrics.attentionCount > 0 ? (
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Atencao
                </p>
                <p className={`text-3xl font-bold tabular-nums ${
                  metrics.attentionCount > 0 ? "text-destructive" : "text-green-600"
                }`}>
                  {metrics.attentionCount > 0 ? metrics.attentionCount : "OK"}
                </p>
              </div>
            </div>
            {metrics.attentionCount > 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {costs.overdue_count > 0 && `${costs.overdue_count} custos vencidos`}
                {costs.overdue_count > 0 && schedule.overdue_items > 0 && ", "}
                {schedule.overdue_items > 0 && `${schedule.overdue_items} tarefas atrasadas`}
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Tudo em dia!</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pipeline + Upcoming Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pipeline Visualization */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Pipeline de Imoveis</CardTitle>
            <Link
              href={`/app/workspaces/${workspaceSlug}/properties`}
              className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {pipelineData.filter(p => p.count > 0 || PIPELINE_ORDER.indexOf(p.status) < 4).map((item) => (
              <Link
                key={item.status}
                href={`/app/workspaces/${workspaceSlug}/properties?status=${item.status}`}
                className="block group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-24 flex-shrink-0">
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex-1 h-6 bg-muted/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all group-hover:opacity-80 ${
                        STATUS_COLORS[item.status]?.replace("text-", "bg-").split(" ")[0] || "bg-slate-200"
                      }`}
                      style={{ width: `${Math.max(item.percentage, item.count > 0 ? 10 : 0)}%` }}
                    />
                  </div>
                  <div className="w-8 text-right">
                    <span className="text-sm font-medium tabular-nums">{item.count}</span>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Upcoming / Attention Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Proximos Itens</CardTitle>
            {upcoming_items.length > 0 && (
              <Link
                href={`/app/workspaces/${workspaceSlug}/costs`}
                className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                Ver todos <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {upcoming_items.length > 0 ? (
              <div className="space-y-2">
                {upcoming_items.map((item) => (
                  <UpcomingItemRow key={`${item.type}-${item.id}`} item={item} workspaceSlug={workspaceSlug} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 mb-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm font-medium">Tudo em dia!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Nenhum custo ou tarefa pendente
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {recent_events.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {recent_events.slice(0, 8).map((event) => (
                <ActivityItem key={event.id} event={event} workspaceSlug={workspaceSlug} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function UpcomingItemRow({ item, workspaceSlug }: { item: UpcomingItem; workspaceSlug: string }) {
  const isOverdue = item.days_until < 0;
  const isToday = item.days_until === 0;
  const isUrgent = item.days_until > 0 && item.days_until <= 3;

  const Icon = item.type === "cost" ? DollarSign : Calendar;

  const getStatusStyle = () => {
    if (isOverdue) return { bg: "bg-destructive/10", text: "text-destructive", badge: "bg-destructive/10 text-destructive border-destructive/20" };
    if (isToday) return { bg: "bg-amber-500/10", text: "text-amber-600", badge: "bg-amber-500/10 text-amber-600 border-amber-200" };
    if (isUrgent) return { bg: "bg-yellow-500/10", text: "text-yellow-600", badge: "bg-yellow-500/10 text-yellow-600 border-yellow-200" };
    return { bg: "bg-blue-500/10", text: "text-blue-600", badge: "bg-blue-500/10 text-blue-600 border-blue-200" };
  };

  const style = getStatusStyle();

  const getDaysLabel = () => {
    if (isOverdue) return `${Math.abs(item.days_until)}d atrasado`;
    if (isToday) return "Hoje";
    if (item.days_until === 1) return "Amanha";
    return `em ${item.days_until}d`;
  };

  const href = item.type === "cost"
    ? `/app/workspaces/${workspaceSlug}/costs`
    : `/app/workspaces/${workspaceSlug}/schedule`;

  return (
    <Link
      href={href}
      className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${style.bg}`}>
        <Icon className={`h-4 w-4 ${style.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        <p className="text-xs text-muted-foreground truncate">{item.property_name}</p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <Badge variant="outline" className={`text-xs ${style.badge}`}>
          {getDaysLabel()}
        </Badge>
        {item.type === "cost" && item.amount && item.amount > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatCurrency(item.amount)}
          </span>
        )}
      </div>
    </Link>
  );
}

function ActivityItem({ event, workspaceSlug }: { event: DashboardTimelineEvent; workspaceSlug: string }) {
  const config = EVENT_TYPE_CONFIG[event.event_type] || {
    icon: Clock,
    label: event.event_type,
    color: "text-muted-foreground",
  };
  const Icon = config.icon;

  return (
    <Link
      href={`/app/workspaces/${workspaceSlug}/properties/${event.property_id}`}
      className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-muted ${config.color}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">
          <span className="font-medium">{config.label}</span>
          <span className="text-muted-foreground"> em </span>
          <span className="text-foreground group-hover:text-primary transition-colors">{event.property_name}</span>
        </p>
      </div>
      <span className="text-xs text-muted-foreground flex-shrink-0">
        {formatRelativeTime(event.created_at)}
      </span>
    </Link>
  );
}
