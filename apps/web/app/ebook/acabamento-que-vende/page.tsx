import {
  BookOpen,
  PaintBucket,
  Lightbulb,
  BadgeDollarSign,
  Ruler,
  ShieldCheck,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowDown,
  Users,
  Star,
} from "lucide-react";

import { EbookLeadForm } from "@/components/ebook/EbookLeadForm";

const PAIN_POINTS = [
  "Gastou demais em porcelanato e a margem sumiu?",
  "Escolheu material pelo Pinterest e estourou o orçamento?",
  "Não sabe o que trocar e o que manter numa reforma?",
];

const BENEFITS = [
  {
    icon: BadgeDollarSign,
    title: "Proteja sua margem",
    desc: "Saiba exatamente onde gastar e onde cortar — sem achismo",
  },
  {
    icon: PaintBucket,
    title: "Guia por ambiente",
    desc: "Decisões prontas para cozinha, banheiro, sala e quartos",
  },
  {
    icon: Ruler,
    title: "Kits por público-alvo",
    desc: "Padrões de acabamento por faixa de preço e bairro",
  },
  {
    icon: Lightbulb,
    title: "3 coisas que transformam",
    desc: "As intervenções com maior impacto e menor custo",
  },
  {
    icon: ShieldCheck,
    title: "Erros reais evitados",
    desc: "Histórias de flippers que perderam dinheiro — e como evitar",
  },
  {
    icon: BookOpen,
    title: "Checklist de compra",
    desc: "Como negociar com fornecedor e comprar volume inteligente",
  },
];

const CHAPTERS = [
  { num: "00", title: "Antes de tudo: 3 regras do flipper" },
  { num: "01", title: "O jogo da margem: onde o acabamento te quebra" },
  { num: "02", title: "Padrão de acabamento por público" },
  { num: "03", title: "Onde gastar e onde cortar" },
  { num: "04", title: "Guia por ambiente: o manual de decisão" },
  { num: "05", title: "Padrões prontos: os kits do flipper" },
  { num: "06", title: "Orçamento e compra sem dor" },
  { num: "07", title: "Histórias rápidas de erro" },
  { num: "08", title: "O que separa flip lucrativo de flip trabalhoso" },
];

const STATS = [
  { value: "9", label: "capítulos", suffix: "" },
  { value: "40", label: "páginas", suffix: "+" },
  { value: "100", label: "downloads", suffix: "+" },
];

