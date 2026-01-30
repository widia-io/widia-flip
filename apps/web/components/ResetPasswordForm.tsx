"use client";

import { useState, useActionState } from "react";
import { resetPasswordAction } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [clientError, setClientError] = useState("");

  const [, formAction, isPending] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      setClientError("");

      const pwd = formData.get("password") as string;
      const confirm = formData.get("confirmPassword") as string;

      if (pwd.length < 8) {
        setClientError("A senha deve ter no minimo 8 caracteres");
        return null;
      }

      if (pwd !== confirm) {
        setClientError("As senhas nao conferem");
        return null;
      }

      await resetPasswordAction(formData);
      return null;
    },
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      {clientError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {clientError}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Minimo 8 caracteres"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar senha</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Digite a senha novamente"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Redefinindo..." : "Redefinir senha"}
      </Button>
    </form>
  );
}
