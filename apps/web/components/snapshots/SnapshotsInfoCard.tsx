"use client";

import { useState, useEffect } from "react";
import { X, Lightbulb } from "lucide-react";
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
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex items-start gap-4 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Lightbulb className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium">Central de Análises</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Aqui você encontra todas as análises salvas do seu workspace. Use os filtros
            para encontrar rapidamente uma análise específica, ou clique em uma linha
            para ver os detalhes completos.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </Button>
      </CardContent>
    </Card>
  );
}
