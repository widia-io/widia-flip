"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateWorkspaceAction } from "@/lib/actions/workspaces";

interface WorkspaceSettingsFormProps {
  workspaceId: string;
  workspaceName: string;
  pjTaxRate: number;
  isOwner: boolean;
}

export function WorkspaceSettingsForm({
  workspaceId,
  workspaceName,
  pjTaxRate,
  isOwner,
}: WorkspaceSettingsFormProps) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      await updateWorkspaceAction(workspaceId, formData);
    });
  };

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Nome do Projeto</Label>
        <Input
          id="name"
          name="name"
          defaultValue={workspaceName}
          placeholder="Ex: Flips 2025"
          disabled={!isOwner || isPending}
        />
        {!isOwner && (
          <p className="text-xs text-muted-foreground">
            Apenas o proprietário pode alterar o nome do projeto.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="pjTaxRate">Taxa PJ (%)</Label>
        <Input
          id="pjTaxRate"
          name="pjTaxRate"
          type="number"
          step="0.01"
          min="0"
          max="100"
          defaultValue={(pjTaxRate * 100).toFixed(2)}
          placeholder="Ex: 15.00"
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">
          Taxa de imposto PJ aplicada nos cálculos de viabilidade.
        </p>
      </div>

      {isOwner && (
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Alterações
        </Button>
      )}
    </form>
  );
}


