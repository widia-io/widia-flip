"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, User, Phone, Mail, FileText, DollarSign } from "lucide-react";

import {
  type Supplier,
  type SupplierCategory,
  SUPPLIER_CATEGORY_LABELS,
  SupplierCategoryEnum,
} from "@widia/shared";
import {
  createSupplierAction,
  updateSupplierAction,
} from "@/lib/actions/suppliers";
import { usePaywall } from "@/components/PaywallModal";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SupplierFormModalProps {
  workspaceId: string;
  supplier?: Supplier;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

const categories = SupplierCategoryEnum.options;

export function SupplierFormModal({
  workspaceId,
  supplier,
  trigger,
  onSuccess,
}: SupplierFormModalProps) {
  const router = useRouter();
  const { showPaywall } = usePaywall();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!supplier;

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    category: "outro" as SupplierCategory,
    notes: "",
    rating: null as number | null,
    hourly_rate: "",
  });

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        phone: supplier.phone ?? "",
        email: supplier.email ?? "",
        category: supplier.category,
        notes: supplier.notes ?? "",
        rating: supplier.rating,
        hourly_rate: supplier.hourly_rate?.toString() ?? "",
      });
    }
  }, [supplier]);

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      category: "outro",
      notes: "",
      rating: null,
      hourly_rate: "",
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const payload = {
        workspace_id: workspaceId,
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        category: formData.category,
        notes: formData.notes.trim() || undefined,
        rating: formData.rating ?? undefined,
        hourly_rate: formData.hourly_rate
          ? parseFloat(formData.hourly_rate)
          : undefined,
      };

      const result = isEdit
        ? await updateSupplierAction(supplier.id, payload)
        : await createSupplierAction(payload);

      if ("enforcement" in result && result.enforcement) {
        showPaywall(result.enforcement);
        return;
      }

      if (result.error) {
        setError(result.error);
        return;
      }

      setOpen(false);
      resetForm();
      router.refresh();
      onSuccess?.();
    });
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Fornecedor
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Fornecedor" : "Novo Fornecedor"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize as informações do fornecedor."
              : "Adicione um novo fornecedor ao seu cadastro."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">
              <User className="mr-1.5 inline h-3.5 w-3.5" />
              Nome *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Nome do profissional ou empresa"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  category: value as SupplierCategory,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {SUPPLIER_CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">
                <Phone className="mr-1.5 inline h-3.5 w-3.5" />
                Telefone
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="mr-1.5 inline h-3.5 w-3.5" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Avaliacao</Label>
              <div className="flex items-center pt-1">
                <StarRating
                  value={formData.rating}
                  onChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      rating: value === 0 ? null : value,
                    }))
                  }
                  size="lg"
                />
                {formData.rating && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    {formData.rating}/5
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hourly_rate">
                <DollarSign className="mr-1.5 inline h-3.5 w-3.5" />
                Valor/Hora (R$)
              </Label>
              <Input
                id="hourly_rate"
                type="number"
                min="0"
                step="0.01"
                value={formData.hourly_rate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    hourly_rate: e.target.value,
                  }))
                }
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">
              <FileText className="mr-1.5 inline h-3.5 w-3.5" />
              Notas
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Observacoes sobre o fornecedor..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
