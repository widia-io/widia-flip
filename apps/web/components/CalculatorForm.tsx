"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import type { CalculatorLeadCaptureResponse, CashOutputs } from "@widia/shared";
import { AuthModal } from "@/components/AuthModal";
import { CalculatorOutputs } from "@/components/CalculatorOutputs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { EVENTS, ensureAnalyticsSessionId, logEvent } from "@/lib/analytics";

interface CalculatorFormProps {
  readonly isLoggedIn: boolean;
}

interface CalculatorInputs {
  purchase_price: number | null;
  renovation_cost: number | null;
  other_costs: number | null;
  sale_price: number | null;
}

interface LeadFormData {
  name: string;
  email: string;
  whatsapp: string;
  marketingConsent: boolean;
}

const STORAGE_KEY = "widia_calculator_inputs";
const LEAD_STORAGE_KEY = "widia_calculator_lead";
const COMPLETION_TRACK_KEY = "widia_calculator_completed_logged";

function getSaveButtonText(isSaving: boolean, isLoggedIn: boolean): string {
  if (isSaving) return "Salvando...";
  if (isLoggedIn) return "Salvar Análise";
  return "Salvar Análise (requer login)";
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function formatMobileWhatsApp(value: string): string {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 3) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function hasAnyCalculatorValue(inputs: CalculatorInputs): boolean {
  return inputs.purchase_price !== null || inputs.sale_price !== null;
}

function buildCalculatorPayload(inputs: CalculatorInputs): Record<string, number> {
  const payload: Record<string, number> = {};

  if (inputs.purchase_price !== null) payload.purchase_price = inputs.purchase_price;
  if (inputs.renovation_cost !== null) payload.renovation_cost = inputs.renovation_cost;
  if (inputs.other_costs !== null) payload.other_costs = inputs.other_costs;
  if (inputs.sale_price !== null) payload.sale_price = inputs.sale_price;

  return payload;
}

function hasValidLeadData(lead: LeadFormData): boolean {
  return (
    lead.name.trim().length >= 2
    && lead.email.trim().length > 0
    && digitsOnly(lead.whatsapp).length === 11
    && lead.marketingConsent
  );
}

export function CalculatorForm({ isLoggedIn }: CalculatorFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const [isCapturingLead, setIsCapturingLead] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [hasCapturedLead, setHasCapturedLead] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leadError, setLeadError] = useState<string | null>(null);

  const [inputs, setInputs] = useState<CalculatorInputs>({
    purchase_price: null,
    renovation_cost: null,
    other_costs: null,
    sale_price: null,
  });

  const [leadForm, setLeadForm] = useState<LeadFormData>({
    name: "",
    email: "",
    whatsapp: "",
    marketingConsent: false,
  });

  const [outputs, setOutputs] = useState<CashOutputs | null>(null);
  const [debouncedInputs, setDebouncedInputs] = useState(inputs);

  useEffect(() => {
    ensureAnalyticsSessionId();
  }, []);

  useEffect(() => {
    const storedInputs = sessionStorage.getItem(STORAGE_KEY);
    if (storedInputs) {
      try {
        setInputs(JSON.parse(storedInputs) as CalculatorInputs);
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }

    const storedLead = sessionStorage.getItem(LEAD_STORAGE_KEY);
    if (!storedLead) return;

    try {
      const parsedLead = JSON.parse(storedLead);
      const restoredLead: LeadFormData = {
        name: typeof parsedLead.name === "string" ? parsedLead.name : "",
        email: typeof parsedLead.email === "string" ? parsedLead.email : "",
        whatsapp: typeof parsedLead.whatsapp === "string"
          ? formatMobileWhatsApp(parsedLead.whatsapp)
          : "",
        marketingConsent: parsedLead.marketingConsent === true,
      };

      setLeadForm(restoredLead);
      setHasCapturedLead(hasValidLeadData(restoredLead));
    } catch {
      sessionStorage.removeItem(LEAD_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    const pendingAction = sessionStorage.getItem("widia_pending_save");
    if (pendingAction === "true") {
      sessionStorage.removeItem("widia_pending_save");
      void handleSave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInputs(inputs);
    }, 400);
    return () => clearTimeout(timer);
  }, [inputs]);

  useEffect(() => {
    if (!hasAnyCalculatorValue(debouncedInputs)) {
      setOutputs(null);
      setError(null);
      setShowLeadForm(false);
      return;
    }

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(debouncedInputs));

    startTransition(async () => {
      try {
        const res = await fetch("/api/calculator/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildCalculatorPayload(debouncedInputs)),
        });

        if (!res.ok) {
          const text = await res.text();
          setError(`Erro ao calcular: ${text}`);
          return;
        }

        const data = (await res.json()) as { outputs: CashOutputs };
        setOutputs(data.outputs);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao calcular");
      }
    });
  }, [debouncedInputs, startTransition]);

  useEffect(() => {
    if (!outputs || outputs.is_partial) return;
    if (window.sessionStorage.getItem(COMPLETION_TRACK_KEY)) return;

    logEvent(EVENTS.CALCULATOR_COMPLETED, {
      is_logged_in: isLoggedIn,
      has_renovation_cost: inputs.renovation_cost !== null,
      has_other_costs: inputs.other_costs !== null,
    });
    window.sessionStorage.setItem(COMPLETION_TRACK_KEY, "true");
  }, [inputs.other_costs, inputs.renovation_cost, isLoggedIn, outputs]);

  useEffect(() => {
    if (!outputs?.is_partial) return;
    setShowLeadForm(false);
  }, [outputs]);

  const handleInputChange = (field: keyof CalculatorInputs, value: number | null) => {
    setInputs((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLeadCapture = async () => {
    const cleanName = leadForm.name.trim();
    const cleanEmail = leadForm.email.trim().toLowerCase();
    const cleanWhatsApp = digitsOnly(leadForm.whatsapp);

    if (cleanName.length < 2) {
      setLeadError("Informe seu nome completo");
      return;
    }
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setLeadError("Informe um email valido");
      return;
    }
    if (cleanWhatsApp.length !== 11) {
      setLeadError("Informe um WhatsApp valido no formato (DD) 9 XXXX-XXXX");
      return;
    }
    if (!leadForm.marketingConsent) {
      setLeadError("É obrigatório aceitar receber e-mails de marketing");
      return;
    }

    setIsCapturingLead(true);
    setLeadError(null);

    try {
      const res = await fetch("/api/calculator/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          whatsapp: cleanWhatsApp,
          marketingConsent: leadForm.marketingConsent,
          ...buildCalculatorPayload(inputs),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || "Nao foi possivel salvar seu contato");
      }

      const data = (await res.json()) as CalculatorLeadCaptureResponse;
      setLeadForm({
        name: cleanName,
        email: cleanEmail,
        whatsapp: formatMobileWhatsApp(cleanWhatsApp),
        marketingConsent: leadForm.marketingConsent,
      });
      setHasCapturedLead(Boolean(data.lead_id));
      setShowLeadForm(false);

      sessionStorage.setItem(
        LEAD_STORAGE_KEY,
        JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          whatsapp: cleanWhatsApp,
          marketingConsent: leadForm.marketingConsent,
        }),
      );
    } catch (e) {
      setLeadError(e instanceof Error ? e.message : "Erro ao salvar contato");
    } finally {
      setIsCapturingLead(false);
    }
  };

  const handleSave = async () => {
    logEvent(EVENTS.SAVE_CLICKED, {
      is_logged_in: isLoggedIn,
      has_purchase_price: inputs.purchase_price !== null,
      has_sale_price: inputs.sale_price !== null,
    });

    if (!isLoggedIn) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
      sessionStorage.setItem("widia_pending_save", "true");
      setShowAuthModal(true);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/calculator/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildCalculatorPayload(inputs)),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || "Erro ao salvar análise");
      }

      const data = await res.json();
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem("widia_pending_save");
      router.push(`/app/properties/${data.property_id}/viability`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    router.refresh();
  };

  const canSave = outputs !== null && !outputs.is_partial;

  return (
    <>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Dados do Imóvel</CardTitle>
            {isPending && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="purchase_price">Preço de Compra (R$) *</Label>
                <NumberInput
                  id="purchase_price"
                  value={inputs.purchase_price}
                  onChange={(value) => handleInputChange("purchase_price", value)}
                  placeholder="500.000"
                  formatWhileTyping
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="renovation_cost">Custo de Reforma (R$)</Label>
                <NumberInput
                  id="renovation_cost"
                  value={inputs.renovation_cost}
                  onChange={(value) => handleInputChange("renovation_cost", value)}
                  placeholder="50.000"
                  formatWhileTyping
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="other_costs">Outros Custos (R$)</Label>
                <NumberInput
                  id="other_costs"
                  value={inputs.other_costs}
                  onChange={(value) => handleInputChange("other_costs", value)}
                  placeholder="10.000"
                  formatWhileTyping
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sale_price">Preço de Venda (R$) *</Label>
                <NumberInput
                  id="sale_price"
                  value={inputs.sale_price}
                  onChange={(value) => handleInputChange("sale_price", value)}
                  placeholder="700.000"
                  formatWhileTyping
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {outputs ? (
              <CalculatorOutputs
                outputs={outputs}
                mode={outputs.is_partial ? "basic" : "full"}
              />
            ) : (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                Preencha os valores para ver o resultado
              </div>
            )}

            <div className="border-t border-border pt-6">
              <Button
                onClick={handleSave}
                disabled={isSaving || !canSave}
                className="w-full"
                size="lg"
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {getSaveButtonText(isSaving, isLoggedIn)}
              </Button>
              {!canSave && outputs?.is_partial && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Preencha preço de compra e venda para salvar
                </p>
              )}
            </div>

            {canSave && (
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Quer continuar recebendo estudos e oportunidades parecidas?</p>
                  <p className="text-xs text-muted-foreground">
                    O relatório já está liberado acima. Se quiser, deixe seu contato para receber conteúdos e ofertas futuras por email.
                  </p>
                </div>

                {hasCapturedLead && !showLeadForm ? (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                      Contato salvo com sucesso para <strong>{leadForm.email}</strong>.
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setHasCapturedLead(false);
                        setShowLeadForm(true);
                        setLeadError(null);
                      }}
                    >
                      Atualizar dados de contato
                    </Button>
                  </div>
                ) : !showLeadForm ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 w-full"
                    onClick={() => {
                      setShowLeadForm(true);
                      setLeadError(null);
                    }}
                  >
                    Quero receber novidades e oportunidades
                  </Button>
                ) : (
                  <div className="mt-4 space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="lead_name">Nome</Label>
                      <Input
                        id="lead_name"
                        value={leadForm.name}
                        onChange={(event) => setLeadForm((prev) => ({ ...prev, name: event.target.value }))}
                        placeholder="Seu nome"
                        disabled={isCapturingLead}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="lead_email">Email</Label>
                      <Input
                        id="lead_email"
                        type="email"
                        value={leadForm.email}
                        onChange={(event) => setLeadForm((prev) => ({ ...prev, email: event.target.value }))}
                        placeholder="voce@email.com"
                        disabled={isCapturingLead}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="lead_whatsapp">WhatsApp</Label>
                      <Input
                        id="lead_whatsapp"
                        type="tel"
                        value={leadForm.whatsapp}
                        onChange={(event) => setLeadForm((prev) => ({
                          ...prev,
                          whatsapp: formatMobileWhatsApp(event.target.value),
                        }))}
                        placeholder="(11) 9 9999-9999"
                        inputMode="numeric"
                        disabled={isCapturingLead}
                      />
                    </div>

                    <div className="flex items-start gap-3 rounded-md border border-border/60 bg-background p-3">
                      <Checkbox
                        id="lead_marketing_consent"
                        checked={leadForm.marketingConsent}
                        onCheckedChange={(checked) => setLeadForm((prev) => ({
                          ...prev,
                          marketingConsent: checked === true,
                        }))}
                        disabled={isCapturingLead}
                        className="mt-0.5"
                      />
                      <Label
                        htmlFor="lead_marketing_consent"
                        className="cursor-pointer text-xs leading-5 text-muted-foreground"
                      >
                        Aceito receber conteúdos e ofertas por email. *
                      </Label>
                    </div>

                    {leadError && (
                      <p className="text-xs text-destructive">{leadError}</p>
                    )}

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        className="flex-1"
                        disabled={isCapturingLead}
                        onClick={() => {
                          setHasCapturedLead(hasValidLeadData(leadForm));
                          setShowLeadForm(false);
                          setLeadError(null);
                        }}
                      >
                        Agora não
                      </Button>
                      <Button
                        type="button"
                        className="flex-1"
                        disabled={isCapturingLead}
                        onClick={() => {
                          void handleLeadCapture();
                        }}
                      >
                        {isCapturingLead && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar contato
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}
