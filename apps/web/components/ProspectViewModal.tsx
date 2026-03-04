"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
  Copy,
  Sparkles,
  Lock,
  Trash2,
} from "lucide-react";

import type {
  Prospect,
  OfferIntelligenceHistoryItem,
  OfferIntelligencePreview,
} from "@widia/shared";

import { updateProspectAction } from "@/lib/actions/prospects";
import { recomputeFlipScoreAction } from "@/lib/actions/flip-score";
import {
  generateOfferIntelligence,
  listOfferIntelligenceHistory,
  deleteOfferIntelligence,
  OfferIntelligenceClientError,
  OfferPaywallRequiredError,
  OfferRateLimitedError,
  saveOfferIntelligence,
} from "@/lib/offer-intelligence-client";
import { EVENTS, logEvent } from "@/lib/analytics";
import { FlipScoreBadge } from "@/components/FlipScoreBadge";
import { usePaywall } from "@/components/PaywallModal";
import { InvestmentPremisesView } from "@/components/prospect/InvestmentPremisesView";
import { InvestmentAnalysisFieldset } from "@/components/prospect/InvestmentAnalysisFieldset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
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

interface StringNumberInputProps {
  readonly id?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly allowDecimals?: boolean;
}

function StringNumberInput({ id, value, onChange, placeholder, disabled, allowDecimals }: StringNumberInputProps) {
  const numValue = value === "" ? null : Number.parseFloat(value);
  return (
    <NumberInput
      id={id}
      value={Number.isNaN(numValue) ? null : numValue}
      onChange={(v) => onChange(v === null ? "" : v.toString())}
      placeholder={placeholder}
      disabled={disabled}
      allowDecimals={allowDecimals}
    />
  );
}

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

const OFFER_INTELLIGENCE_REQUIRED_FIELDS: Record<string, string> = {
  asking_price: "Preço pedido",
  area_usable: "Área útil",
  expected_sale_price: "Preço de venda esperado",
  renovation_cost_estimate: "Custo estimado de reforma",
};

const OFFER_INTELLIGENCE_FIELD_TO_EDIT_ID: Record<string, string> = {
  asking_price: "edit-price",
  area_usable: "edit-area",
  expected_sale_price: "edit-expected_sale_price",
  renovation_cost_estimate: "edit-renovation_cost_estimate",
};

function extractOfferMissingFields(error: OfferIntelligenceClientError): string[] {
  if (
    error.code !== "VALIDATION_ERROR" ||
    !error.message.toLowerCase().includes("missing critical inputs")
  ) {
    return [];
  }

  return (error.details ?? []).filter((field) =>
    Object.prototype.hasOwnProperty.call(OFFER_INTELLIGENCE_REQUIRED_FIELDS, field),
  );
}

