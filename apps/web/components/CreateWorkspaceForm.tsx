"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";

import { createWorkspaceAction } from "@/lib/actions/workspaces";
import { usePaywall } from "@/components/PaywallModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function CreateWorkspaceForm() {
  const router = useRouter();
  const { showPaywall } = usePaywall();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError(null);
    startTransition(async () => {
      const result = await createWorkspaceAction(name.trim());

      if ("enforcement" in result && result.enforcement) {
        // For workspace creation, we don't have a workspaceId yet
        // Pass undefined, the modal will still show
        showPaywall(result.enforcement, undefined);
      } else if ("error" in result && result.error) {
        setError(result.error);
      } else {
        setName("");
        router.refresh();
      }
    });
  };

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Flips 2025, Zona Sul, Parceria João..."
          className="flex-1"
          disabled={isPending}
        />
        <Button type="submit" disabled={isPending || !name.trim()}>
          {isPending ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-1 h-4 w-4" />
          )}
          Criar projeto
        </Button>
      </form>
    </div>
  );
}
