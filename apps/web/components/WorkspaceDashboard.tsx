"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Building2,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  ArrowUpRight,
  Zap,
  Target,
  Clock,
  Flame,
  Trophy,
  Plus,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import type { DashboardResponse, UpcomingItem } from "@widia/shared";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; gradient: string; bgLight: string }
> = {
  prospecting: {
    label: "Prospeccao",
    color: "text-slate-600 dark:text-slate-400",
    gradient: "from-slate-500 to-slate-600",
    bgLight: "bg-slate-500/10",
  },
  analyzing: {
    label: "Analise",
    color: "text-blue-600 dark:text-blue-400",
    gradient: "from-blue-500 to-blue-600",
    bgLight: "bg-blue-500/10",
  },
  bought: {
    label: "Comprado",
    color: "text-violet-600 dark:text-violet-400",
    gradient: "from-violet-500 to-violet-600",
    bgLight: "bg-violet-500/10",
  },
  renovation: {
    label: "Reforma",
    color: "text-amber-600 dark:text-amber-400",
    gradient: "from-amber-500 to-amber-600",
    bgLight: "bg-amber-500/10",
  },
  for_sale: {
    label: "A Venda",
    color: "text-emerald-600 dark:text-emerald-400",
    gradient: "from-emerald-500 to-emerald-600",
    bgLight: "bg-emerald-500/10",
  },
  sold: {
    label: "Vendido",
    color: "text-green-600 dark:text-green-400",
    gradient: "from-green-500 to-green-600",
    bgLight: "bg-green-500/10",
  },
};

