"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Phone,
  Mail,
  Pencil,
  Trash2,
  Loader2,
  Filter,
  DollarSign,
} from "lucide-react";

import {
  type Supplier,
  SUPPLIER_CATEGORY_LABELS,
  SupplierCategoryEnum,
} from "@widia/shared";
import { deleteSupplierAction } from "@/lib/actions/suppliers";
import { SupplierFormModal } from "@/components/SupplierFormModal";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SuppliersGridProps {
  suppliers: Supplier[];
  workspaceId: string;
  categoryFilter?: string;
}

const categories = SupplierCategoryEnum.options;

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function SupplierCard({
  supplier,
  workspaceId,
}: {
  supplier: Supplier;
  workspaceId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      await deleteSupplierAction(supplier.id);
      router.refresh();
    });
  };

  return (
    <Card className="group relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold">{supplier.name}</h3>
            <Badge variant="secondary" className="mt-1">
              {SUPPLIER_CATEGORY_LABELS[supplier.category]}
            </Badge>
          </div>
          <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <SupplierFormModal
              workspaceId={workspaceId}
              supplier={supplier}
              trigger={
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Pencil className="h-4 w-4" />
                </Button>
              }
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir fornecedor?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Essa acao nao pode ser desfeita. O fornecedor{" "}
                    <strong>{supplier.name}</strong> sera removido
                    permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {supplier.rating && (
          <div className="mt-3">
            <StarRating value={supplier.rating} readOnly size="sm" />
          </div>
        )}

        <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          {supplier.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" />
              <a
                href={`tel:${supplier.phone}`}
                className="hover:text-foreground hover:underline"
              >
                {supplier.phone}
              </a>
            </div>
          )}
          {supplier.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" />
              <a
                href={`mailto:${supplier.email}`}
                className="truncate hover:text-foreground hover:underline"
              >
                {supplier.email}
              </a>
            </div>
          )}
          {supplier.hourly_rate && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5" />
              <span>{formatCurrency(supplier.hourly_rate)}/hora</span>
            </div>
          )}
        </div>

        {supplier.notes && (
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
            {supplier.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function SuppliersGrid({
  suppliers,
  workspaceId,
  categoryFilter,
}: SuppliersGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleCategoryChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("category");
    } else {
      params.set("category", value);
    }
    router.push(`/app/suppliers?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={categoryFilter ?? "all"}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {SUPPLIER_CATEGORY_LABELS[cat]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <SupplierFormModal workspaceId={workspaceId} />
      </div>

      {suppliers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {categoryFilter
                ? "Nenhum fornecedor encontrado nesta categoria."
                : "Nenhum fornecedor cadastrado ainda."}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Adicione fornecedores para gerenciar sua rede de profissionais.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {suppliers.map((supplier) => (
            <SupplierCard
              key={supplier.id}
              supplier={supplier}
              workspaceId={workspaceId}
            />
          ))}
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        {suppliers.length} fornecedor{suppliers.length !== 1 ? "es" : ""}
      </div>
    </div>
  );
}
