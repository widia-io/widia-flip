"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpEmailAction } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PhoneInput } from "@/components/PhoneInput";

export function SignupForm() {
  const [, formAction, isPending] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      await signUpEmailAction(formData);
      return null;
    },
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="Seu nome"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="seu@email.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">
          Celular <span className="text-muted-foreground">(opcional)</span>
        </Label>
        <PhoneInput
          id="phone"
          name="phone"
          placeholder="(11) 99999-9999"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Minimo 8 caracteres"
          required
          minLength={8}
        />
      </div>

      <div className="flex items-start space-x-2">
        <Checkbox id="terms" name="terms" required className="mt-1" />
        <Label htmlFor="terms" className="text-sm font-normal leading-relaxed">
          Li e aceito os{" "}
          <Link
            href="/terms"
            target="_blank"
            className="text-primary underline hover:no-underline"
          >
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link
            href="/privacy"
            target="_blank"
            className="text-primary underline hover:no-underline"
          >
            Politica de Privacidade
          </Link>
        </Label>
      </div>

      <div className="flex items-start space-x-2">
        <Checkbox id="marketing" name="marketing" className="mt-1" />
        <Label htmlFor="marketing" className="text-sm font-normal leading-relaxed text-muted-foreground">
          Quero receber novidades e dicas por email
        </Label>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Criando conta..." : "Criar conta"}
      </Button>
    </form>
  );
}
