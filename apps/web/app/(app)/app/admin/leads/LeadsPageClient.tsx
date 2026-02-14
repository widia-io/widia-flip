"use client";

import { useEffect } from "react";
import { BookOpen, Calculator, TrendingUp, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";
import type { AdminCalculatorLead, AdminEbookLead } from "@widia/shared";

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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function formatWhatsApp(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return raw;
}

interface LeadsPageClientProps {
  ebookLeads: AdminEbookLead[];
  ebookTotal: number;
  calculatorLeads: AdminCalculatorLead[];
  calculatorTotal: number;
  reconciled: number;
}

export function LeadsPageClient({
  ebookLeads,
  ebookTotal,
  calculatorLeads,
  calculatorTotal,
  reconciled,
}: LeadsPageClientProps) {
  const convertedCount = ebookLeads.filter((l) => l.convertedAt).length;
  const conversionRate = ebookTotal > 0 ? ((convertedCount / ebookTotal) * 100).toFixed(1) : "0";
  const hotCalculatorLeads = calculatorLeads.filter(
    (lead) => !lead.isPartial && lead.roi >= 20 && lead.netProfit > 0,
  ).length;

  useEffect(() => {
    if (reconciled > 0) {
      toast.success(`${reconciled} lead${reconciled > 1 ? "s" : ""} reconciliado${reconciled > 1 ? "s" : ""}`);
    }
  }, [reconciled]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leads Capturados</h1>
        <p className="text-muted-foreground">
          Ebook + calculadora de viabilidade em um painel unico
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ebook Leads</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ebookTotal}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ebook Convertidos</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{convertedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">{conversionRate}% de conversao</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Leads Calculadora</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calculatorTotal}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Leads Quentes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hotCalculatorLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">ROI {">="} 20% e lucro positivo</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ebook Leads</CardTitle>
          <CardDescription>
            Ultimos 200 leads ordenados por data de cadastro
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ebookLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Nenhum lead de ebook capturado</p>
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
                {ebookLeads.map((lead) => (
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

      <Card>
        <CardHeader>
          <CardTitle>Leads da Calculadora</CardTitle>
          <CardDescription>
            Contatos que solicitaram o relatorio completo da calculadora
          </CardDescription>
        </CardHeader>
        <CardContent>
          {calculatorLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Nenhum lead da calculadora capturado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Email MKT</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>ROI</TableHead>
                  <TableHead>Lucro Liquido</TableHead>
                  <TableHead>Investimento</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calculatorLeads.map((lead) => {
                  const hot = !lead.isPartial && lead.roi >= 20 && lead.netProfit > 0;
                  const warm = !lead.isPartial && !hot && lead.roi > 0;

                  return (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm">{lead.email}</p>
                          <p className="text-xs text-muted-foreground">{formatWhatsApp(lead.whatsapp)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={lead.marketingConsent ? "default" : "secondary"}>
                          {lead.marketingConsent ? "Sim" : "Nao"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {lead.isPartial ? (
                          <Badge variant="outline">Incompleto</Badge>
                        ) : hot ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Quente</Badge>
                        ) : warm ? (
                          <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">Morno</Badge>
                        ) : (
                          <Badge variant="secondary">Frio</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatPercent(lead.roi)}</TableCell>
                      <TableCell>{formatCurrency(lead.netProfit)}</TableCell>
                      <TableCell>{formatCurrency(lead.investmentTotal)}</TableCell>
                      <TableCell>{formatDate(lead.createdAt)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
