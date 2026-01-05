"use client";

import { type WorkspaceUsageResponse, type UsageMetric } from "@widia/shared";
import { Users, Camera, FileText, AlertTriangle, Link2, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

interface UsageCardProps {
  usage: WorkspaceUsageResponse | null;
}

interface UsageBarProps {
  metric: UsageMetric;
  label: string;
  icon: React.ElementType;
  formatValue?: (value: number) => string;
}

function UsageBar({ metric, label, icon: Icon, formatValue }: UsageBarProps) {
  const percentage = metric.limit > 0 ? Math.min((metric.usage / metric.limit) * 100, 100) : 0;
  const isWarning = metric.at_80_percent;
  const isExceeded = metric.at_or_over_100;
  const displayUsage = formatValue ? formatValue(metric.usage) : String(metric.usage);
  const displayLimit = formatValue ? formatValue(metric.limit) : String(metric.limit);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{label}</span>
        </div>
        <span className={cn(
          "text-xs",
          isExceeded && "text-destructive font-medium",
          isWarning && !isExceeded && "text-amber-600 dark:text-amber-400 font-medium",
          !isWarning && !isExceeded && "text-muted-foreground"
        )}>
          {displayUsage} / {displayLimit}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            isExceeded && "bg-destructive",
            isWarning && !isExceeded && "bg-amber-500",
            !isWarning && !isExceeded && "bg-primary"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isExceeded && (
        <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
          <AlertTriangle className="h-3 w-3" />
          <span>Limite excedido neste ciclo</span>
        </div>
      )}
      {isWarning && !isExceeded && (
        <div className="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-3 w-3" />
          <span>Perto do limite ({Math.round(percentage)}%)</span>
        </div>
      )}
    </div>
  );
}

function formatPeriod(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  return `${start.toLocaleDateString("pt-BR", options)} - ${end.toLocaleDateString("pt-BR", options)}`;
}

export function UsageCard({ usage }: UsageCardProps) {
  if (!usage) {
    return (
      <div className="text-sm text-muted-foreground">
        Nao foi possivel carregar dados de uso.
      </div>
    );
  }

  const periodLabel = usage.period_type === "stripe_cycle"
    ? "Ciclo de cobranca Stripe"
    : "Mes corrente (calendario)";

  return (
    <div className="space-y-6">
      {/* Period info */}
      <div className="rounded-lg border bg-muted/50 px-3 py-2">
        <p className="text-xs text-muted-foreground">
          {periodLabel}: <span className="font-medium text-foreground">{formatPeriod(usage.period_start, usage.period_end)}</span>
        </p>
      </div>

      {/* Usage bars */}
      <div className="space-y-5">
        <UsageBar
          metric={usage.metrics.prospects}
          label="Prospects"
          icon={Users}
        />
        <UsageBar
          metric={usage.metrics.snapshots}
          label="Snapshots"
          icon={Camera}
        />
        <UsageBar
          metric={usage.metrics.documents}
          label="Documentos"
          icon={FileText}
        />
        <UsageBar
          metric={usage.metrics.url_imports}
          label="Importações URL"
          icon={Link2}
        />
        <UsageBar
          metric={usage.metrics.storage_bytes}
          label="Storage"
          icon={HardDrive}
          formatValue={formatBytes}
        />
      </div>

      {/* Info text */}
      <p className="text-xs text-muted-foreground">
        Prospects, snapshots, docs e importações reiniciam a cada ciclo. Storage é cumulativo.
      </p>
    </div>
  );
}