function formatOfferInputErrorMessage(error: OfferIntelligenceClientError): string {
  if (
    error.code === "VALIDATION_ERROR" &&
    error.message.toLowerCase().includes("missing critical inputs")
  ) {
    const fields = (error.details ?? []).filter((field) => Boolean(field?.trim()));
    const translated = fields.map((field) => OFFER_INTELLIGENCE_REQUIRED_FIELDS[field] ?? field);

    if (translated.length > 0) {
      return `Antes de finalizar a Oferta Inteligente, preencha estes campos:\n- ${translated.join("\n- ")}`;
    }

    return "Antes de finalizar a Oferta Inteligente, preencha os campos obrigatórios: preço pedido, área útil, preço de venda esperado e custo estimado de reforma.";
  }

  return `${error.code}: ${error.message}`;
}

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
  const [offerPreview, setOfferPreview] = useState<OfferIntelligencePreview | null>(null);
  const [offerHistory, setOfferHistory] = useState<OfferIntelligenceHistoryItem[]>([]);
  const [offerHistoryCursor, setOfferHistoryCursor] = useState<string | null>(null);
  const [isOfferGenerating, setIsOfferGenerating] = useState(false);
  const [isOfferSaving, setIsOfferSaving] = useState(false);
  const [offerDeletingHistoryId, setOfferDeletingHistoryId] = useState<string | null>(null);
  const [isOfferHistoryLoading, setIsOfferHistoryLoading] = useState(false);
  const [isOfferHistoryBlocked, setIsOfferHistoryBlocked] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [offerSuccess, setOfferSuccess] = useState<string | null>(null);
  const [offerRetryAfter, setOfferRetryAfter] = useState<number | null>(null);
  const [offerMissingFields, setOfferMissingFields] = useState<string[]>([]);
  const generateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingEditFocusIdRef = useRef<string | null>(null);
  const { showPaywall } = usePaywall();

  useEffect(() => {
    if (open) {
      logEvent(EVENTS.OFFER_INTELLIGENCE_OPENED, {
        workspace_id: prospect.workspace_id,
        prospect_id: prospect.id,
      });
    }
  }, [open, prospect.id, prospect.workspace_id]);

  useEffect(() => {
    return () => {
      if (generateTimeoutRef.current) {
        clearTimeout(generateTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isEditing || !pendingEditFocusIdRef.current) {
      return;
    }

    const targetId = pendingEditFocusIdRef.current;
    const timer = window.setTimeout(() => {
      const el = document.getElementById(targetId);
      if (el instanceof HTMLElement) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      }
      pendingEditFocusIdRef.current = null;
    }, 80);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isEditing]);

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

  const loadOfferHistory = async (reset = false, options?: { silentPaywall?: boolean }) => {
    if (!reset && (isOfferHistoryBlocked || (offerPreview != null && !offerPreview.gating.history_enabled))) {
      return;
    }
    setIsOfferHistoryLoading(true);
    setOfferError(null);
    try {
      const response = await listOfferIntelligenceHistory(prospect.id, {
        limit: 5,
        cursor: reset ? undefined : offerHistoryCursor ?? undefined,
      });
      setOfferHistory((prev) =>
        reset ? response.items : [...prev, ...response.items],
      );
      setOfferHistoryCursor(response.next_cursor ?? null);
      setIsOfferHistoryBlocked(false);
    } catch (e) {
      if (e instanceof OfferPaywallRequiredError) {
        if (!options?.silentPaywall) {
          setOfferError(e.message);
        }
        setIsOfferHistoryBlocked(true);
        logEvent(EVENTS.OFFER_INTELLIGENCE_PAYWALL_VIEWED, {
          workspace_id: prospect.workspace_id,
          prospect_id: prospect.id,
          source: "history",
        });
      } else if (e instanceof OfferIntelligenceClientError) {
        setOfferError(e.message);
        setIsOfferHistoryBlocked(false);
      } else {
        setOfferError("Falha ao carregar histórico de ofertas.");
        setIsOfferHistoryBlocked(false);
      }
    } finally {
      setIsOfferHistoryLoading(false);
    }
  };

  const runOfferGenerate = async (source: "prospect_modal" | "history_regenerate" = "prospect_modal") => {
    setOfferError(null);
    setOfferSuccess(null);
    setOfferRetryAfter(null);
    setOfferMissingFields([]);

    try {
      const preview = await generateOfferIntelligence(prospect.id, { source });
      setOfferPreview(preview);
      setOfferHistory([]);
      setOfferHistoryCursor(null);
      setIsOfferHistoryBlocked(!preview.gating.history_enabled);
      setOfferMissingFields([]);
      if (!preview.gating.full_access) {
        logEvent(EVENTS.OFFER_INTELLIGENCE_PAYWALL_VIEWED, {
          workspace_id: preview.workspace_id,
          prospect_id: preview.prospect_id,
          source: "generate_limited",
        });
      }
    } catch (e) {
      if (e instanceof OfferRateLimitedError) {
        setOfferRetryAfter(e.retryAfter ?? null);
        setOfferError(
          e.retryAfter
            ? `Limite atingido. Tente novamente em ${e.retryAfter}s.`
            : "Limite de geração atingido. Aguarde e tente novamente.",
        );
      } else if (e instanceof OfferPaywallRequiredError) {
        setOfferError(e.message);
        setOfferMissingFields([]);
        logEvent(EVENTS.OFFER_INTELLIGENCE_PAYWALL_VIEWED, {
          workspace_id: prospect.workspace_id,
          prospect_id: prospect.id,
          source,
        });
      } else if (e instanceof OfferIntelligenceClientError) {
        setOfferMissingFields(extractOfferMissingFields(e));
        setOfferError(formatOfferInputErrorMessage(e));
      } else {
        setOfferMissingFields([]);
        setOfferError("Erro ao gerar Oferta Inteligente.");
      }
    } finally {
      setIsOfferGenerating(false);
    }
  };

  const handleGenerateOffer = (source: "prospect_modal" | "history_regenerate" = "prospect_modal") => {
    if (generateTimeoutRef.current) {
      clearTimeout(generateTimeoutRef.current);
    }
    setIsOfferGenerating(true);
    generateTimeoutRef.current = setTimeout(() => {
      void runOfferGenerate(source);
    }, 600);
  };

  const handleCopyOfferMessage = async () => {
    if (!offerPreview) return;
    const text =
      offerPreview.gating.message_level === "full"
        ? offerPreview.message_templates.full
        : offerPreview.message_templates.short;
    try {
      await navigator.clipboard.writeText(text);
      logEvent(EVENTS.OFFER_MESSAGE_COPIED, {
        workspace_id: offerPreview.workspace_id,
        prospect_id: offerPreview.prospect_id,
        tier: offerPreview.tier,
      });
    } catch {
      setOfferError("Falha ao copiar mensagem.");
    }
  };

  const handleSaveOffer = async () => {
    if (!offerPreview) return;
    setIsOfferSaving(true);
    setOfferError(null);
    setOfferSuccess(null);
    setOfferMissingFields([]);
    try {
      await saveOfferIntelligence(prospect.id, { source: "prospect_modal" });
      if (offerPreview.gating.history_enabled) {
        setOfferSuccess("Oferta salva com sucesso no histórico.");
      } else {
        setOfferSuccess("Oferta salva. Faça upgrade para ver o histórico completo.");
      }
      if (offerPreview.gating.history_enabled) {
        await loadOfferHistory(true);
      }
    } catch (e) {
      setOfferSuccess(null);
      if (e instanceof OfferPaywallRequiredError) {
        setOfferError(e.message);
        setOfferMissingFields([]);
      } else if (e instanceof OfferIntelligenceClientError) {
        setOfferMissingFields(extractOfferMissingFields(e));
        setOfferError(formatOfferInputErrorMessage(e));
      } else {
        setOfferMissingFields([]);
        setOfferError("Erro ao salvar oferta.");
      }
    } finally {
      setIsOfferSaving(false);
    }
  };

  const openEditAndFocusOfferField = (fieldKey: string) => {
    const targetId = OFFER_INTELLIGENCE_FIELD_TO_EDIT_ID[fieldKey];
    pendingEditFocusIdRef.current = targetId ?? null;
    setIsEditing(true);
  };

  const handleDeleteHistoryOffer = async (offerId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta oferta do histórico?")) {
      return;
    }

    setOfferDeletingHistoryId(offerId);
    setOfferError(null);
    setOfferSuccess(null);

    try {
      await deleteOfferIntelligence(prospect.id, offerId);
      setOfferHistory((prev) => prev.filter((item) => item.id !== offerId));
      setOfferSuccess("Oferta removida do histórico.");
      logEvent(EVENTS.OFFER_INTELLIGENCE_DELETED, {
        workspace_id: prospect.workspace_id,
        prospect_id: prospect.id,
        source: "offer_history_delete",
      });
    } catch (e) {
      if (e instanceof OfferIntelligenceClientError) {
        setOfferError(e.message);
      } else {
        setOfferError("Erro ao excluir oferta.");
      }
    } finally {
      setOfferDeletingHistoryId(null);
    }
  };

  const handleUpgradeClick = () => {
    logEvent(EVENTS.OFFER_INTELLIGENCE_UPGRADE_CTA_CLICKED, {
      workspace_id: prospect.workspace_id,
      prospect_id: prospect.id,
      source: "offer_modal",
    });
    router.push("/app/billing");
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
    setOfferError(null);
    setOfferSuccess(null);
    setOfferRetryAfter(null);
    setOfferMissingFields([]);
    setOfferPreview(null);
    setOfferHistory([]);
    setOfferHistoryCursor(null);
    setIsOfferHistoryBlocked(false);
    setIsOfferGenerating(false);
    setIsOfferSaving(false);
    setIsOfferHistoryLoading(false);
    if (generateTimeoutRef.current) {
      clearTimeout(generateTimeoutRef.current);
      generateTimeoutRef.current = null;
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setError(null);

    const fd = new FormData();
    fd.set("neighborhood", formData.neighborhood);
    fd.set("address", formData.address);
    fd.set("link", formData.link);
    if (formData.area_usable) fd.set("area_usable", formData.area_usable);
    if (formData.bedrooms) fd.set("bedrooms", formData.bedrooms);
    if (formData.suites) fd.set("suites", formData.suites);
    if (formData.bathrooms) fd.set("bathrooms", formData.bathrooms);
    if (formData.parking) fd.set("parking", formData.parking);
    if (formData.floor) fd.set("floor", formData.floor);
    fd.set("elevator", formData.elevator ? "true" : "false");
    fd.set("face", formData.face);
    fd.set("gas", formData.gas);
    if (formData.asking_price) fd.set("asking_price", formData.asking_price);
    if (formData.condo_fee) fd.set("condo_fee", formData.condo_fee);
    if (formData.iptu) fd.set("iptu", formData.iptu);
    fd.set("agency", formData.agency);
    fd.set("broker_name", formData.broker_name);
    fd.set("broker_phone", formData.broker_phone);
    fd.set("comments", formData.comments);
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

  useEffect(() => {
    if (!open) return;
    void loadOfferHistory(true, { silentPaywall: true });
  }, [open, prospect.id]);

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

  const offerRequiredFieldChecklist = [
    {
      key: "asking_price",
      label: OFFER_INTELLIGENCE_REQUIRED_FIELDS.asking_price,
      isFilled: prospect.asking_price != null && prospect.asking_price > 0,
      value: prospect.asking_price != null ? formatCurrency(prospect.asking_price) : "Não preenchido",
    },
    {
      key: "area_usable",
      label: OFFER_INTELLIGENCE_REQUIRED_FIELDS.area_usable,
      isFilled: prospect.area_usable != null && prospect.area_usable > 0,
      value: prospect.area_usable != null ? `${prospect.area_usable} m²` : "Não preenchido",
    },
    {
      key: "expected_sale_price",
      label: OFFER_INTELLIGENCE_REQUIRED_FIELDS.expected_sale_price,
      isFilled: prospect.expected_sale_price != null && prospect.expected_sale_price > 0,
      value: prospect.expected_sale_price != null ? formatCurrency(prospect.expected_sale_price) : "Não preenchido",
    },
    {
      key: "renovation_cost_estimate",
      label: OFFER_INTELLIGENCE_REQUIRED_FIELDS.renovation_cost_estimate,
      isFilled: prospect.renovation_cost_estimate != null && prospect.renovation_cost_estimate >= 0,
      value: prospect.renovation_cost_estimate != null ? formatCurrency(prospect.renovation_cost_estimate) : "Não preenchido",
    },
  ] as const;
  const missingOfferFieldKeys = offerRequiredFieldChecklist
    .filter((field) => !field.isFilled)
    .map((field) => field.key);
  const prioritizedOfferMissingFields = offerMissingFields.length > 0 ? offerMissingFields : missingOfferFieldKeys;
  const offerMessageForBroker = offerPreview
    ? (offerPreview.gating.message_level === "full"
        ? offerPreview.message_templates.full
        : offerPreview.message_templates.short)
    : "";

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
                  <StringNumberInput
                    id="edit-area"
                    value={formData.area_usable}
                    onChange={(v) => handleChange("area_usable", v)}
                    placeholder="85"
                    disabled={isPending}
                    allowDecimals
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-bedrooms">Quartos</Label>
                  <StringNumberInput
                    id="edit-bedrooms"
                    value={formData.bedrooms}
                    onChange={(v) => handleChange("bedrooms", v)}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-suites">Suítes</Label>
                  <StringNumberInput
                    id="edit-suites"
                    value={formData.suites}
                    onChange={(v) => handleChange("suites", v)}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-bathrooms">Banheiros</Label>
                  <StringNumberInput
                    id="edit-bathrooms"
                    value={formData.bathrooms}
                    onChange={(v) => handleChange("bathrooms", v)}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-parking">Vagas</Label>
                  <StringNumberInput
                    id="edit-parking"
                    value={formData.parking}
                    onChange={(v) => handleChange("parking", v)}
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
                  <StringNumberInput
                    id="edit-floor"
                    value={formData.floor}
                    onChange={(v) => handleChange("floor", v)}
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
                  <StringNumberInput
                    id="edit-price"
                    value={formData.asking_price}
                    onChange={(v) => handleChange("asking_price", v)}
                    placeholder="500.000"
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-condo">Condomínio (R$)</Label>
                  <StringNumberInput
                    id="edit-condo"
                    value={formData.condo_fee}
                    onChange={(v) => handleChange("condo_fee", v)}
                    placeholder="1.500"
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-iptu">IPTU Anual (R$)</Label>
                  <StringNumberInput
                    id="edit-iptu"
                    value={formData.iptu}
                    onChange={(v) => handleChange("iptu", v)}
                    placeholder="3.000"
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

            {/* Offer Intelligence (M17a) */}
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                Oferta Inteligente
              </h3>
              <div className="space-y-4 rounded-lg border p-4">
                <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">Checklist para gerar oferta</p>
                    <Badge variant={missingOfferFieldKeys.length === 0 ? "default" : "secondary"}>
                      {offerRequiredFieldChecklist.length - missingOfferFieldKeys.length}/{offerRequiredFieldChecklist.length} preenchidos
                    </Badge>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {offerRequiredFieldChecklist.map((field) => {
                      const isHighlightedMissing = prioritizedOfferMissingFields.includes(field.key);
                      return (
                        <button
                          key={field.key}
                          type="button"
                          onClick={() => openEditAndFocusOfferField(field.key)}
                          className={`flex items-center justify-between rounded-md border px-3 py-2 text-left transition-colors ${
                            isHighlightedMissing
                              ? "border-amber-500/60 bg-amber-500/10"
                              : "border-border hover:bg-muted/50"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <p className="text-xs text-muted-foreground">{field.label}</p>
                            <p className="text-sm font-medium">{field.value}</p>
                          </div>
                          {field.isFilled ? (
                            <Check className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {missingOfferFieldKeys.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2">
                      <p className="text-xs text-amber-800 dark:text-amber-400">
                        Faltam {missingOfferFieldKeys.length} campo(s) para gerar a oferta com confiança.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openEditAndFocusOfferField(prioritizedOfferMissingFields[0] ?? "expected_sale_price")}
                      >
                        Completar agora
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() =>
                      handleGenerateOffer(
                        offerPreview ? "history_regenerate" : "prospect_modal",
                      )
                    }
                    disabled={isOfferGenerating}
                  >
                    {isOfferGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        {offerPreview ? "Regenerar oferta" : "Gerar oferta em 60s"}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyOfferMessage}
                    disabled={!offerPreview}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveOffer}
                    disabled={!offerPreview || isOfferSaving}
                  >
                    {isOfferSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar oferta"
                    )}
                  </Button>
                </div>

                {offerError && (
                  <div className="whitespace-pre-line rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {offerError}
                    {offerRetryAfter ? ` (retry em ${offerRetryAfter}s)` : null}
                  </div>
                )}

                {offerSuccess && (
                  <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                    {offerSuccess}
                  </div>
                )}

                {offerPreview && (
                  <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">Mensagem pronta para WhatsApp</p>
                      <Badge variant="outline" className="text-[10px]">
                        Corretor
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Copie e cole no WhatsApp para enviar a proposta ao corretor.
                    </p>
                    <div className="whitespace-pre-line rounded-md border bg-background px-3 py-2 text-sm">
                      {offerMessageForBroker}
                    </div>
                  </div>
                )}

                {!offerPreview && (
                  <p className="text-sm text-muted-foreground">
                    Gere uma oferta para receber decisão GO/REVIEW/NO_GO, cenários e mensagem pronta.
                  </p>
                )}

                {offerPreview && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-md border p-3">
                        <p className="text-xs text-muted-foreground">Decisão</p>
                        <p className="mt-1 text-lg font-semibold">{offerPreview.decision}</p>
                      </div>
                      <div className="rounded-md border p-3">
                        <p className="text-xs text-muted-foreground">Confiança</p>
                        <p className="mt-1 text-lg font-semibold">
                          {(offerPreview.confidence * 100).toFixed(0)}% ({offerPreview.confidence_bucket})
                        </p>
                      </div>
                      <div className="rounded-md border p-3">
                        <p className="text-xs text-muted-foreground">Risco</p>
                        <p className="mt-1 text-lg font-semibold">{offerPreview.risk_score.toFixed(0)}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {offerPreview.scenarios.map((scenario) => (
                        <div
                          key={scenario.key}
                          className="grid grid-cols-2 gap-2 rounded-md border p-3 text-sm sm:grid-cols-5"
                        >
                          <div>
                            <p className="text-xs text-muted-foreground">Cenário</p>
                            <p className="font-medium capitalize">{scenario.key}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Oferta</p>
                            <p className="font-medium">{formatCurrency(scenario.offer_price)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Lucro</p>
                            <p className="font-medium">{formatCurrency(scenario.net_profit)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Margem</p>
                            <p className="font-medium">{scenario.margin.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">ROI</p>
                            <p className="font-medium">{scenario.roi.toFixed(1)}%</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {offerPreview.reason_labels.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Por que essa decisão?</p>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {offerPreview.reason_labels.map((label) => (
                            <li key={label}>• {label}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {(offerPreview.assumptions.length > 0 || offerPreview.defaults_used.length > 0) && (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-md border p-3">
                          <p className="text-xs text-muted-foreground">Premissas</p>
                          {offerPreview.assumptions.length > 0 ? (
                            <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                              {offerPreview.assumptions.map((item) => (
                                <li key={item}>• {item}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-1 text-sm text-muted-foreground">Sem premissas adicionais.</p>
                          )}
                        </div>
                        <div className="rounded-md border p-3">
                          <p className="text-xs text-muted-foreground">Defaults usados</p>
                          {offerPreview.defaults_used.length > 0 ? (
                            <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                              {offerPreview.defaults_used.map((item) => (
                                <li key={item}>• {item}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-1 text-sm text-muted-foreground">Nenhum default aplicado.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {!offerPreview.gating.full_access && (
                      <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                        <p className="font-medium text-amber-800 dark:text-amber-400">
                          Visualização limitada no plano atual
                        </p>
                        <p className="mt-1 text-amber-700 dark:text-amber-500">
                          Você está vendo apenas o cenário recomendado e mensagem curta.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleUpgradeClick}
                          className="mt-3"
                        >
                          <Lock className="mr-2 h-4 w-4" />
                          Fazer upgrade
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {(offerPreview || offerHistory.length > 0 || isOfferHistoryLoading || isOfferHistoryBlocked) && (
                <div className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium">Histórico de ofertas</p>
                    {!isOfferHistoryBlocked ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void loadOfferHistory(true)}
                        disabled={isOfferHistoryLoading}
                      >
                        {isOfferHistoryLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Atualizar"
                        )}
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={handleUpgradeClick}>
                        Liberar histórico
                      </Button>
                    )}
                  </div>

                  {isOfferHistoryBlocked ? (
                    <p className="text-sm text-muted-foreground">
                      Histórico bloqueado neste plano. Faça upgrade para acessar versões salvas e staleness.
                    </p>
                  ) : offerHistory.length === 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">Nenhuma oferta salva ainda.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void loadOfferHistory(true)}
                        disabled={isOfferHistoryLoading}
                      >
                        Carregar histórico
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                          {offerHistory.map((item) => (
                        <div key={item.id} className="rounded-md border p-3 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{item.decision}</span>
                              <span className="text-muted-foreground">
                                {new Date(item.created_at).toLocaleString("pt-BR")}
                              </span>
                              {item.is_stale && (
                                <Badge variant="secondary">
                                  stale: {item.stale_reason ?? "SIM"}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {item.is_stale && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleGenerateOffer("history_regenerate")}
                                >
                                  Regenerar
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={offerDeletingHistoryId === item.id}
                                onClick={() => void handleDeleteHistoryOffer(item.id)}
                              >
                                {offerDeletingHistoryId === item.id ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Excluindo...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Oferta recomendada</p>
                              <p className="font-medium">
                                {formatCurrency(item.recommended_offer_price)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Margem</p>
                              <p className="font-medium">
                                {item.recommended_margin != null
                                  ? `${item.recommended_margin.toFixed(1)}%`
                                  : "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Lucro</p>
                              <p className="font-medium">
                                {formatCurrency(item.recommended_net_profit)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {offerHistoryCursor && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void loadOfferHistory(false)}
                          disabled={isOfferHistoryLoading}
                        >
                          {isOfferHistoryLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Carregando...
                            </>
                          ) : (
                            "Carregar mais"
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

            <InvestmentPremisesView prospect={prospect} />

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
