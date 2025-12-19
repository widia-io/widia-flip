"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";

import { createProspectAction } from "@/lib/actions/prospects";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ProspectQuickAddProps {
  workspaceId: string;
}

export function ProspectQuickAdd({ workspaceId }: ProspectQuickAddProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const neighborhoodRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);

  const [neighborhood, setNeighborhood] = useState("");
  const [address, setAddress] = useState("");
  const [area, setArea] = useState("");
  const [price, setPrice] = useState("");

  const clearForm = () => {
    setNeighborhood("");
    setAddress("");
    setArea("");
    setPrice("");
    setError(null);
    neighborhoodRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    const areaNum = area ? parseFloat(area) : undefined;
    const priceNum = price ? parseFloat(price) : undefined;

    if (areaNum !== undefined && areaNum <= 0) {
      setError("Área deve ser maior que 0");
      areaRef.current?.focus();
      return;
    }

    if (priceNum !== undefined && priceNum < 0) {
      setError("Valor deve ser >= 0");
      priceRef.current?.focus();
      return;
    }

    // At least one field must be filled
    if (!neighborhood && !address && !area && !price) {
      setError("Preencha pelo menos um campo");
      neighborhoodRef.current?.focus();
      return;
    }

    const formData = new FormData();
    formData.set("workspace_id", workspaceId);
    if (neighborhood) formData.set("neighborhood", neighborhood);
    if (address) formData.set("address", address);
    if (areaNum !== undefined) formData.set("area_usable", String(areaNum));
    if (priceNum !== undefined) formData.set("asking_price", String(priceNum));

    startTransition(async () => {
      const result = await createProspectAction(formData);
      if (result.error) {
        setError(result.error);
      } else {
        clearForm();
        router.refresh();
      }
    });
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    nextRef?: React.RefObject<HTMLInputElement | null>,
  ) => {
    if (e.key === "Tab" && !e.shiftKey && nextRef?.current) {
      // Let default tab behavior work
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-b border-border">
      <div className="flex items-center gap-2 bg-muted/30 px-4 py-3">
        <Input
          ref={neighborhoodRef}
          type="text"
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, addressRef)}
          placeholder="Bairro"
          aria-label="Bairro do imóvel"
          disabled={isPending}
          className="w-28"
        />
        <Input
          ref={addressRef}
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, areaRef)}
          placeholder="Endereço"
          aria-label="Endereço do imóvel"
          disabled={isPending}
          className="flex-1"
        />
        <Input
          ref={areaRef}
          type="number"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, priceRef)}
          placeholder="Área m²"
          aria-label="Área útil em metros quadrados"
          disabled={isPending}
          min="0"
          step="0.01"
          className="w-24"
        />
        <Input
          ref={priceRef}
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Valor R$"
          aria-label="Valor do imóvel em reais"
          disabled={isPending}
          min="0"
          step="1"
          className="w-28"
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </>
          )}
        </Button>
      </div>
      {error && (
        <div className="bg-destructive/10 border-t border-destructive/20 px-4 py-2 text-xs text-destructive">
          {error}
        </div>
      )}
    </form>
  );
}