const PIPELINE_ORDER = [
  "prospecting",
  "analyzing",
  "bought",
  "renovation",
  "for_sale",
  "sold",
];

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `R$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$${(value / 1000).toFixed(0)}k`;
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface WorkspaceDashboardProps {
  data: DashboardResponse;
  workspaceSlug: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function WorkspaceDashboard({ data, workspaceSlug }: WorkspaceDashboardProps) {
  const { properties, costs, schedule, upcoming_items } = data;

  const insights = useMemo(() => {
    const forSale = properties.by_status["for_sale"] || 0;
    const renovation = properties.by_status["renovation"] || 0;
    const analyzing = properties.by_status["analyzing"] || 0;
    const sold = properties.by_status["sold"] || 0;
    const totalActive =
      properties.total - (properties.by_status["archived"] || 0);
    const overdueTotal = costs.overdue_count + schedule.overdue_items;
    const pendingCosts = costs.total_planned - costs.total_paid;

    let primaryInsight = {
      type: "neutral" as "success" | "warning" | "action" | "neutral",
      icon: Building2,
      title: `${totalActive} imoveis ativos`,
      subtitle: "em seu portfolio",
      action: null as { label: string; href: string } | null,
    };

    if (overdueTotal > 0) {
      primaryInsight = {
        type: "warning",
        icon: AlertTriangle,
        title: `${overdueTotal} ${overdueTotal === 1 ? "item requer" : "itens requerem"} atencao`,
        subtitle:
          overdueTotal === 1
            ? "custo ou tarefa em atraso"
            : "custos ou tarefas em atraso",
        action: { label: "Resolver agora", href: `/app/costs` },
      };
    } else if (forSale > 0) {
      primaryInsight = {
        type: "success",
        icon: TrendingUp,
        title: `${forSale} ${forSale === 1 ? "imovel pronto" : "imoveis prontos"} para venda`,
        subtitle: "aguardando comprador",
        action: {
          label: "Ver imoveis",
          href: `/app/properties?status=for_sale`,
        },
      };
    } else if (renovation > 0) {
      primaryInsight = {
        type: "action",
        icon: Zap,
        title: `${renovation} em reforma`,
        subtitle: "acompanhe o progresso",
        action: {
          label: "Ver reformas",
          href: `/app/properties?status=renovation`,
        },
      };
    } else if (analyzing > 0) {
      primaryInsight = {
        type: "neutral",
        icon: Target,
        title: `${analyzing} em analise`,
        subtitle: "avalie e decida",
        action: {
          label: "Analisar",
          href: `/app/properties?status=analyzing`,
        },
      };
    }

    return {
      primaryInsight,
      forSale,
      renovation,
      analyzing,
      sold,
      totalActive,
      overdueTotal,
      pendingCosts,
      budgetPercent:
        costs.total_planned > 0
          ? (costs.total_paid / costs.total_planned) * 100
          : 0,
      schedulePercent: schedule.progress_percent,
    };
  }, [properties, costs, schedule]);

  const pipelineData = useMemo(() => {
    const maxCount = Math.max(
      ...PIPELINE_ORDER.map((s) => properties.by_status[s] || 0),
      1
    );
    return PIPELINE_ORDER.map((status) => ({
      status,
      ...STATUS_CONFIG[status],
      count: properties.by_status[status] || 0,
      width: ((properties.by_status[status] || 0) / maxCount) * 100,
    }));
  }, [properties.by_status]);

  const urgentItems = useMemo(() => {
    const overdue = upcoming_items.filter((i) => i.days_until < 0);
    const today = upcoming_items.filter((i) => i.days_until === 0);
    const thisWeek = upcoming_items.filter(
      (i) => i.days_until > 0 && i.days_until <= 7
    );
    return { overdue, today, thisWeek };
  }, [upcoming_items]);

  if (properties.total === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card">
        <EmptyState
          icon={Building2}
          title="Nenhum imovel cadastrado"
          description="Adicione imoveis ao seu workspace para visualizar o dashboard."
          tip="Comece prospectando oportunidades ou adicionando imoveis manualmente."
          action={{
            label: "Adicionar imovel",
            href: `/app/properties`,
          }}
        />
      </div>
    );
  }

  const insightStyles = {
    success: {
      bg: "from-emerald-500/20 via-emerald-500/10 to-transparent",
      iconBg: "bg-emerald-500",
      border: "border-emerald-500/30",
    },
    warning: {
      bg: "from-amber-500/20 via-amber-500/10 to-transparent",
      iconBg: "bg-amber-500",
      border: "border-amber-500/30",
    },
    action: {
      bg: "from-primary/20 via-primary/10 to-transparent",
      iconBg: "bg-primary",
      border: "border-primary/30",
    },
    neutral: {
      bg: "from-slate-500/20 via-slate-500/10 to-transparent",
      iconBg: "bg-slate-600",
      border: "border-slate-500/30",
    },
  };

  const style = insightStyles[insights.primaryInsight.type];
  const InsightIcon = insights.primaryInsight.icon;

  return (
    <div className="space-y-6">
      {/* Hero Insight Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-border"
      >
        <div className={cn("absolute inset-0 bg-gradient-to-r", style.bg)} />
        <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/5 blur-[60px]" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-accent/5 blur-[40px]" />

        <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg",
                style.iconBg
              )}
            >
              <InsightIcon className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                {insights.primaryInsight.title}
              </h2>
              <p className="text-muted-foreground">
                {insights.primaryInsight.subtitle}
              </p>
            </div>
          </div>

          {insights.primaryInsight.action && (
            <Link href={insights.primaryInsight.action.href}>
              <Button className="gap-2 shadow-lg">
                {insights.primaryInsight.action.label}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </motion.div>

      {/* Stats Row - Redesigned with gradients */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          icon={Building2}
          label="Imoveis Ativos"
          value={insights.totalActive}
          subtitle={
            insights.sold > 0 ? `${insights.sold} vendidos` : "no portfolio"
          }
          color="blue"
          href={`/app/properties`}
        />

        <StatCard
          icon={DollarSign}
          label="Orcamento"
          value={
            costs.total_planned > 0 ? Math.round(insights.budgetPercent) : null
          }
          valueSuffix="%"
          subtitle={
            costs.total_planned > 0
              ? `${formatCurrency(costs.total_paid)} de ${formatCurrency(costs.total_planned)}`
              : "Adicione custos"
          }
          color={
            insights.budgetPercent > 100
              ? "red"
              : insights.budgetPercent > 90
                ? "amber"
                : "emerald"
          }
          progress={
            costs.total_planned > 0
              ? Math.min(insights.budgetPercent, 100)
              : undefined
          }
          href={`/app/costs`}
        />

        <StatCard
          icon={Calendar}
          label="Cronograma"
          value={
            schedule.total_items > 0 ? Math.round(insights.schedulePercent) : null
          }
          valueSuffix="%"
          subtitle={
            schedule.total_items > 0
              ? `${schedule.completed_items}/${schedule.total_items} tarefas`
              : "Sem tarefas"
          }
          color="violet"
          progress={schedule.total_items > 0 ? insights.schedulePercent : undefined}
          href={`/app/schedule`}
        />

        <StatCard
          icon={insights.overdueTotal > 0 ? AlertTriangle : Trophy}
          label="Status"
          value={insights.overdueTotal > 0 ? insights.overdueTotal : null}
          customValue={insights.overdueTotal === 0 ? "OK" : undefined}
          subtitle={
            insights.overdueTotal > 0 ? "precisam de atencao" : "Tudo em dia!"
          }
          color={insights.overdueTotal > 0 ? "red" : "emerald"}
          href={insights.overdueTotal > 0 ? `/app/costs` : undefined}
          celebration={insights.overdueTotal === 0}
        />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Pipeline - Redesigned */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-3"
        >
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
            {/* Decorative gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />

            <div className="relative flex items-center justify-between border-b border-border p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Pipeline de Imoveis</h3>
                  <p className="text-sm text-muted-foreground">
                    {properties.total} imoveis no fluxo
                  </p>
                </div>
              </div>
              <Link
                href={`/app/properties`}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Ver todos
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="relative p-5">
              <div className="space-y-2">
                {pipelineData.map((item, index) => (
                  <motion.div
                    key={item.status}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
                  >
                    <Link
                      href={`/app/properties?status=${item.status}`}
                      className="group flex items-center gap-4 rounded-xl p-2 transition-colors hover:bg-muted/50"
                    >
                      {/* Status indicator dot */}
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          item.count > 0
                            ? `bg-gradient-to-r ${item.gradient}`
                            : "bg-muted-foreground/20"
                        )}
                      />

                      <div className="w-24 shrink-0">
                        <span
                          className={cn(
                            "text-sm font-medium transition-colors",
                            item.count > 0
                              ? item.color
                              : "text-muted-foreground/50"
                          )}
                        >
                          {item.label}
                        </span>
                      </div>

                      <div className="relative h-9 flex-1 overflow-hidden rounded-lg bg-muted/30">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.max(item.width, item.count > 0 ? 12 : 0)}%`,
                          }}
                          transition={{
                            duration: 0.6,
                            delay: 0.4 + index * 0.05,
                            ease: "easeOut",
                          }}
                          className={cn(
                            "absolute inset-y-0 left-0 rounded-lg bg-gradient-to-r shadow-sm transition-all group-hover:shadow-md",
                            item.gradient
                          )}
                        />

                        {item.count > 0 && (
                          <div className="absolute inset-y-0 left-3 flex items-center">
                            <span className="text-sm font-bold text-white drop-shadow-sm">
                              {item.count}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="w-10 text-right">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                            item.count > 0
                              ? `${item.bgLight} ${item.color}`
                              : "text-muted-foreground/30"
                          )}
                        >
                          {item.count}
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Quick Add - Gradient button */}
              <div className="mt-5 border-t border-border pt-5">
                <Link href={`/app/prospects`}>
                  <Button className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-md hover:shadow-lg">
                    <Plus className="h-4 w-4" />
                    Adicionar novo lead
                    <Sparkles className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action Center - Redesigned */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="lg:col-span-2"
        >
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
            {/* Decorative gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-emerald-500/5" />

            <div className="relative flex items-center justify-between border-b border-border p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                  <Zap className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Central de Acoes</h3>
                  <p className="text-sm text-muted-foreground">Proximos passos</p>
                </div>
              </div>
            </div>

            <div className="relative p-5">
              {urgentItems.overdue.length > 0 ||
              urgentItems.today.length > 0 ||
              urgentItems.thisWeek.length > 0 ? (
                <div className="space-y-5">
                  {urgentItems.overdue.length > 0 && (
                    <UrgencySection
                      title="Em atraso"
                      icon={Flame}
                      items={urgentItems.overdue}
                      variant="danger"
                    />
                  )}

                  {urgentItems.today.length > 0 && (
                    <UrgencySection
                      title="Hoje"
                      icon={Zap}
                      items={urgentItems.today}
                      variant="warning"
                    />
                  )}

                  {urgentItems.thisWeek.length > 0 && (
                    <UrgencySection
                      title="Esta semana"
                      icon={Clock}
                      items={urgentItems.thisWeek.slice(0, 3)}
                      variant="info"
                    />
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      delay: 0.3,
                    }}
                    className="relative"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30">
                      <CheckCircle2 className="h-8 w-8 text-white" />
                    </div>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5 }}
                      className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-amber-900"
                    >
                      <Sparkles className="h-3 w-3" />
                    </motion.div>
                  </motion.div>
                  <h4 className="mt-4 text-lg font-semibold">Tudo em dia!</h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Nenhuma tarefa ou custo pendente
                  </p>
                  <Link href={`/app/schedule`} className="mt-4">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Plus className="h-3 w-3" />
                      Criar tarefa
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Stat Card Component - Redesigned
function StatCard({
  icon: Icon,
  label,
  value,
  valueSuffix,
  customValue,
  subtitle,
  color,
  progress,
  href,
  celebration,
}: {
  icon: typeof Building2;
  label: string;
  value: number | null;
  valueSuffix?: string;
  customValue?: string;
  subtitle: string;
  color: "blue" | "emerald" | "violet" | "amber" | "red";
  progress?: number;
  href?: string;
  celebration?: boolean;
}) {
  const colorStyles = {
    blue: {
      gradient: "from-blue-500/20 via-blue-500/10 to-transparent",
      iconBg: "bg-blue-500/10",
      iconText: "text-blue-600 dark:text-blue-400",
      valueText: "text-blue-600 dark:text-blue-400",
      progressBg: "bg-blue-500",
      glow: "shadow-blue-500/20",
    },
    emerald: {
      gradient: "from-emerald-500/20 via-emerald-500/10 to-transparent",
      iconBg: "bg-emerald-500/10",
      iconText: "text-emerald-600 dark:text-emerald-400",
      valueText: "text-emerald-600 dark:text-emerald-400",
      progressBg: "bg-emerald-500",
      glow: "shadow-emerald-500/20",
    },
    violet: {
      gradient: "from-violet-500/20 via-violet-500/10 to-transparent",
      iconBg: "bg-violet-500/10",
      iconText: "text-violet-600 dark:text-violet-400",
      valueText: "text-violet-600 dark:text-violet-400",
      progressBg: "bg-violet-500",
      glow: "shadow-violet-500/20",
    },
    amber: {
      gradient: "from-amber-500/20 via-amber-500/10 to-transparent",
      iconBg: "bg-amber-500/10",
      iconText: "text-amber-600 dark:text-amber-400",
      valueText: "text-amber-600 dark:text-amber-400",
      progressBg: "bg-amber-500",
      glow: "shadow-amber-500/20",
    },
    red: {
      gradient: "from-red-500/20 via-red-500/10 to-transparent",
      iconBg: "bg-red-500/10",
      iconText: "text-red-600 dark:text-red-400",
      valueText: "text-red-600 dark:text-red-400",
      progressBg: "bg-red-500",
      glow: "shadow-red-500/20",
    },
  };

  const styles = colorStyles[color];

  const Content = (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all",
        href && "cursor-pointer hover:shadow-lg",
        href && styles.glow
      )}
    >
      {/* Background gradient */}
      <div
        className={cn("absolute inset-0 bg-gradient-to-br opacity-50", styles.gradient)}
      />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div className={cn("rounded-xl p-2.5", styles.iconBg)}>
            <Icon className={cn("h-5 w-5", styles.iconText)} />
          </div>
          {href && (
            <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          )}
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <div className="mt-1 flex items-baseline gap-1">
            {customValue ? (
              <span
                className={cn(
                  "text-3xl font-bold",
                  styles.valueText,
                  celebration && "animate-pulse"
                )}
              >
                {customValue}
              </span>
            ) : value !== null ? (
              <>
                <span className={cn("text-3xl font-bold tabular-nums", styles.valueText)}>
                  {value}
                </span>
                {valueSuffix && (
                  <span className={cn("text-lg font-semibold", styles.valueText)}>
                    {valueSuffix}
                  </span>
                )}
              </>
            ) : (
              <span className="text-3xl font-bold text-muted-foreground/50">—</span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {progress !== undefined && (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-muted/50">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                className={cn("h-full rounded-full", styles.progressBg)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{Content}</Link>;
  }

  return Content;
}

// Urgency Section Component
function UrgencySection({
  title,
  icon: Icon,
  items,
  variant,
}: {
  title: string;
  icon: typeof Flame;
  items: UpcomingItem[];
  variant: "danger" | "warning" | "info";
}) {
  const variantStyles = {
    danger: {
      bg: "bg-red-500/10",
      text: "text-red-600 dark:text-red-400",
      badge: "bg-red-500 text-white",
      border: "border-red-500/20",
    },
    warning: {
      bg: "bg-amber-500/10",
      text: "text-amber-600 dark:text-amber-400",
      badge: "bg-amber-500 text-white",
      border: "border-amber-500/20",
    },
    info: {
      bg: "bg-blue-500/10",
      text: "text-blue-600 dark:text-blue-400",
      badge: "bg-blue-500 text-white",
      border: "border-blue-500/20",
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className={cn("rounded-xl border p-3", styles.border, styles.bg)}>
      <div className="mb-2 flex items-center gap-2">
        <Icon className={cn("h-4 w-4", styles.text)} />
        <span className={cn("text-sm font-semibold", styles.text)}>{title}</span>
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", styles.badge)}>
          {items.length}
        </span>
      </div>

      <div className="space-y-1">
        {items.map((item) => (
          <ActionItem key={`${item.type}-${item.id}`} item={item} />
        ))}
      </div>
    </div>
  );
}

// Action Item Component
function ActionItem({ item }: { item: UpcomingItem }) {
  const href = item.type === "cost" ? `/app/costs` : `/app/schedule`;
  const Icon = item.type === "cost" ? DollarSign : Calendar;

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg bg-background/50 px-3 py-2 transition-colors hover:bg-background"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.title}</p>
        <p className="truncate text-xs text-muted-foreground">{item.property_name}</p>
      </div>
      {item.type === "cost" && item.amount && item.amount > 0 && (
        <span className="shrink-0 text-xs font-bold tabular-nums text-muted-foreground">
          {formatCurrency(item.amount)}
        </span>
      )}
    </Link>
  );
}
