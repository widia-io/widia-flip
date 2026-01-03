"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  ExternalLink,
  Bed,
  Bath,
  Car,
  Trash2,
  ArrowRightCircle,
  Eye,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

import type { Prospect } from "@widia/shared";

import {
  deleteProspectAction,
  convertProspectAction,
  restoreProspectAction,
} from "@/lib/actions/prospects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProspectViewModal } from "@/components/ProspectViewModal";
import { FlipScoreBadge } from "@/components/FlipScoreBadge";
import { Card } from "@/components/ui/card";

type SortOption = "score" | "recent" | "price" | "price_per_sqm";

interface ProspectTableProps {
  prospects: Prospect[];
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  canAccessFlipScoreV1?: boolean;
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  active: { label: "Ativo", variant: "default" },
  discarded: { label: "Descartado", variant: "secondary" },
  converted: { label: "Convertido", variant: "outline" },
};

export function ProspectTable({
  prospects,
  sortBy,
  onSortChange,
  canAccessFlipScoreV1 = false,
}: ProspectTableProps) {
  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "—";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatArea = (value: number | null | undefined) => {
    if (value == null) return "—";
    return `${value} m²`;
  };

  const SortableHeader = ({
    column,
    label,
    className,
  }: {
    column: SortOption;
    label: string;
    className?: string;
  }) => {
    const isActive = sortBy === column;
    return (
      <TableHead
        className={`cursor-pointer select-none transition-colors hover:bg-muted/50 ${className ?? ""}`}
        onClick={() => onSortChange(column)}
      >
        <div className="flex items-center gap-1">
          {label}
          {isActive ? (
            <ArrowDown className="h-3 w-3 text-primary" />
          ) : (
            <ArrowUp className="h-3 w-3 text-muted-foreground/40" />
          )}
        </div>
      </TableHead>
    );
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader column="score" label="Score" className="w-[90px]" />
              <TableHead>Bairro</TableHead>
              <SortableHeader column="price" label="Preço" className="text-right w-[120px]" />
              <SortableHeader column="price_per_sqm" label="R$/m²" className="text-right w-[100px]" />
              <TableHead className="text-right w-[80px]">Área</TableHead>
              <TableHead className="text-center w-[100px]">Quartos</TableHead>
              <TableHead className="text-center w-[100px]">Status</TableHead>
              <TableHead className="text-right w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prospects.map((prospect) => (
              <ProspectTableRow
                key={prospect.id}
                prospect={prospect}
                canAccessFlipScoreV1={canAccessFlipScoreV1}
                formatCurrency={formatCurrency}
                formatArea={formatArea}
              />
            ))}
          </TableBody>
        </Table>
      </Card>
    </TooltipProvider>
  );
}

interface ProspectTableRowProps {
  prospect: Prospect;
  canAccessFlipScoreV1: boolean;
  formatCurrency: (value: number | null | undefined) => string;
  formatArea: (value: number | null | undefined) => string;
}

function ProspectTableRow({
  prospect,
  canAccessFlipScoreV1,
  formatCurrency,
  formatArea,
}: ProspectTableRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirmConvert, setShowConfirmConvert] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteProspectAction(prospect.id);
      if (result.success) {
        toast.success("Lead excluído", {
          description: prospect.neighborhood || prospect.address || "Lead removido",
          action: {
            label: "Desfazer",
            onClick: async () => {
              const restoreResult = await restoreProspectAction(prospect.id);
              if (restoreResult.success) {
                toast.success("Lead restaurado");
                router.refresh();
              } else {
                toast.error("Erro ao restaurar", { description: restoreResult.error });
              }
            },
          },
          duration: 5000,
        });
        router.refresh();
      } else {
        toast.error("Erro ao excluir", { description: result.error });
      }
    });
  };

  const handleConvert = () => {
    startTransition(async () => {
      const result = await convertProspectAction(prospect.id);
      if (result.error) {
        toast.error("Erro ao converter", { description: result.error });
      }
      setShowConfirmConvert(false);
    });
  };

  const status = statusConfig[prospect.status] ?? {
    label: prospect.status,
    variant: "secondary" as const,
  };
  const isConverted = prospect.status === "converted";

  return (
    <>
      <TableRow className="group">
        {/* Flip Score */}
        <TableCell>
          <FlipScoreBadge
            score={prospect.flip_score}
            size="sm"
            version={prospect.flip_score_version ?? undefined}
          />
        </TableCell>

        {/* Bairro + Link */}
        <TableCell>
          <div className="flex items-center gap-2">
            <span className="font-medium truncate max-w-[200px]">
              {prospect.neighborhood || "Sem bairro"}
            </span>
            {prospect.link && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={prospect.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-muted-foreground hover:text-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>Abrir anúncio</TooltipContent>
              </Tooltip>
            )}
          </div>
        </TableCell>

        {/* Preço */}
        <TableCell className="text-right font-medium">
          {formatCurrency(prospect.asking_price)}
        </TableCell>

        {/* R$/m² */}
        <TableCell className="text-right text-muted-foreground">
          {formatCurrency(prospect.price_per_sqm)}
        </TableCell>

        {/* Área */}
        <TableCell className="text-right text-muted-foreground">
          {formatArea(prospect.area_usable)}
        </TableCell>

        {/* Quartos/Banheiros/Vagas */}
        <TableCell>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            {prospect.bedrooms != null && (
              <span className="flex items-center gap-0.5" title="Quartos">
                <Bed className="h-3.5 w-3.5" />
                {prospect.bedrooms}
              </span>
            )}
            {prospect.bathrooms != null && (
              <span className="flex items-center gap-0.5" title="Banheiros">
                <Bath className="h-3.5 w-3.5" />
                {prospect.bathrooms}
              </span>
            )}
            {prospect.parking != null && (
              <span className="flex items-center gap-0.5" title="Vagas">
                <Car className="h-3.5 w-3.5" />
                {prospect.parking}
              </span>
            )}
            {prospect.bedrooms == null && prospect.bathrooms == null && prospect.parking == null && "—"}
          </div>
        </TableCell>

        {/* Status */}
        <TableCell className="text-center">
          <Badge variant={status.variant}>{status.label}</Badge>
        </TableCell>

        {/* Ações */}
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            {/* Ver */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowViewModal(true)}
                  disabled={isPending}
                  className="h-8 w-8 p-0"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ver detalhes</TooltipContent>
            </Tooltip>

            {/* Converter */}
            {!isConverted && (
              <>
                {showConfirmConvert ? (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      onClick={handleConvert}
                      disabled={isPending}
                      className="h-7 px-2 text-xs"
                    >
                      {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Sim"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowConfirmConvert(false)}
                      disabled={isPending}
                      className="h-7 px-2 text-xs"
                    >
                      Não
                    </Button>
                  </div>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowConfirmConvert(true)}
                        disabled={isPending}
                        className="h-8 w-8 p-0"
                      >
                        <ArrowRightCircle className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Converter para Imóvel</TooltipContent>
                  </Tooltip>
                )}
              </>
            )}

            {/* Excluir */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Excluir lead</TooltipContent>
            </Tooltip>
          </div>
        </TableCell>
      </TableRow>

      {/* View Modal */}
      <ProspectViewModal
        prospect={prospect}
        open={showViewModal}
        onOpenChange={setShowViewModal}
        canAccessFlipScoreV1={canAccessFlipScoreV1}
      />
    </>
  );
}
