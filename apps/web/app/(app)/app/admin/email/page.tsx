import Link from "next/link";
import { ChevronLeft, Mail, Plus, Users } from "lucide-react";

import { listEmailCampaigns, getEligibleRecipientsCount, listEligibleRecipients } from "@/lib/actions/email";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  queued: { label: "Na fila", variant: "outline" },
  sending: { label: "Enviando", variant: "default" },
  sent: { label: "Enviado", variant: "default" },
};

export default async function AdminEmailPage() {
  const [{ items: campaigns }, { eligibleCount }, { items: recipients }] = await Promise.all([
    listEmailCampaigns(),
    getEligibleRecipientsCount(),
    listEligibleRecipients(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/app/admin"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Admin
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Marketing</h1>
          <p className="text-muted-foreground">
            Envie campanhas para usuarios que optaram por receber novidades
          </p>
        </div>
        <Button asChild>
          <Link href="/app/admin/email/new">
            <Plus className="mr-2 h-4 w-4" />
            Nova Campanha
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Destinatarios elegiveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{eligibleCount}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Usuarios com opt-in ativo e email verificado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Campanhas criadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{campaigns.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Enviados este mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">
                {campaigns.filter((c) => c.status === "sent").reduce((sum, c) => sum + c.recipientCount, 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns list */}
      <Card>
        <CardHeader>
          <CardTitle>Campanhas</CardTitle>
          <CardDescription>
            Historico de campanhas de email marketing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Mail className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Nenhuma campanha criada</p>
              <Button asChild className="mt-4" size="sm">
                <Link href="/app/admin/email/new">Criar primeira campanha</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {campaigns.map((campaign) => {
                const statusInfo = statusLabels[campaign.status] ?? { label: campaign.status, variant: "secondary" as const };
                return (
                  <Link
                    key={campaign.id}
                    href={`/app/admin/email/${campaign.id}`}
                    className="flex items-center justify-between py-4 hover:bg-muted/50 -mx-4 px-4 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{campaign.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        Criado em {new Date(campaign.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{campaign.recipientCount} destinatarios</span>
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Eligible recipients list */}
      <Card>
        <CardHeader>
          <CardTitle>Destinatários Elegíveis</CardTitle>
          <CardDescription>
            Usuários que optaram por receber emails e têm email verificado (máx. 500)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recipients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Nenhum destinatário elegível</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Usuários precisam ter email verificado e aceitar marketing
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Opt-in em</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.map((recipient) => (
                  <TableRow key={recipient.id}>
                    <TableCell className="font-medium">{recipient.name || "—"}</TableCell>
                    <TableCell>{recipient.email}</TableCell>
                    <TableCell>{new Date(recipient.optInAt).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>{new Date(recipient.createdAt).toLocaleDateString("pt-BR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
