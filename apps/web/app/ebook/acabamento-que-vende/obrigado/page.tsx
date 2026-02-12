import Link from "next/link";
import { CheckCircle2, Mail, ArrowRight, Inbox } from "lucide-react";

export default function EbookThankYouPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 md:py-24">
      {/* Success card */}
      <div className="text-center">
        {/* Animated success icon */}
        <div className="relative mx-auto mb-8 w-20 h-20">
          <div className="absolute inset-0 rounded-full bg-teal-400/20 animate-ping" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 shadow-lg shadow-teal-500/25">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
        </div>

        <h1 className="font-display text-3xl md:text-4xl font-bold text-[#1e293b] mb-3">
          Ebook enviado!
        </h1>

        <p className="text-slate-500 text-lg mb-8">
          O link de download está a caminho do seu email.
        </p>

        {/* Email instructions card */}
        <div className="bg-white rounded-2xl border border-black/5 p-6 mb-8 text-left">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Inbox className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-display font-bold text-[#1e293b] mb-1">
                Confira seu email
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                O email pode levar até 2 minutos. Verifique também a pasta de
                <strong className="text-slate-700"> spam</strong> ou{" "}
                <strong className="text-slate-700">promoções</strong>.
                O link de download expira em 7 dias.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Link
            href="/login?tab=signup"
            className="flex items-center justify-center gap-2 w-full h-13 px-6 rounded-xl font-semibold text-base bg-[#1e293b] text-white hover:bg-[#0f172a] transition-colors duration-200"
          >
            Conhecer o meuflip
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/ebook/acabamento-que-vende"
            className="flex items-center justify-center w-full h-11 rounded-xl text-sm text-slate-400 hover:text-slate-600 transition-colors duration-200"
          >
            Voltar para a página do ebook
          </Link>
        </div>

        {/* Trust */}
        <div className="flex items-center justify-center gap-1.5 mt-8 text-xs text-slate-300">
          <Mail className="h-3 w-3" />
          <span>Email enviado por noreply@meuflip.com</span>
        </div>
      </div>
    </div>
  );
}
