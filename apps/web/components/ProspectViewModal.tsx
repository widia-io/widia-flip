"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Pencil,
  X,
  ExternalLink,
  MapPin,
  Home,
  Building2,
  DollarSign,
  User,
  MessageSquare,
  Check,
  Phone,
} from "lucide-react";

import type { Prospect } from "@widia/shared";

import { updateProspectAction } from "@/lib/actions/prospects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProspectViewModalProps {
  prospect: Prospect;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  active: { label: "Ativo", variant: "default" },
  discarded: { label: "Descartado", variant: "secondary" },
  converted: { label: "Convertido", variant: "outline" },
};

export function ProspectViewModal({
  prospect,
  open,
  onOpenChange,
}: ProspectViewModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state initialized from prospect
  const [formData, setFormData] = useState({
    neighborhood: prospect.neighborhood ?? "",
    address: prospect.address ?? "",
    link: prospect.link ?? "",
    area_usable: prospect.area_usable?.toString() ?? "",
    bedrooms: prospect.bedrooms?.toString() ?? "",
    suites: prospect.suites?.toString() ?? "",
    bathrooms: prospect.bathrooms?.toString() ?? "",
    parking: prospect.parking?.toString() ?? "",
    floor: prospect.floor?.toString() ?? "",
    elevator: prospect.elevator ?? false,
    face: prospect.face ?? "",
    gas: prospect.gas ?? "",
    asking_price: prospect.asking_price?.toString() ?? "",
    condo_fee: prospect.condo_fee?.toString() ?? "",
    iptu: prospect.iptu?.toString() ?? "",
    agency: prospect.agency ?? "",
    broker_name: prospect.broker_name ?? "",
    broker_phone: prospect.broker_phone ?? "",
    comments: prospect.comments ?? "",
  });

  const resetForm = () => {
    setFormData({
      neighborhood: prospect.neighborhood ?? "",
      address: prospect.address ?? "",
      link: prospect.link ?? "",
      area_usable: prospect.area_usable?.toString() ?? "",
      bedrooms: prospect.bedrooms?.toString() ?? "",
      suites: prospect.suites?.toString() ?? "",
      bathrooms: prospect.bathrooms?.toString() ?? "",
      parking: prospect.parking?.toString() ?? "",
      floor: prospect.floor?.toString() ?? "",
      elevator: prospect.elevator ?? false,
      face: prospect.face ?? "",
      gas: prospect.gas ?? "",
      asking_price: prospect.asking_price?.toString() ?? "",
      condo_fee: prospect.condo_fee?.toString() ?? "",
      iptu: prospect.iptu?.toString() ?? "",
      agency: prospect.agency ?? "",
      broker_name: prospect.broker_name ?? "",
      broker_phone: prospect.broker_phone ?? "",
      comments: prospect.comments ?? "",
    });
    setError(null);
    setIsEditing(false);
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setError(null);

    const fd = new FormData();
    if (formData.neighborhood) fd.set("neighborhood", formData.neighborhood);
    if (formData.address) fd.set("address", formData.address);
    if (formData.link) fd.set("link", formData.link);
    if (formData.area_usable) fd.set("area_usable", formData.area_usable);
    if (formData.bedrooms) fd.set("bedrooms", formData.bedrooms);
    if (formData.suites) fd.set("suites", formData.suites);
    if (formData.bathrooms) fd.set("bathrooms", formData.bathrooms);
    if (formData.parking) fd.set("parking", formData.parking);
    if (formData.floor) fd.set("floor", formData.floor);
    fd.set("elevator", formData.elevator ? "true" : "false");
    if (formData.face) fd.set("face", formData.face);
    if (formData.gas) fd.set("gas", formData.gas);
    if (formData.asking_price) fd.set("asking_price", formData.asking_price);
    if (formData.condo_fee) fd.set("condo_fee", formData.condo_fee);
    if (formData.iptu) fd.set("iptu", formData.iptu);
    if (formData.agency) fd.set("agency", formData.agency);
    if (formData.broker_name) fd.set("broker_name", formData.broker_name);
    if (formData.broker_phone) fd.set("broker_phone", formData.broker_phone);
    if (formData.comments) fd.set("comments", formData.comments);

    startTransition(async () => {
      const result = await updateProspectAction(prospect.id, fd);
      if (result.error) {
        setError(result.error);
      } else {
        setIsEditing(false);
        router.refresh();
      }
    });
  };

  const handleCancel = () => {
    resetForm();
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const status = statusConfig[prospect.status] ?? {
    label: prospect.status,
    variant: "secondary" as const,
  };

  // View mode component for displaying a field
  const ViewField = ({
    label,
    value,
    href,
    isLink,
  }: {
    label: string;
    value: string | number | null | undefined;
    href?: string;
    isLink?: boolean;
  }) => {
    if (value == null || value === "") return null;
    return (
      <div className="space-y-1">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        {isLink && href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {value}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <p className="text-sm">{value}</p>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-xl">
                {prospect.neighborhood || "Sem bairro"}
              </DialogTitle>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            {prospect.address && (
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {prospect.address}
              </p>
            )}
          </div>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="gap-1.5"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          )}
        </DialogHeader>

        {isEditing ? (
          // Edit Mode
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="space-y-6"
          >
            {/* Location Section */}
            <fieldset className="space-y-4 rounded-lg border p-4">
              <legend className="flex items-center gap-2 px-2 text-sm font-medium">
                <MapPin className="h-4 w-4 text-primary" />
                Localização
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-neighborhood">Bairro</Label>
                  <Input
                    id="edit-neighborhood"
                    value={formData.neighborhood}
                    onChange={(e) =>
                      handleChange("neighborhood", e.target.value)
                    }
                    placeholder="Ex: Copacabana"
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="edit-address">Endereço</Label>
                  <Input
                    id="edit-address"
                    value={formData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    placeholder="Ex: Rua Bolivar, 123"
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="edit-link">Link do Anúncio</Label>
                  <Input
                    id="edit-link"
                    type="url"
                    value={formData.link}
                    onChange={(e) => handleChange("link", e.target.value)}
                    placeholder="https://..."
                    disabled={isPending}
                  />
                </div>
              </div>
            </fieldset>

            {/* Property Characteristics Section */}
            <fieldset className="space-y-4 rounded-lg border p-4">
              <legend className="flex items-center gap-2 px-2 text-sm font-medium">
                <Home className="h-4 w-4 text-primary" />
                Características do Imóvel
              </legend>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-area">Área Útil (m²)</Label>
                  <Input
                    id="edit-area"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.area_usable}
                    onChange={(e) =>
                      handleChange("area_usable", e.target.value)
                    }
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-bedrooms">Quartos</Label>
                  <Input
                    id="edit-bedrooms"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.bedrooms}
                    onChange={(e) => handleChange("bedrooms", e.target.value)}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-suites">Suítes</Label>
                  <Input
                    id="edit-suites"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.suites}
                    onChange={(e) => handleChange("suites", e.target.value)}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-bathrooms">Banheiros</Label>
                  <Input
                    id="edit-bathrooms"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.bathrooms}
                    onChange={(e) => handleChange("bathrooms", e.target.value)}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-parking">Vagas</Label>
                  <Input
                    id="edit-parking"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.parking}
                    onChange={(e) => handleChange("parking", e.target.value)}
                    disabled={isPending}
                  />
                </div>
              </div>
            </fieldset>

            {/* Building Section */}
            <fieldset className="space-y-4 rounded-lg border p-4">
              <legend className="flex items-center gap-2 px-2 text-sm font-medium">
                <Building2 className="h-4 w-4 text-primary" />
                Características do Prédio
              </legend>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-floor">Andar</Label>
                  <Input
                    id="edit-floor"
                    type="number"
                    value={formData.floor}
                    onChange={(e) => handleChange("floor", e.target.value)}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-face">Face</Label>
                  <Input
                    id="edit-face"
                    value={formData.face}
                    onChange={(e) => handleChange("face", e.target.value)}
                    placeholder="Norte, Sul..."
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-gas">Gás</Label>
                  <Input
                    id="edit-gas"
                    value={formData.gas}
                    onChange={(e) => handleChange("gas", e.target.value)}
                    placeholder="Encanado, Botijão..."
                    disabled={isPending}
                  />
                </div>
                <div className="flex items-end space-x-2 pb-2">
                  <Checkbox
                    id="edit-elevator"
                    checked={formData.elevator}
                    onCheckedChange={(checked) =>
                      handleChange("elevator", checked === true)
                    }
                    disabled={isPending}
                  />
                  <Label htmlFor="edit-elevator" className="cursor-pointer">
                    Elevador
                  </Label>
                </div>
              </div>
            </fieldset>

            {/* Financial Section */}
            <fieldset className="space-y-4 rounded-lg border p-4">
              <legend className="flex items-center gap-2 px-2 text-sm font-medium">
                <DollarSign className="h-4 w-4 text-primary" />
                Valores
              </legend>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-price">Valor Pedido (R$)</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.asking_price}
                    onChange={(e) =>
                      handleChange("asking_price", e.target.value)
                    }
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-condo">Condomínio (R$)</Label>
                  <Input
                    id="edit-condo"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.condo_fee}
                    onChange={(e) => handleChange("condo_fee", e.target.value)}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-iptu">IPTU Anual (R$)</Label>
                  <Input
                    id="edit-iptu"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.iptu}
                    onChange={(e) => handleChange("iptu", e.target.value)}
                    disabled={isPending}
                  />
                </div>
              </div>
            </fieldset>

            {/* Contact Section */}
            <fieldset className="space-y-4 rounded-lg border p-4">
              <legend className="flex items-center gap-2 px-2 text-sm font-medium">
                <User className="h-4 w-4 text-primary" />
                Contato
              </legend>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-agency">Imobiliária</Label>
                  <Input
                    id="edit-agency"
                    value={formData.agency}
                    onChange={(e) => handleChange("agency", e.target.value)}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-broker">Nome do Corretor</Label>
                  <Input
                    id="edit-broker"
                    value={formData.broker_name}
                    onChange={(e) =>
                      handleChange("broker_name", e.target.value)
                    }
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Telefone</Label>
                  <Input
                    id="edit-phone"
                    type="tel"
                    value={formData.broker_phone}
                    onChange={(e) =>
                      handleChange("broker_phone", e.target.value)
                    }
                    disabled={isPending}
                  />
                </div>
              </div>
            </fieldset>

            {/* Notes Section */}
            <fieldset className="space-y-4 rounded-lg border p-4">
              <legend className="flex items-center gap-2 px-2 text-sm font-medium">
                <MessageSquare className="h-4 w-4 text-primary" />
                Observações
              </legend>
              <div className="space-y-2">
                <Label htmlFor="edit-comments">Comentários</Label>
                <Textarea
                  id="edit-comments"
                  value={formData.comments}
                  onChange={(e) => handleChange("comments", e.target.value)}
                  disabled={isPending}
                  rows={3}
                />
              </div>
            </fieldset>

            {/* Error Message */}
            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-background pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isPending}
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="min-w-[120px]">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Salvar
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          // View Mode
          <div className="space-y-6">
            {/* Price highlight */}
            {prospect.asking_price != null && (
              <div className="rounded-lg bg-primary/5 p-4">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(prospect.asking_price)}
                  </span>
                  {prospect.price_per_sqm != null && (
                    <span className="text-sm text-muted-foreground">
                      ({formatCurrency(prospect.price_per_sqm)}/m²)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Location Section */}
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <MapPin className="h-4 w-4" />
                Localização
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <ViewField label="Bairro" value={prospect.neighborhood} />
                <ViewField label="Endereço" value={prospect.address} />
                {prospect.link && (
                  <div className="space-y-1 sm:col-span-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Link do Anúncio
                    </span>
                    <a
                      href={prospect.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      Ver anúncio
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            </section>

            {/* Property Characteristics Section */}
            {(prospect.area_usable != null ||
              prospect.bedrooms != null ||
              prospect.suites != null ||
              prospect.bathrooms != null ||
              prospect.parking != null) && (
              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Home className="h-4 w-4" />
                  Características do Imóvel
                </h3>
                <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  <ViewField
                    label="Área Útil"
                    value={
                      prospect.area_usable != null
                        ? `${prospect.area_usable} m²`
                        : null
                    }
                  />
                  <ViewField label="Quartos" value={prospect.bedrooms} />
                  <ViewField label="Suítes" value={prospect.suites} />
                  <ViewField label="Banheiros" value={prospect.bathrooms} />
                  <ViewField label="Vagas" value={prospect.parking} />
                </div>
              </section>
            )}

            {/* Building Section */}
            {(prospect.floor != null ||
              prospect.face ||
              prospect.gas ||
              prospect.elevator != null) && (
              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  Características do Prédio
                </h3>
                <div className="grid gap-4 sm:grid-cols-4">
                  <ViewField
                    label="Andar"
                    value={
                      prospect.floor != null ? `${prospect.floor}º` : null
                    }
                  />
                  <ViewField label="Face" value={prospect.face} />
                  <ViewField label="Gás" value={prospect.gas} />
                  <ViewField
                    label="Elevador"
                    value={prospect.elevator ? "Sim" : "Não"}
                  />
                </div>
              </section>
            )}

            {/* Financial Section */}
            {(prospect.condo_fee != null || prospect.iptu != null) && (
              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  Valores
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ViewField
                    label="Condomínio"
                    value={prospect.condo_fee != null ? formatCurrency(prospect.condo_fee) : null}
                  />
                  <ViewField
                    label="IPTU Anual"
                    value={prospect.iptu != null ? formatCurrency(prospect.iptu) : null}
                  />
                </div>
              </section>
            )}

            {/* Contact Section */}
            {(prospect.agency ||
              prospect.broker_name ||
              prospect.broker_phone) && (
              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <User className="h-4 w-4" />
                  Contato
                </h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <ViewField label="Imobiliária" value={prospect.agency} />
                  <ViewField label="Corretor" value={prospect.broker_name} />
                  {prospect.broker_phone && (
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        Telefone
                      </span>
                      <a
                        href={`tel:${prospect.broker_phone}`}
                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <Phone className="h-3 w-3" />
                        {prospect.broker_phone}
                      </a>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Comments Section */}
            {prospect.comments && (
              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                  Observações
                </h3>
                <p className="whitespace-pre-wrap text-sm italic text-muted-foreground">
                  "{prospect.comments}"
                </p>
              </section>
            )}

            {/* Metadata */}
            <div className="border-t pt-4 text-xs text-muted-foreground">
              <p>
                Criado em:{" "}
                {new Date(prospect.created_at).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              {prospect.updated_at !== prospect.created_at && (
                <p>
                  Atualizado em:{" "}
                  {new Date(prospect.updated_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

