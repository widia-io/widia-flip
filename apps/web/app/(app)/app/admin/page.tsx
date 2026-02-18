import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  Camera,
  HardDrive,
  Home,
  Mail,
  Megaphone,
  Play,
  Search,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";

import { getAdminStats } from "@/lib/actions/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatLabel(raw: string): string {
  return raw.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

const MODULES = [
  {
    title: "SaaS Metrics",
    description: "Funil, conversão e MRR",
    href: "/app/admin/metrics",
    icon: BarChart3,
    group: "Receita",
    accent: "text-emerald-600",
  },
  {
    title: "Usuários",
    description: "Perfis, tiers e status",
    href: "/app/admin/users",
    icon: Users,
    group: "Core",
    accent: "text-blue-600",
  },
  {
    title: "Job Runs",
    description: "Execuções internas e fila",
    href: "/app/admin/job-runs",
    icon: Sparkles,
    group: "Operação",
    accent: "text-indigo-600",
  },
  {
    title: "Scraper",
    description: "Coleta e gestão de oportunidades",
    href: "/app/admin/opportunities",
    icon: Play,
    group: "Operação",
    accent: "text-violet-600",
  },
  {
    title: "Leads",
    description: "Ebook + calculadora em um só lugar",
    href: "/app/admin/leads",
    icon: BookOpen,
    group: "Growth",
    accent: "text-orange-600",
  },
  {
    title: "Email Marketing",
    description: "Campanhas e entregabilidade",
    href: "/app/admin/email",
    icon: Mail,
    group: "Growth",
    accent: "text-rose-600",
  },
  {
    title: "Promoções",
    description: "Banners e cupons ativos",
    href: "/app/admin/promotions",
    icon: Megaphone,
    group: "Growth",
    accent: "text-amber-600",
  },
  {
    title: "Ebooks",
    description: "Upload e ativos de captura",
    href: "/app/admin/ebooks",
    icon: Upload,
    group: "Growth",
    accent: "text-cyan-600",
  },
] as const;

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();

  const totalSnapshots = stats.snapshots.cash + stats.snapshots.financing;
  const topUserTiers = Object.entries(stats.users.byTier)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const propertyStatuses = Object.entries(stats.properties.byStatus)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const prospectStatuses = Object.entries(stats.prospects.byStatus)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-gradient-to-br from-background via-background to-muted/30 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Painel Administrativo
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Centro de operação
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Visão consolidada da plataforma para decisões rápidas: receita, growth, operações e qualidade da base.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{MODULES.length} módulos</Badge>
            <Badge variant="outline">{stats.users.total} usuários</Badge>
            <Badge variant="outline">{stats.workspaces.total} workspaces</Badge>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="flex items-start justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">Usuários</p>
                <p className="mt-1 text-2xl font-semibold">{stats.users.total}</p>
              </div>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">Imóveis</p>
                <p className="mt-1 text-2xl font-semibold">{stats.properties.total}</p>
              </div>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">Snapshots</p>
                <p className="mt-1 text-2xl font-semibold">{totalSnapshots}</p>
              </div>
              <Camera className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">Storage</p>
                <p className="mt-1 text-2xl font-semibold">{formatBytes(stats.storage.totalBytes)}</p>
                <p className="text-xs text-muted-foreground">{stats.storage.totalFiles} arquivos</p>
              </div>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Acessos rápidos</h2>
          <p className="text-xs text-muted-foreground">Organizado por domínio</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.href}
                href={module.href}
                className="group rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <Badge variant="secondary" className="text-[10px]">
                    {module.group}
                  </Badge>
                  <Icon className={cn("h-4 w-4", module.accent)} />
                </div>
                <h3 className="mt-3 text-sm font-semibold">{module.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{module.description}</p>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                  Abrir
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-muted-foreground" />
              Distribuição de usuários
            </CardTitle>
            <CardDescription>Top tiers por volume</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {topUserTiers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados de tiers.</p>
            ) : (
              topUserTiers.map(([tier, count]) => (
                <div key={tier} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-sm capitalize">{tier}</span>
                  <span className="text-sm font-semibold">{count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Pipeline de imóveis
            </CardTitle>
            <CardDescription>Status mais frequentes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {propertyStatuses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem imóveis cadastrados.</p>
            ) : (
              propertyStatuses.map(([status, count]) => (
                <div key={status} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-sm">{formatLabel(status)}</span>
                  <span className="text-sm font-semibold">{count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4 text-muted-foreground" />
              Funil de prospecção
            </CardTitle>
            <CardDescription>Leads por status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {prospectStatuses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem prospects ativos.</p>
            ) : (
              prospectStatuses.map(([status, count]) => (
                <div key={status} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-sm capitalize">{status}</span>
                  <span className="text-sm font-semibold">{count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
