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
  RefreshCw,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

import type { Prospect } from "@widia/shared";

import { updateProspectAction } from "@/lib/actions/prospects";
import { recomputeFlipScoreAction } from "@/lib/actions/flip-score";
import { FlipScoreBadge } from "@/components/FlipScoreBadge";
import { usePaywall } from "@/components/PaywallModal";
import { InvestmentPremisesView } from "@/components/prospect/InvestmentPremisesView";
import { InvestmentAnalysisFieldset } from "@/components/prospect/InvestmentAnalysisFieldset";
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

export function ProspectViewModal({
  prospect,
  open,
  onOpenChange,
  canAccessFlipScoreV1 = false,
}: ProspectViewModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isScoreRecomputing, setIsScoreRecomputing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const { showPaywall } = usePaywall();

  const handleRecomputeScore = async (options: { force?: boolean; version?: "v0" | "v1" } = {}) => {
    setScoreError(null);
    setIsScoreRecomputing(true);
    try {
      const result = await recomputeFlipScoreAction(prospect.id, options);
      if ("enforcement" in result && result.enforcement) {
        // Provide fallback to v0 calculation
        const handleFallback = () => {
          handleRecomputeScore({ version: "v0" });
        };
        showPaywall(result.enforcement, prospect.workspace_id, handleFallback);
      } else if ("error" in result) {
        setScoreError(result.error);
      } else {
        router.refresh();
      }
    } finally {
      setIsScoreRecomputing(false);
    }
  };

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
    // M9 - Flip Score v1 investment inputs
    offer_price: prospect.offer_price?.toString() ?? "",
    expected_sale_price: prospect.expected_sale_price?.toString() ?? "",
    renovation_cost_estimate: prospect.renovation_cost_estimate?.toString() ?? "",
    hold_months: prospect.hold_months?.toString() ?? "",
    other_costs_estimate: prospect.other_costs_estimate?.toString() ?? "",
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
      // M9 - Flip Score v1 investment inputs
      offer_price: prospect.offer_price?.toString() ?? "",
      expected_sale_price: prospect.expected_sale_price?.toString() ?? "",
      renovation_cost_estimate: prospect.renovation_cost_estimate?.toString() ?? "",
      hold_months: prospect.hold_months?.toString() ?? "",
      other_costs_estimate: prospect.other_costs_estimate?.toString() ?? "",
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
    // M9 - Flip Score v1 investment inputs
    if (formData.offer_price) fd.set("offer_price", formData.offer_price);
    if (formData.expected_sale_price) fd.set("expected_sale_price", formData.expected_sale_price);
    if (formData.renovation_cost_estimate) fd.set("renovation_cost_estimate", formData.renovation_cost_estimate);
    if (formData.hold_months) fd.set("hold_months", formData.hold_months);
    if (formData.other_costs_estimate) fd.set("other_costs_estimate", formData.other_costs_estimate);

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
      <DialogContent className="w-full max-w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-4xl max-h-[95vh] overflow-y-auto">
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
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
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
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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

            {/* Investment Analysis (M9 - Flip Score v1) */}
            <InvestmentAnalysisFieldset
              canAccess={canAccessFlipScoreV1}
              formData={{
                offer_price: formData.offer_price,
                expected_sale_price: formData.expected_sale_price,
                renovation_cost_estimate: formData.renovation_cost_estimate,
                hold_months: formData.hold_months,
                other_costs_estimate: formData.other_costs_estimate,
              }}
              onChange={(field, value) => handleChange(field, value)}
              disabled={isPending}
              workspaceId={prospect.workspace_id}
              idPrefix="edit-"
            />

            {/* Contact Section */}
            <fieldset className="space-y-4 rounded-lg border p-4">
              <legend className="flex items-center gap-2 px-2 text-sm font-medium">
                <User className="h-4 w-4 text-primary" />
                Contato
              </legend>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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

            {/* Flip Score Section */}
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Flip Score
                {prospect.flip_score_version && (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] text-primary">
                    {prospect.flip_score_version}
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-4 rounded-lg border p-4">
                <FlipScoreBadge score={prospect.flip_score} size="md" version={prospect.flip_score_version ?? undefined} />
                <div className="flex-1">
                  {prospect.flip_score != null ? (
                    <>
                      <p className="text-sm font-medium">
                        {prospect.flip_score >= 70 ? "Boa oportunidade" :
                         prospect.flip_score >= 40 ? "Oportunidade regular" : "Oportunidade arriscada"}
                      </p>
                      {prospect.flip_score_updated_at && (
                        <p className="text-xs text-muted-foreground">
                          Atualizado em{" "}
                          {new Date(prospect.flip_score_updated_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Score não calculado
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRecomputeScore()}
                  disabled={isScoreRecomputing}
                  className="gap-1.5"
                >
                  {isScoreRecomputing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {prospect.flip_score != null ? "Atualizar" : "Calcular"}
                </Button>
              </div>

              {/* V1 Economics Breakdown */}
              {prospect.flip_score_version === "v1" && prospect.flip_score_breakdown?.economics && (
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 sm:grid-cols-4">
                  <div className="space-y-0.5">
                    <span className="text-xs text-muted-foreground">ROI</span>
                    <p className="text-sm font-semibold">
                      {prospect.flip_score_breakdown.economics.roi.toFixed(1)}%
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs text-muted-foreground">Lucro Líquido</span>
                    <p className="text-sm font-semibold">
                      {formatCurrency(prospect.flip_score_breakdown.economics.net_profit)}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs text-muted-foreground">Break-even</span>
                    <p className="text-sm font-semibold">
                      {formatCurrency(prospect.flip_score_breakdown.economics.break_even_sale_price)}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs text-muted-foreground">Margem</span>
                    <p className="text-sm font-semibold">
                      {formatCurrency(prospect.flip_score_breakdown.economics.buffer)}
                    </p>
                  </div>
                </div>
              )}

              {/* Hint for v1 inputs when score is v0 or not calculated */}
              {(prospect.flip_score_version !== "v1" || prospect.flip_score == null) &&
               (!prospect.expected_sale_price || (!prospect.offer_price && !prospect.asking_price)) && (
                <p className="text-xs text-muted-foreground">
                  💡 Preencha os &quot;Dados de Investimento&quot; para calcular o Score v1 baseado em ROI.
                </p>
              )}

              {scoreError && (
                <div className="flex items-start gap-2 rounded-md border border-yellow-500/50 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-700 dark:text-yellow-400">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p>{scoreError}</p>
                    {scoreError.includes("RATE_LIMITED") && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => handleRecomputeScore({ force: true })}
                        disabled={isScoreRecomputing}
                        className="h-auto p-0 text-yellow-700 dark:text-yellow-400"
                      >
                        Forçar recálculo
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Location Section */}
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <MapPin className="h-4 w-4" />
                Localização
              </h3>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
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
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
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
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
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
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
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

            {/* Investment Analysis (M9 - Flip Score v1) */}
            <InvestmentPremisesView prospect={prospect} />

            {/* Contact Section */}
            {(prospect.agency ||
              prospect.broker_name ||
              prospect.broker_phone) && (
              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <User className="h-4 w-4" />
                  Contato
                </h3>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
                  &ldquo;{prospect.comments}&rdquo;
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


