"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, GitCompare, Filter, MousePointerClick } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "widia_snapshots_info_dismissed";

export function SnapshotsInfoCard() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-orange-500/5 overflow-hidden">
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Sparkles className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">Dica: Central de Análises</h3>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              Todas as análises de viabilidade salvas aparecem aqui. Explore as funcionalidades:
            </p>
            <div className="mt-3 flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-500/10">
                  <Filter className="h-3 w-3 text-blue-600" />
                </div>
                <span>Filtre por tipo ou status</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-purple-500/10">
                  <GitCompare className="h-3 w-3 text-purple-600" />
                </div>
                <span>Selecione 2 para comparar</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-green-500/10">
                  <MousePointerClick className="h-3 w-3 text-green-600" />
                </div>
                <span>Clique para ver detalhes</span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
