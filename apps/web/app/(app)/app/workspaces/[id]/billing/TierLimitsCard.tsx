import { type UserEntitlements } from "@widia/shared";
import { Briefcase, FileText, Camera, Users } from "lucide-react";

interface TierLimitsCardProps {
  entitlements: UserEntitlements | null;
}

export function TierLimitsCard({ entitlements }: TierLimitsCardProps) {
  if (!entitlements) {
    return (
      <div className="text-sm text-muted-foreground">
        Não foi possível carregar limites do plano.
      </div>
    );
  }

  const { limits, can_access_financing, can_access_flip_score_v1 } = entitlements;

  const limitItems = [
    {
      icon: Briefcase,
      label: "Projetos",
      value: limits.max_workspaces,
      suffix: "projetos ativos",
    },
    {
      icon: Users,
      label: "Prospects",
      value: limits.max_prospects_per_month,
      suffix: "por mês",
    },
    {
      icon: Camera,
      label: "Snapshots",
      value: limits.max_snapshots_per_month,
      suffix: "por mês",
    },
    {
      icon: FileText,
      label: "Documentos",
      value: limits.max_docs_per_month,
      suffix: "por mês",
    },
  ];

  const features = [
    { label: "Financiamento", enabled: can_access_financing },
    { label: "Flip Score v1", enabled: can_access_flip_score_v1 },
  ];

  return (
    <div className="space-y-4">
      {/* Limits Grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {limitItems.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 rounded-lg border p-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <item.icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">
                Até <span className="font-semibold text-foreground">{item.value}</span> {item.suffix}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Feature Access */}
      <div className="border-t pt-4">
        <p className="mb-2 text-sm font-medium">Recursos Avançados</p>
        <div className="flex flex-wrap gap-2">
          {features.map((feature) => (
            <span
              key={feature.label}
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                feature.enabled
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {feature.enabled ? "✓" : "✗"} {feature.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
