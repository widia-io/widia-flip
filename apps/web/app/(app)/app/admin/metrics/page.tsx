import type { AdminSaaSMetricsPeriod } from "@widia/shared";

import { getAdminSaaSMetrics } from "@/lib/actions/admin";

import { MetricsDashboard } from "./MetricsDashboard";

interface Props {
  searchParams: Promise<{ period?: string }>;
}

export default async function AdminMetricsPage({ searchParams }: Props) {
  const params = await searchParams;
  const period = (params.period || "30d") as AdminSaaSMetricsPeriod;
  const validPeriods = ["30d", "90d", "all"];
  const validPeriod = validPeriods.includes(period) ? period : "30d";

  const metrics = await getAdminSaaSMetrics(validPeriod);

  return <MetricsDashboard metrics={metrics} />;
}