export default function EbookLandingPage() {
  return (
    <>
      {/* ====== HERO ====== */}
      <section className="relative overflow-hidden">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative mx-auto max-w-6xl px-4 pt-12 pb-16 md:pt-20 md:pb-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Copy */}
            <div>
              {/* Price anchor badge */}
              <div className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-500/20 px-4 py-2 mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
                </span>
                <span className="text-sm font-medium text-slate-500">
                  <span className="line-through">R$97</span>
                </span>
                <span className="text-sm font-bold text-teal-600">GRÁTIS por tempo limitado</span>
              </div>

              <h1 className="font-display text-4xl md:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-[#1e293b] leading-[1.1] mb-6">
                Acabamento que{" "}
                <span className="relative">
                  <span className="relative z-10">Vende</span>
                  <span className="absolute bottom-1 left-0 right-0 h-3 bg-teal-400/30 -rotate-1 rounded-sm" />
                </span>
              </h1>

              <p className="text-lg md:text-xl text-slate-500 leading-relaxed mb-8 max-w-lg">
                O guia que todo flipper precisa pra escolher piso, bancada,
                revestimento e metais — <strong className="text-slate-700">sem estourar orçamento
                e sem perder margem</strong>.
              </p>

              {/* Pain points */}
              <div className="space-y-3 mb-10">
                {PAIN_POINTS.map((pain) => (
                  <div key={pain} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-teal-500 shrink-0 mt-0.5" />
                    <span className="text-slate-600 text-sm">{pain}</span>
                  </div>
                ))}
              </div>

              {/* Form — primary placement */}
              <div className="max-w-xl">
                <EbookLeadForm />
                <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Receba o PDF no email em menos de 1 minuto
                </p>
              </div>
            </div>

            {/* Right: Visual */}
            <div className="relative hidden lg:flex items-center justify-center">
              {/* Background decoration */}
              <div className="absolute -top-10 -right-10 w-72 h-72 bg-teal-400/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-blue-400/10 rounded-full blur-3xl" />

              {/* Ebook mockup card */}
              <div className="relative">
                <div className="w-80 bg-[#1e293b] rounded-2xl p-8 shadow-2xl shadow-slate-900/20 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                  <div className="space-y-4">
                    <div className="w-12 h-1 bg-teal-400 rounded-full" />
                    <p className="text-teal-400 text-xs font-medium tracking-widest uppercase">
                      Ebook meuflip
                    </p>
                    <h3 className="text-white text-2xl font-bold leading-tight font-display">
                      Acabamento
                      <br />
                      que Vende
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      O guia do flipper pra não estourar orçamento e não perder margem
                    </p>
                    <div className="pt-4 border-t border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-400/20 flex items-center justify-center">
                          <BookOpen className="h-4 w-4 text-teal-400" />
                        </div>
                        <div>
                          <p className="text-white text-xs font-medium">9 capítulos</p>
                          <p className="text-slate-500 text-xs">40+ páginas</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating stat cards */}
                <div className="absolute -top-4 -left-12 bg-white rounded-xl shadow-lg shadow-black/5 border border-black/5 px-4 py-3 transform -rotate-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-teal-500" />
                    <span className="text-xs font-bold text-slate-700">ROI protegido</span>
                  </div>
                </div>

                <div className="absolute -bottom-3 -right-8 bg-white rounded-xl shadow-lg shadow-black/5 border border-black/5 px-4 py-3 transform rotate-2">
                  <div className="flex items-center gap-2">
                    <BadgeDollarSign className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-bold text-slate-700">Margem garantida</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="hidden md:flex justify-center mt-16">
            <div className="flex flex-col items-center gap-2 text-slate-300 animate-bounce">
              <ArrowDown className="h-4 w-4" />
            </div>
          </div>
        </div>
      </section>

      {/* ====== SOCIAL PROOF BAR ====== */}
      <section className="border-y border-black/5 bg-white/60 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="grid grid-cols-3 gap-4 md:gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl md:text-4xl font-bold font-display text-[#1e293b]">
                  {stat.value}
                  <span className="text-teal-500">{stat.suffix}</span>
                </p>
                <p className="text-xs md:text-sm text-slate-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== PROBLEM / AGITATION ====== */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <p className="text-xs tracking-widest uppercase text-teal-600 font-semibold mb-4">
            O problema
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-[#1e293b] leading-tight mb-6">
            Acabamento errado é o <br className="hidden md:block" />
            assassino silencioso da margem
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed">
            A maioria dos flippers perde entre 15% e 30% da margem em decisões
            de acabamento. Material caro demais, escolhas que não aparecem na
            foto, retrabalho por falta de padrão.{" "}
            <strong className="text-slate-700">Este guia resolve isso.</strong>
          </p>
        </div>
      </section>

      {/* ====== BENEFITS GRID ====== */}
      <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-24">
        <p className="text-xs tracking-widest uppercase text-teal-600 font-semibold mb-4 text-center">
          O que você vai aprender
        </p>
        <h2 className="font-display text-3xl md:text-4xl font-bold text-[#1e293b] text-center mb-12">
          Tudo que você precisa saber
          <br className="hidden md:block" /> sobre acabamento em flip
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className="group relative bg-white rounded-2xl border border-black/5 p-6 hover:border-teal-500/20 hover:shadow-lg hover:shadow-teal-500/5 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/10 to-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <b.icon className="h-5 w-5 text-teal-600" />
              </div>
              <h3 className="font-display font-bold text-[#1e293b] mb-2">{b.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ====== TABLE OF CONTENTS ====== */}
      <section className="bg-[#1e293b] text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div className="lg:sticky lg:top-24">
              <p className="text-xs tracking-widest uppercase text-teal-400 font-semibold mb-4">
                Conteúdo completo
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-bold leading-tight mb-6">
                9 capítulos de
                <br /> conteúdo prático
              </h2>
              <p className="text-slate-400 leading-relaxed mb-8">
                Nada de teoria genérica. Cada capítulo tem decisões prontas,
                valores de referência e exemplos reais de flips.
              </p>

              {/* Form — secondary placement (dark variant) */}
              <div className="max-w-md">
                <EbookLeadForm variant="dark" />
              </div>
            </div>

            <div className="space-y-3">
              {CHAPTERS.map((ch) => (
                <div
                  key={ch.num}
                  className="flex items-start gap-4 rounded-xl bg-white/5 border border-white/5 p-4 hover:bg-white/10 transition-colors duration-200"
                >
                  <span className="text-2xl font-bold font-display text-teal-400/40 leading-none mt-0.5 shrink-0 w-8">
                    {ch.num}
                  </span>
                  <span className="text-slate-200 text-sm leading-relaxed">{ch.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ====== AUTHORITY ====== */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl border border-black/5 p-8 md:p-12">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1e293b] to-[#334155] flex items-center justify-center shrink-0">
                <Users className="h-7 w-7 text-teal-400" />
              </div>
              <div>
                <p className="text-xs tracking-widest uppercase text-teal-600 font-semibold mb-3">
                  Quem criou
                </p>
                <h3 className="font-display text-2xl font-bold text-[#1e293b] mb-4">
                  Equipe meuflip + dados de flips reais
                </h3>
                <p className="text-slate-500 leading-relaxed mb-6">
                  Conteúdo criado com base em operações reais de flip imobiliário no Brasil.
                  Cada recomendação vem de quem já errou, ajustou e lucrou. Sem teoria
                  de livro — só o que funciona quando o dinheiro é seu.
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 border-2 border-white"
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-xs text-slate-400">Conteúdo avaliado por flippers</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== FINAL CTA ====== */}
      <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e293b] via-[#1e293b] to-[#0f172a] p-8 md:p-16 text-center">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-blue-400/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

          <div className="relative">
            {/* Price badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-4 py-2 mb-8">
              <span className="text-sm text-white/50 line-through">R$97</span>
              <span className="text-sm font-bold text-teal-400">GRÁTIS — por tempo limitado</span>
            </div>

            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-6 max-w-2xl mx-auto">
              Pare de perder margem
              <br /> em acabamento
            </h2>

            <p className="text-slate-400 text-lg mb-10 max-w-lg mx-auto">
              Receba o guia completo no seu email agora — e faça
              cada real de acabamento trabalhar a favor do seu lucro.
            </p>

            {/* Form — third placement */}
            <div className="max-w-md mx-auto">
              <EbookLeadForm variant="dark" />
            </div>

            <p className="text-xs text-white/30 mt-6 flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-3 w-3" />
              Sem spam. Seu email está seguro.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
