"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import type { CashOutputs, PublicCashBasicOutputs } from "@widia/shared";
import { CalculatorOutputs } from "@/components/CalculatorOutputs";
import { AuthModal } from "@/components/AuthModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { EVENTS, logEvent } from "@/lib/analytics";

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

interface CalculatorReportResponse {
  lead_id: string;
  outputs: CashOutputs;
}

const STORAGE_KEY = "widia_calculator_inputs";
const REPORT_UNLOCKED_KEY = "widia_calculator_report_unlocked";
const LEAD_STORAGE_KEY = "widia_calculator_lead";

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
  );
}

export function CalculatorForm({ isLoggedIn }: CalculatorFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [reportUnlocked, setReportUnlocked] = useState(false);
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

  const [basicOutputs, setBasicOutputs] = useState<PublicCashBasicOutputs | null>(null);
  const [fullOutputs, setFullOutputs] = useState<CashOutputs | null>(null);

  useEffect(() => {
    const storedInputs = sessionStorage.getItem(STORAGE_KEY);
    if (storedInputs) {
      try {
        const parsed = JSON.parse(storedInputs);
        setInputs(parsed);
      } catch {
        // Ignore invalid JSON
      }
    }

    const storedLead = sessionStorage.getItem(LEAD_STORAGE_KEY);
    if (storedLead) {
      try {
        const parsedLead = JSON.parse(storedLead);
        const leadFromStorage: LeadFormData = {
          name: typeof parsedLead.name === "string" ? parsedLead.name : "",
          email: typeof parsedLead.email === "string" ? parsedLead.email : "",
          whatsapp: typeof parsedLead.whatsapp === "string"
            ? formatMobileWhatsApp(parsedLead.whatsapp)
            : "",
          marketingConsent: parsedLead.marketingConsent === true,
        };
        setLeadForm(leadFromStorage);
      } catch {
        sessionStorage.removeItem(LEAD_STORAGE_KEY);
      }
    }

    const unlocked = sessionStorage.getItem(REPORT_UNLOCKED_KEY);
    if (unlocked === "true") {
      setReportUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      const pendingAction = sessionStorage.getItem("widia_pending_save");
      if (pendingAction === "true") {
        sessionStorage.removeItem("widia_pending_save");
        handleSave();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  const [debouncedInputs, setDebouncedInputs] = useState(inputs);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInputs(inputs);
    }, 400);
    return () => clearTimeout(timer);
  }, [inputs]);

  useEffect(() => {
    if (!hasAnyCalculatorValue(debouncedInputs)) {
      setBasicOutputs(null);
      setFullOutputs(null);
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

        const data = (await res.json()) as { outputs: PublicCashBasicOutputs };
        setBasicOutputs(data.outputs);
        setFullOutputs(null);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao calcular");
      }
    });
  }, [debouncedInputs]);

  const handleInputChange = (field: keyof CalculatorInputs, value: number | null) => {
    setInputs((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const submitLeadCapture = async () => {
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

    setIsUnlocking(true);
    setLeadError(null);

    try {
      const res = await fetch("/api/calculator/report", {
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
        throw new Error(data.error?.message || "Nao foi possivel liberar o relatorio completo");
      }

      const data = (await res.json()) as CalculatorReportResponse;

      setLeadForm({
        name: cleanName,
        email: cleanEmail,
        whatsapp: formatMobileWhatsApp(cleanWhatsApp),
        marketingConsent: leadForm.marketingConsent,
      });
      setFullOutputs(data.outputs);
      setReportUnlocked(true);
      setShowLeadForm(false);
      setError(null);

      sessionStorage.setItem(REPORT_UNLOCKED_KEY, "true");
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
      setLeadError(e instanceof Error ? e.message : "Erro ao liberar relatorio");
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleRequestFullReport = () => {
    logEvent(EVENTS.FULL_REPORT_REQUESTED, {
      has_saved_lead: hasValidLeadData(leadForm),
      is_unlocked: reportUnlocked,
    });

    if (reportUnlocked && hasValidLeadData(leadForm)) {
      void submitLeadCapture();
      return;
    }

    setShowLeadForm(true);
  };

  const handleSave = async () => {
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

  const canSave = basicOutputs && !basicOutputs.is_partial;
  const canRequestFull = basicOutputs !== null;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                  onChange={(v) => handleInputChange("purchase_price", v)}
                  placeholder="500.000"
                  formatWhileTyping
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="renovation_cost">Custo de Reforma (R$)</Label>
                <NumberInput
                  id="renovation_cost"
                  value={inputs.renovation_cost}
                  onChange={(v) => handleInputChange("renovation_cost", v)}
                  placeholder="50.000"
                  formatWhileTyping
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="other_costs">Outros Custos (R$)</Label>
                <NumberInput
                  id="other_costs"
                  value={inputs.other_costs}
                  onChange={(v) => handleInputChange("other_costs", v)}
                  placeholder="10.000"
                  formatWhileTyping
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sale_price">Preço de Venda (R$) *</Label>
                <NumberInput
                  id="sale_price"
                  value={inputs.sale_price}
                  onChange={(v) => handleInputChange("sale_price", v)}
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

          <CardContent>
            {fullOutputs ? (
              <CalculatorOutputs outputs={fullOutputs} mode="full" />
            ) : basicOutputs ? (
              <CalculatorOutputs outputs={basicOutputs} mode="basic" />
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                Preencha os valores para ver o resultado
              </div>
            )}

            {canRequestFull && !fullOutputs && (
              <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium">Relatorio completo com taxas detalhadas</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Para liberar ITBI, registro, corretagem, lucro completo e investimento total, preencha nome, email e WhatsApp.
                  </p>
                </div>

                {!showLeadForm ? (
                  <Button
                    type="button"
                    onClick={handleRequestFullReport}
                    disabled={isUnlocking}
                    className="w-full"
                    variant="outline"
                  >
                    {isUnlocking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {reportUnlocked ? "Atualizar relatorio completo" : "Ver relatorio completo"}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="lead_name">Nome</Label>
                      <Input
                        id="lead_name"
                        value={leadForm.name}
                        onChange={(e) => setLeadForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Seu nome"
                        disabled={isUnlocking}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="lead_email">Email</Label>
                      <Input
                        id="lead_email"
                        type="email"
                        value={leadForm.email}
                        onChange={(e) => setLeadForm((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="voce@email.com"
                        disabled={isUnlocking}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="lead_whatsapp">WhatsApp</Label>
                      <Input
                        id="lead_whatsapp"
                        type="tel"
                        value={leadForm.whatsapp}
                        onChange={(e) => setLeadForm((prev) => ({
                          ...prev,
                          whatsapp: formatMobileWhatsApp(e.target.value),
                        }))}
                        placeholder="(11) 9 9999-9999"
                        inputMode="numeric"
                        disabled={isUnlocking}
                      />
                    </div>

                    <div className="flex items-start gap-3 rounded-md border border-border/60 bg-muted/20 p-3">
                      <Checkbox
                        id="lead_marketing_consent"
                        checked={leadForm.marketingConsent}
                        onCheckedChange={(checked) => setLeadForm((prev) => ({
                          ...prev,
                          marketingConsent: checked === true,
                        }))}
                        disabled={isUnlocking}
                        className="mt-0.5"
                      />
                      <Label
                        htmlFor="lead_marketing_consent"
                        className="text-xs leading-5 text-muted-foreground cursor-pointer"
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
                        onClick={() => {
                          setShowLeadForm(false);
                          setLeadError(null);
                        }}
                        variant="ghost"
                        className="flex-1"
                        disabled={isUnlocking}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          logEvent(EVENTS.LEAD_CAPTURE_SUBMITTED, {
                            has_any_value: hasAnyCalculatorValue(inputs),
                            marketing_consent: leadForm.marketingConsent,
                          });
                          void submitLeadCapture();
                        }}
                        className="flex-1"
                        disabled={isUnlocking || !leadForm.marketingConsent}
                      >
                        {isUnlocking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Liberar relatorio
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-border">
              <Button
                onClick={handleSave}
                disabled={isSaving || !canSave}
                className="w-full"
                size="lg"
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {getSaveButtonText(isSaving, isLoggedIn)}
              </Button>
              {!canSave && basicOutputs?.is_partial && (
                <p className="mt-2 text-xs text-muted-foreground text-center">
                  Preencha preço de compra e venda para salvar
                </p>
              )}
            </div>
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
