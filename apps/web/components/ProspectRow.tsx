"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import type { Prospect } from "@widia/shared";

import {
  deleteProspectAction,
  convertProspectAction,
} from "@/lib/actions/prospects";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ProspectRowProps {
  prospect: Prospect;
  formatCurrency: (value: number | null | undefined) => string;
  formatArea: (value: number | null | undefined) => string;
  formatPricePerSqm: (value: number | null | undefined) => string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  active: { label: "Ativo", variant: "default" },
  discarded: { label: "Descartado", variant: "secondary" },
  converted: { label: "Convertido", variant: "outline" },
};

export function ProspectRow({
  prospect,
  formatCurrency,
  formatArea,
  formatPricePerSqm,
}: ProspectRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmConvert, setShowConfirmConvert] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      await deleteProspectAction(prospect.id);
      setShowConfirmDelete(false);
      router.refresh();
    });
  };

  const handleConvert = () => {
    startTransition(async () => {
      await convertProspectAction(prospect.id);
      setShowConfirmConvert(false);
    });
  };

  const isConverted = prospect.status === "converted";
  const status = statusConfig[prospect.status] ?? { label: prospect.status, variant: "secondary" as const };

  return (
    <TableRow>
      <TableCell>{prospect.neighborhood ?? "-"}</TableCell>
      <TableCell>{prospect.address ?? "-"}</TableCell>
      <TableCell className="text-right">{formatArea(prospect.area_usable)}</TableCell>
      <TableCell className="text-right">{formatCurrency(prospect.asking_price)}</TableCell>
      <TableCell className="text-right text-muted-foreground">
        {formatPricePerSqm(prospect.price_per_sqm)}
      </TableCell>
      <TableCell>
        <Badge variant={status.variant}>{status.label}</Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          {/* Convert button */}
          {!isConverted && (
            <>
              {showConfirmConvert ? (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    onClick={handleConvert}
                    disabled={isPending}
                  >
                    {isPending ? <Loader2 className="h-3 w-3 animate-spin text-primary-foreground" /> : "Sim"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowConfirmConvert(false)}
                    disabled={isPending}
                  >
                    Não
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowConfirmConvert(true)}
                  disabled={isPending}
                >
                  Converter
                </Button>
              )}
            </>
          )}

          {/* Delete button */}
          {showConfirmDelete ? (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="h-3 w-3 animate-spin text-destructive-foreground" /> : "Sim"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowConfirmDelete(false)}
                disabled={isPending}
              >
                Não
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowConfirmDelete(true)}
              disabled={isPending}
              className="text-muted-foreground hover:text-destructive"
            >
              Excluir
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
