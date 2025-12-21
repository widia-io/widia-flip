"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, MapPin, Home, Building2, DollarSign, User, MessageSquare } from "lucide-react";

import { createProspectAction } from "@/lib/actions/prospects";
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
}

export function ProspectAddModal({ workspaceId }: ProspectAddModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    agency: "",
    broker_name: "",
    broker_phone: "",
    comments: "",
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
      agency: "",
      broker_name: "",
      broker_phone: "",
      comments: "",
    });
    setError(null);
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
    if (formData.agency) fd.set("agency", formData.agency);
    if (formData.broker_name) fd.set("broker_name", formData.broker_name);
    if (formData.broker_phone) fd.set("broker_phone", formData.broker_phone);
    if (formData.comments) fd.set("comments", formData.comments);

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
      if (result.error) {
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
            <div className="grid gap-4 sm:grid-cols-2">
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

