import Link from "next/link";
import { ChevronLeft, Mail, MousePointerClick, Eye, AlertTriangle, Ban } from "lucide-react";
import { notFound } from "next/navigation";

import { getEmailCampaign, getEligibleRecipientsCount, getCampaignStats } from "@/lib/actions/email";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CampaignActions } from "./CampaignActions";
import { CampaignPreview } from "./CampaignPreview";
import type { CampaignStatsResponse } from "@widia/shared";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  queued: { label: "Na fila", variant: "outline" },
  sending: { label: "Enviando", variant: "default" },
  sent: { label: "Enviado", variant: "default" },
};

export default async function CampaignDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  let campaign;
  let eligibleCount = 0;
  let stats: CampaignStatsResponse | null = null;

  try {
    [campaign, { eligibleCount }] = await Promise.all([
      getEmailCampaign(id),
      getEligibleRecipientsCount(),
    ]);

    // Fetch stats only for sent/sending campaigns
    if (campaign.status === "sent" || campaign.status === "sending") {
      try {
        stats = await getCampaignStats(id);
      } catch {
        // Stats not available yet
      }
    }
  } catch {
    notFound();
  }

  const statusInfo = statusLabels[campaign.status] ?? { label: campaign.status, variant: "secondary" as const };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/app/admin/email"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Email Marketing
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{campaign.subject}</h1>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
          <p className="mt-1 text-muted-foreground">
            Criado em {new Date(campaign.createdAt).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conteudo</CardTitle>
              <CardDescription>Preview do email</CardDescription>
            </CardHeader>
            <CardContent>
              <CampaignPreview html={campaign.bodyHtml} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Acoes</CardTitle>
            </CardHeader>
            <CardContent>
              <CampaignActions
                campaignId={campaign.id}
                status={campaign.status}
                eligibleCount={eligibleCount}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estatisticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Destinatarios</span>
                <span className="font-medium">{campaign.recipientCount}</span>
              </div>
              {campaign.queuedAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Na fila em</span>
                  <span className="font-medium">
                    {new Date(campaign.queuedAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
              {campaign.sentAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Enviado em</span>
                  <span className="font-medium">
                    {new Date(campaign.sentAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Analytics - only show for sent/sending campaigns */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle>Analytics</CardTitle>
                <CardDescription>Metricas de engajamento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Key metrics grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="text-xs">Entregues</span>
                    </div>
                    <p className="mt-1 text-xl font-semibold">{stats.delivered}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Eye className="h-4 w-4" />
                      <span className="text-xs">Aberturas</span>
                    </div>
                    <p className="mt-1 text-xl font-semibold">{stats.opened}</p>
                    <p className="text-xs text-muted-foreground">{stats.openRate}%</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MousePointerClick className="h-4 w-4" />
                      <span className="text-xs">Cliques</span>
                    </div>
                    <p className="mt-1 text-xl font-semibold">{stats.clicked}</p>
                    <p className="text-xs text-muted-foreground">{stats.clickRate}%</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-xs">Bounces</span>
                    </div>
                    <p className="mt-1 text-xl font-semibold">{stats.bounced}</p>
                  </div>
                </div>

                {/* Warnings for complaints */}
                {stats.complained > 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    <Ban className="h-4 w-4" />
                    <span>{stats.complained} reclamacao(s) de spam</span>
                  </div>
                )}

                {/* Progress bar for delivery */}
                {stats.sent > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Taxa de entrega</span>
                      <span>{Math.round((stats.delivered / stats.sent) * 100)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-green-500"
                        style={{ width: `${(stats.delivered / stats.sent) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
