"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

import { submitEbookLead } from "@/lib/actions/ebook";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function EbookLeadForm({ variant = "default" }: { variant?: "default" | "dark" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Informe seu email");
      return;
    }

    if (!consent) {
      setError("Aceite receber emails para baixar o ebook");
      return;
    }

    startTransition(async () => {
      const result = await submitEbookLead(email.trim(), consent);
      if (result.success) {
        router.push("/ebook/acabamento-que-vende/obrigado");
      } else {
        setError(result.error ?? "Erro inesperado");
      }
    });
  }

  const isDark = variant === "dark";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Label htmlFor={`ebook-email-${variant}`} className="sr-only">
            Email
          </Label>
          <input
            id={`ebook-email-${variant}`}
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isPending}
            className={`
              w-full h-13 px-4 rounded-xl text-base outline-none transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isDark
                ? "bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                : "bg-white border border-black/10 text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 shadow-sm"
              }
            `}
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className={`
            h-13 px-6 rounded-xl font-semibold text-base transition-all duration-200
            flex items-center justify-center gap-2 shrink-0
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isDark
              ? "bg-teal-400 text-slate-900 hover:bg-teal-300 active:bg-teal-500"
              : "bg-[#1e293b] text-white hover:bg-[#0f172a] active:bg-[#334155]"
            }
          `}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Baixar grátis
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      <div className="flex items-start gap-2">
        <Checkbox
          id={`ebook-consent-${variant}`}
          checked={consent}
          onCheckedChange={(v) => setConsent(v === true)}
          disabled={isPending}
          className={isDark ? "border-white/30 data-[state=checked]:bg-teal-400 data-[state=checked]:border-teal-400" : ""}
        />
        <Label
          htmlFor={`ebook-consent-${variant}`}
          className={`text-xs leading-tight cursor-pointer ${isDark ? "text-white/50" : "text-slate-400"}`}
        >
          Aceito receber dicas de flip por email
        </Label>
      </div>

      {error && (
        <p className="text-sm text-red-500 font-medium">{error}</p>
      )}
    </form>
  );
}
