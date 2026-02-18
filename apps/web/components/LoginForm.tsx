"use client";

import Link from "next/link";

import { signInEmailAction } from "@/lib/actions/auth";
import { EVENTS, ensureAnalyticsSessionId, logEvent } from "@/lib/analytics";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  return (
    <form
      action={signInEmailAction}
      className="space-y-4"
      onSubmitCapture={() => {
        ensureAnalyticsSessionId();
        logEvent(EVENTS.LOGIN_STARTED, {
          source: "login_page",
          location: "login_form",
        });
      }}
    >
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
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Senha</Label>
          <Link
            href="/forgot-password"
            className="text-xs text-muted-foreground hover:text-primary hover:underline"
          >
            Esqueceu sua senha?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
        />
      </div>
      <Button type="submit" className="w-full">
        Entrar
      </Button>
    </form>
  );
}
