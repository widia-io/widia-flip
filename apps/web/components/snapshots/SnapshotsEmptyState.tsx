"use client";

import Link from "next/link";
import {
  LineChart,
  Building2,
  Calculator,
  Save,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function SnapshotsEmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center py-16 text-center">
        {/* Main Icon */}
        <div className="relative mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            <LineChart className="h-10 w-10 text-primary" />
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-lg bg-muted border-2 border-background">
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Title & Description */}
        <h2 className="text-xl font-bold tracking-tight">Nenhuma análise salva</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
          Snapshots preservam suas análises de viabilidade para comparar cenários e
          acompanhar a evolução do investimento ao longo do tempo.
        </p>

        {/* Steps */}
        <div className="mt-8 flex flex-col gap-3 max-w-sm w-full">
          <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">Acesse um imóvel</p>
              <p className="text-xs text-muted-foreground">
                Vá até a aba &quot;À Vista&quot; ou &quot;Financiamento&quot;
              </p>
            </div>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
              1
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
              <Calculator className="h-4 w-4 text-amber-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">Preencha os dados</p>
              <p className="text-xs text-muted-foreground">
                Configure preços, custos e parâmetros
              </p>
            </div>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
              2
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
              <Save className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">Salve a análise</p>
              <p className="text-xs text-muted-foreground">
                Clique em &quot;Salvar Análise&quot; para criar um snapshot
              </p>
            </div>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
              3
            </div>
          </div>
        </div>

        {/* CTA */}
        <Button asChild size="lg" className="mt-8 gap-2">
          <Link href="/app/properties">
            <Building2 className="h-4 w-4" />
            Ver imóveis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
