import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { getEmailCampaign, getEligibleRecipientsCount } from "@/lib/actions/email";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CampaignActions } from "./CampaignActions";
import { CampaignPreview } from "./CampaignPreview";

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

  try {
    [campaign, { eligibleCount }] = await Promise.all([
      getEmailCampaign(id),
      getEligibleRecipientsCount(),
    ]);
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
        </div>
      </div>
    </div>
  );
}
