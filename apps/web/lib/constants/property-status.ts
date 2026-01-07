import {
  Search,
  BarChart3,
  Home,
  Hammer,
  Tag,
  CheckCircle2,
  Archive,
  type LucideIcon,
} from "lucide-react";

export interface StatusConfig {
  label: string;
  variant: "default" | "secondary" | "outline" | "destructive";
  icon: LucideIcon;
  color: string;
  textColor: string;
  progressIndex: number;
}

export const PROPERTY_STATUS_CONFIG: Record<string, StatusConfig> = {
  prospecting: {
    label: "Prospecção",
    variant: "outline",
    icon: Search,
    color: "bg-slate-100 dark:bg-slate-800",
    textColor: "text-slate-600 dark:text-slate-400",
    progressIndex: 0,
  },
  analyzing: {
    label: "Analisando",
    variant: "secondary",
    icon: BarChart3,
    color: "bg-blue-100 dark:bg-blue-900/30",
    textColor: "text-blue-600 dark:text-blue-400",
    progressIndex: 1,
  },
  bought: {
    label: "Comprado",
    variant: "default",
    icon: Home,
    color: "bg-green-100 dark:bg-green-900/30",
    textColor: "text-green-600 dark:text-green-400",
    progressIndex: 2,
  },
  renovation: {
    label: "Em Obra",
    variant: "secondary",
    icon: Hammer,
    color: "bg-orange-100 dark:bg-orange-900/30",
    textColor: "text-orange-600 dark:text-orange-400",
    progressIndex: 3,
  },
  for_sale: {
    label: "À Venda",
    variant: "outline",
    icon: Tag,
    color: "bg-purple-100 dark:bg-purple-900/30",
    textColor: "text-purple-600 dark:text-purple-400",
    progressIndex: 4,
  },
  sold: {
    label: "Vendido",
    variant: "default",
    icon: CheckCircle2,
    color: "bg-emerald-100 dark:bg-emerald-900/30",
    textColor: "text-emerald-600 dark:text-emerald-400",
    progressIndex: 5,
  },
  archived: {
    label: "Arquivado",
    variant: "secondary",
    icon: Archive,
    color: "bg-gray-100 dark:bg-gray-800",
    textColor: "text-gray-500 dark:text-gray-400",
    progressIndex: 6,
  },
};

export const PIPELINE_STAGES = [
  "prospecting",
  "analyzing",
  "bought",
  "renovation",
  "for_sale",
  "sold",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export function getStatusConfig(status: string): StatusConfig {
  return (
    PROPERTY_STATUS_CONFIG[status] ?? {
      label: status,
      variant: "secondary" as const,
      icon: Search,
      color: "bg-gray-100",
      textColor: "text-gray-500",
      progressIndex: 0,
    }
  );
}
