"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createEmailCampaign } from "@/lib/actions/email";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function NewCampaignForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
        const campaign = await createEmailCampaign(subject, bodyHtml);
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
