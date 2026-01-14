"use client";

import { useMemo } from "react";
import { Building2, Hammer, Tag, CheckCircle2 } from "lucide-react";

import type { Property } from "@widia/shared";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PropertyStatsHeaderProps {
  properties: Property[];
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  colorClass?: string;
}

function StatCard({ label, value, icon: Icon, colorClass }: StatCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              colorClass ?? "bg-muted"
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className="text-3xl font-bold tabular-nums">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PropertyStatsHeader({ properties }: PropertyStatsHeaderProps) {
  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {};

    for (const p of properties) {
      byStatus[p.status_pipeline] = (byStatus[p.status_pipeline] || 0) + 1;
    }

    return {
      total: properties.length,
      renovation: byStatus.renovation || 0,
      for_sale: byStatus.for_sale || 0,
      sold: byStatus.sold || 0,
    };
  }, [properties]);

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total Imoveis"
        value={stats.total}
        icon={Building2}
        colorClass="bg-slate-500/10 text-slate-600 dark:text-slate-400"
      />
      <StatCard
        label="Em Obra"
        value={stats.renovation}
        icon={Hammer}
        colorClass="bg-orange-500/10 text-orange-600 dark:text-orange-400"
      />
      <StatCard
        label="A Venda"
        value={stats.for_sale}
        icon={Tag}
        colorClass="bg-purple-500/10 text-purple-600 dark:text-purple-400"
      />
      <StatCard
        label="Vendidos"
        value={stats.sold}
        icon={CheckCircle2}
        colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      />
    </div>
  );
}
