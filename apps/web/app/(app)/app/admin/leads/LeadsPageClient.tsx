"use client";

import { useEffect } from "react";
import { BookOpen, Users, UserCheck, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import type { AdminEbookLead } from "@widia/shared";

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface LeadsPageClientProps {
  leads: AdminEbookLead[];
  total: number;
  reconciled: number;
}

export function LeadsPageClient({ leads, total, reconciled }: LeadsPageClientProps) {
  const convertedCount = leads.filter((l) => l.convertedAt).length;
  const conversionRate = total > 0 ? ((convertedCount / total) * 100).toFixed(1) : "0";

  useEffect(() => {
    if (reconciled > 0) {
      toast.success(`${reconciled} lead${reconciled > 1 ? "s" : ""} reconciliado${reconciled > 1 ? "s" : ""}`);
    }
  }, [reconciled]);

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">Ebook Leads</h1>
        <p className="text-muted-foreground">
          {total} leads capturados via landing page de ebooks
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Convertidos</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{convertedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversao</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leads</CardTitle>
          <CardDescription>
            Ultimos 200 leads ordenados por data de cadastro
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Nenhum lead capturado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ebook</TableHead>
                  <TableHead>Consent</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.email}</TableCell>
                    <TableCell>
                      {lead.convertedAt ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          Convertido
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Lead</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{lead.ebookSlug}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={lead.marketingConsent ? "default" : "secondary"}>
                        {lead.marketingConsent ? "Sim" : "Nao"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {lead.ipAddress || "\u2014"}
                    </TableCell>
                    <TableCell>{formatDate(lead.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
