import type { AdminSaaSMetricsPeriod } from "@widia/shared";

import { getAdminSaaSMetrics, getAdminFunnelDaily } from "@/lib/actions/admin";

import { MetricsDashboard } from "./MetricsDashboard";

interface Props {
  searchParams: Promise<{ period?: string }>;
}

export default async function AdminMetricsPage({ searchParams }: Props) {
  const params = await searchParams;
  const period = (params.period || "30d") as AdminSaaSMetricsPeriod;
  const validPeriods = ["30d", "90d", "all"];
  const validPeriod = validPeriods.includes(period) ? period : "30d";
  const funnelDays = validPeriod === "90d" || validPeriod === "all" ? 90 : 30;

  const [metrics, funnel] = await Promise.all([
    getAdminSaaSMetrics(validPeriod),
    getAdminFunnelDaily(funnelDays),
  ]);

  return <MetricsDashboard metrics={metrics} funnel={funnel} />;
}
