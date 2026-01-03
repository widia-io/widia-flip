"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, MapPin, Home, Building2, DollarSign, User, MessageSquare, Link2, Sparkles } from "lucide-react";

import { type ScrapePropertyResponse } from "@widia/shared";
import { createProspectAction } from "@/lib/actions/prospects";
import { usePaywall } from "@/components/PaywallModal";
import { InvestmentAnalysisFieldset } from "@/components/prospect/InvestmentAnalysisFieldset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ProspectAddModalProps {
  workspaceId: string;
  canAccessFlipScoreV1?: boolean;
}

export function ProspectAddModal({ workspaceId, canAccessFlipScoreV1 = false }: ProspectAddModalProps) {
  const router = useRouter();
  const { showPaywall } = usePaywall();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // URL scraping state
  const [urlToScrape, setUrlToScrape] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [scrapeSuccess, setScrapeSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    neighborhood: "",
    address: "",
    link: "",
    area_usable: "",
    bedrooms: "",
    suites: "",
    bathrooms: "",
    parking: "",
    floor: "",
    elevator: false,
    face: "",
    gas: "",
    asking_price: "",
    condo_fee: "",
    iptu: "",
    agency: "",
    broker_name: "",
    broker_phone: "",
    comments: "",
    // Investment analysis fields (M9 - Flip Score v1)
    offer_price: "",
    expected_sale_price: "",
    renovation_cost_estimate: "",
    hold_months: "",
    other_costs_estimate: "",
  });

  const resetForm = () => {
    setFormData({
      neighborhood: "",
      address: "",
      link: "",
      area_usable: "",
      bedrooms: "",
      suites: "",
      bathrooms: "",
      parking: "",
      floor: "",
      elevator: false,
      face: "",
      gas: "",
      asking_price: "",
      condo_fee: "",
      iptu: "",
      agency: "",
      broker_name: "",
      broker_phone: "",
      comments: "",
      offer_price: "",
      expected_sale_price: "",
      renovation_cost_estimate: "",
      hold_months: "",
      other_costs_estimate: "",
    });
    setError(null);
    setUrlToScrape("");
    setScrapeError(null);
    setScrapeSuccess(false);
  };

  const handleScrape = async () => {
    if (!urlToScrape.trim()) {
      setScrapeError("Cole uma URL para importar");
      return;
    }

    // Basic URL validation
    try {
      new URL(urlToScrape);
    } catch {
      setScrapeError("URL inválida");
      return;
    }

    setIsScraping(true);
    setScrapeError(null);
    setScrapeSuccess(false);

    try {
      const res = await fetch("/api/scrape-property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToScrape }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message ?? "Erro ao importar dados");
      }

      const response = data as ScrapePropertyResponse;

      if (!response.success || !response.data) {
        throw new Error("Não foi possível extrair dados do anúncio");
      }

      // Auto-fill form with scraped data
      setFormData((prev) => ({
        ...prev,
        link: urlToScrape,
        neighborhood: response.data?.neighborhood ?? prev.neighborhood,
        address: response.data?.address ?? prev.address,
        area_usable: response.data?.area_usable?.toString() ?? prev.area_usable,
        bedrooms: response.data?.bedrooms?.toString() ?? prev.bedrooms,
        suites: response.data?.suites?.toString() ?? prev.suites,
        bathrooms: response.data?.bathrooms?.toString() ?? prev.bathrooms,
        parking: response.data?.parking?.toString() ?? prev.parking,
        floor: response.data?.floor?.toString() ?? prev.floor,
        asking_price: response.data?.asking_price?.toString() ?? prev.asking_price,
        condo_fee: response.data?.condo_fee?.toString() ?? prev.condo_fee,
        iptu: response.data?.iptu?.toString() ?? prev.iptu,
        agency: response.data?.agency ?? prev.agency,
        broker_name: response.data?.broker_name ?? prev.broker_name,
      }));

      setScrapeSuccess(true);

      if (response.warning) {
        setScrapeError(response.warning);
      }
    } catch (e) {
      setScrapeError(e instanceof Error ? e.message : "Erro ao importar dados");
    } finally {
      setIsScraping(false);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Build FormData with all fields
    const fd = new FormData();
    fd.set("workspace_id", workspaceId);

    if (formData.neighborhood) fd.set("neighborhood", formData.neighborhood);
    if (formData.address) fd.set("address", formData.address);
    if (formData.link) fd.set("link", formData.link);
    if (formData.area_usable) fd.set("area_usable", formData.area_usable);
    if (formData.bedrooms) fd.set("bedrooms", formData.bedrooms);
    if (formData.suites) fd.set("suites", formData.suites);
    if (formData.bathrooms) fd.set("bathrooms", formData.bathrooms);
    if (formData.parking) fd.set("parking", formData.parking);
    if (formData.floor) fd.set("floor", formData.floor);
    if (formData.elevator) fd.set("elevator", "true");
    if (formData.face) fd.set("face", formData.face);
    if (formData.gas) fd.set("gas", formData.gas);
    if (formData.asking_price) fd.set("asking_price", formData.asking_price);
    if (formData.condo_fee) fd.set("condo_fee", formData.condo_fee);
    if (formData.iptu) fd.set("iptu", formData.iptu);
    if (formData.agency) fd.set("agency", formData.agency);
    if (formData.broker_name) fd.set("broker_name", formData.broker_name);
    if (formData.broker_phone) fd.set("broker_phone", formData.broker_phone);
    if (formData.comments) fd.set("comments", formData.comments);
    // Investment analysis fields (only if user has access)
    if (canAccessFlipScoreV1) {
      if (formData.offer_price) fd.set("offer_price", formData.offer_price);
      if (formData.expected_sale_price) fd.set("expected_sale_price", formData.expected_sale_price);
      if (formData.renovation_cost_estimate) fd.set("renovation_cost_estimate", formData.renovation_cost_estimate);
      if (formData.hold_months) fd.set("hold_months", formData.hold_months);
      if (formData.other_costs_estimate) fd.set("other_costs_estimate", formData.other_costs_estimate);
    }

    // Validate at least one field is filled
    const hasValue = Object.entries(formData).some(([key, val]) => {
      if (key === "elevator") return false;
      return typeof val === "string" && val.trim() !== "";
    });

    if (!hasValue) {
      setError("Preencha pelo menos um campo");
      return;
    }

    startTransition(async () => {
      const result = await createProspectAction(fd);
      if ("enforcement" in result && result.enforcement) {
        // M12 - Show paywall modal for enforcement errors
        setOpen(false);
        showPaywall(result.enforcement, workspaceId);
      } else if ("error" in result && result.error) {
        setError(result.error);
      } else {
        resetForm();
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2 shadow-lg">
          <Plus className="h-5 w-5" />
          Adicionar Imóvel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Novo Imóvel para Prospecção</DialogTitle>
          <DialogDescription>
            Preencha os dados do imóvel. Todos os campos são opcionais.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* URL Import Section */}
          <fieldset className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <legend className="flex items-center gap-2 px-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Importar de URL
            </legend>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Cole o link de um anúncio (ZAP, VivaReal, OLX, etc.) para preencher automaticamente.
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="url"
                    value={urlToScrape}
                    onChange={(e) => {
                      setUrlToScrape(e.target.value);
                      setScrapeError(null);
                      setScrapeSuccess(false);
                    }}
                    placeholder="https://www.zapimoveis.com.br/imovel/..."
                    disabled={isScraping || isPending}
                    className="pl-10"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleScrape();
                      }
                    }}
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleScrape}
                  disabled={isScraping || isPending || !urlToScrape.trim()}
                  className="min-w-[100px]"
                >
                  {isScraping ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    "Importar"
                  )}
                </Button>
              </div>
              {scrapeError && (
                <p className={`text-sm ${scrapeSuccess ? "text-amber-600" : "text-destructive"}`}>
                  {scrapeError}
                </p>
              )}
              {scrapeSuccess && !scrapeError && (
                <p className="text-sm text-green-600">
                  Dados importados! Revise e complete as informações abaixo.
                </p>
              )}
            </div>
          </fieldset>

          {/* Location Section */}
          <fieldset className="space-y-4 rounded-lg border p-4">
            <legend className="flex items-center gap-2 px-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-primary" />
              Localização
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={formData.neighborhood}
                  onChange={(e) => handleChange("neighborhood", e.target.value)}
                  placeholder="Ex: Copacabana"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Ex: Rua Bolivar, 123"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="link">Link do Anúncio</Label>
                <Input
                  id="link"
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
                <Label htmlFor="area_usable">Área Útil (m²)</Label>
                <Input
                  id="area_usable"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.area_usable}
                  onChange={(e) => handleChange("area_usable", e.target.value)}
                  placeholder="80"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Quartos</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.bedrooms}
                  onChange={(e) => handleChange("bedrooms", e.target.value)}
                  placeholder="2"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="suites">Suítes</Label>
                <Input
                  id="suites"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.suites}
                  onChange={(e) => handleChange("suites", e.target.value)}
                  placeholder="1"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bathrooms">Banheiros</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.bathrooms}
                  onChange={(e) => handleChange("bathrooms", e.target.value)}
                  placeholder="2"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parking">Vagas</Label>
                <Input
                  id="parking"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.parking}
                  onChange={(e) => handleChange("parking", e.target.value)}
                  placeholder="1"
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
                <Label htmlFor="floor">Andar</Label>
                <Input
                  id="floor"
                  type="number"
                  value={formData.floor}
                  onChange={(e) => handleChange("floor", e.target.value)}
                  placeholder="5"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="face">Face</Label>
                <Input
                  id="face"
                  value={formData.face}
                  onChange={(e) => handleChange("face", e.target.value)}
                  placeholder="Norte, Sul..."
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gas">Gás</Label>
                <Input
                  id="gas"
                  value={formData.gas}
                  onChange={(e) => handleChange("gas", e.target.value)}
                  placeholder="Encanado, Botijão..."
                  disabled={isPending}
                />
              </div>
              <div className="flex items-end space-x-2 pb-2">
                <Checkbox
                  id="elevator"
                  checked={formData.elevator}
                  onCheckedChange={(checked) =>
                    handleChange("elevator", checked === true)
                  }
                  disabled={isPending}
                />
                <Label htmlFor="elevator" className="cursor-pointer">
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
                <Label htmlFor="asking_price">Valor Pedido (R$)</Label>
                <Input
                  id="asking_price"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.asking_price}
                  onChange={(e) => handleChange("asking_price", e.target.value)}
                  placeholder="500000"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="condo_fee">Condomínio (R$)</Label>
                <Input
                  id="condo_fee"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.condo_fee}
                  onChange={(e) => handleChange("condo_fee", e.target.value)}
                  placeholder="800"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="iptu">IPTU Anual (R$)</Label>
                <Input
                  id="iptu"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.iptu}
                  onChange={(e) => handleChange("iptu", e.target.value)}
                  placeholder="1200"
                  disabled={isPending}
                />
              </div>
            </div>
          </fieldset>

          {/* Investment Analysis Section (M9 - Flip Score v1) */}
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
            workspaceId={workspaceId}
            idPrefix="add-"
          />

          {/* Contact Section */}
          <fieldset className="space-y-4 rounded-lg border p-4">
            <legend className="flex items-center gap-2 px-2 text-sm font-medium">
              <User className="h-4 w-4 text-primary" />
              Contato
            </legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="agency">Imobiliária</Label>
                <Input
                  id="agency"
                  value={formData.agency}
                  onChange={(e) => handleChange("agency", e.target.value)}
                  placeholder="Nome da imobiliária"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="broker_name">Nome do Corretor</Label>
                <Input
                  id="broker_name"
                  value={formData.broker_name}
                  onChange={(e) => handleChange("broker_name", e.target.value)}
                  placeholder="João Silva"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="broker_phone">Telefone</Label>
                <Input
                  id="broker_phone"
                  type="tel"
                  value={formData.broker_phone}
                  onChange={(e) => handleChange("broker_phone", e.target.value)}
                  placeholder="(21) 99999-9999"
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
              <Label htmlFor="comments">Comentários</Label>
              <Textarea
                id="comments"
                value={formData.comments}
                onChange={(e) => handleChange("comments", e.target.value)}
                placeholder="Anotações sobre o imóvel..."
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

          {/* Submit Button */}
          <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-background pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
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
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

