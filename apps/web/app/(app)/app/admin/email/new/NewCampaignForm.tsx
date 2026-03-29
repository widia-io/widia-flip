"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import type { EmailAudienceKey, EligibleRecipientAudienceCounts } from "@widia/shared";

import { createEmailCampaign } from "@/lib/actions/email";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface NewCampaignFormProps {
  audienceCounts: EligibleRecipientAudienceCounts;
}

const AUDIENCE_OPTIONS: Array<{
  value: EmailAudienceKey;
  label: string;
  description: string;
}> = [
  {
    value: "all_eligible",
    label: "Todos elegíveis",
    description: "Usuários + leads deduplicados com precedência para usuário",
  },
  {
    value: "trial_expired_engaged",
    label: "Trials expirados engajados",
    description: "Usuários legados com trial expirado e algum sinal real de uso",
  },
  {
    value: "calculator_leads_hot",
    label: "Leads quentes da calculadora",
    description: "Calculadora completa, ROI >= 20% e lucro positivo",
  },
];

export function NewCampaignForm({ audienceCounts }: NewCampaignFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [audienceKey, setAudienceKey] = useState<EmailAudienceKey>("all_eligible");

  const selectedAudience = useMemo(
    () => AUDIENCE_OPTIONS.find((option) => option.value === audienceKey) ?? AUDIENCE_OPTIONS[0],
    [audienceKey],
  );

  const selectedAudienceCount = audienceCounts[
    audienceKey === "all_eligible"
      ? "allEligible"
      : audienceKey === "trial_expired_engaged"
        ? "trialExpiredEngaged"
        : "calculatorLeadsHot"
  ];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const subject = String(formData.get("subject") ?? "").trim();
    const bodyHtml = String(formData.get("bodyHtml") ?? "").trim();

    if (!subject) {
      setError("Assunto é obrigatório");
      return;
    }
    if (!bodyHtml) {
      setError("Conteúdo é obrigatório");
      return;
    }

    startTransition(async () => {
      try {
        const campaign = await createEmailCampaign(subject, bodyHtml, audienceKey);
        router.push(`/app/admin/email/${campaign.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao criar campanha");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="subject">Assunto do email</Label>
        <Input
          id="subject"
          name="subject"
          placeholder="Ex: Novidades do Meu Flip"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Audiência</Label>
        <Select value={audienceKey} onValueChange={(value) => setAudienceKey(value as EmailAudienceKey)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a audiência" />
          </SelectTrigger>
          <SelectContent>
            {AUDIENCE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {selectedAudience.description}. Base atual: <strong>{selectedAudienceCount}</strong> destinatários.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bodyHtml">Conteudo (HTML)</Label>
        <Textarea
          id="bodyHtml"
          name="bodyHtml"
          placeholder="<p>Escreva o conteúdo do email aqui...</p>"
          rows={10}
          required
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Voce pode usar HTML basico. O template do email sera aplicado automaticamente com header, footer e link de cancelamento.
        </p>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Criando..." : "Criar campanha"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
