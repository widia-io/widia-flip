"use client";

import Link from "next/link";
import { LineChart, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function SnapshotsEmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center py-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <LineChart className="h-8 w-8 text-primary" />
        </div>

        <h2 className="text-xl font-semibold">Nenhuma análise salva</h2>

        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Snapshots preservam suas análises de viabilidade para comparar cenários e
          acompanhar a evolução do investimento ao longo do tempo.
        </p>

        <div className="mt-6 flex flex-col gap-2 text-left text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-primary">1.</span>
            <span>Vá até um imóvel e acesse a aba &quot;À Vista&quot; ou &quot;Financiamento&quot;</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-primary">2.</span>
            <span>Preencha os dados da análise</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-primary">3.</span>
            <span>Clique em &quot;Salvar Análise&quot; para criar um snapshot</span>
          </div>
        </div>

        <Button asChild className="mt-6">
          <Link href="/app/properties">
            <Building2 className="mr-2 h-4 w-4" />
            Ver imóveis
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
