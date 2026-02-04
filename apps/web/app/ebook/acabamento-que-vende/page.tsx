import Image from "next/image";
import {
  BadgeDollarSign,
  Ruler,
  Lightbulb,
  ShieldCheck,
  PaintBucket,
  Clock,
  CheckCircle2,
  ArrowDown,
  Users,
  Star,
} from "lucide-react";

import { EbookLeadForm } from "@/components/ebook/EbookLeadForm";

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
  { value: "85", label: "páginas", suffix: "+" },
  { value: "100", label: "downloads", suffix: "+" },
];

export default function EbookLandingPage() {
  return (
    <>
      {/* ====== HERO — Photo-driven ====== */}
      <section className="relative overflow-hidden bg-[#1e293b]">
        {/* Background moodboard photo */}
        <div className="absolute inset-0">
          <Image
            src="/ebook/moodboard-2.png"
            alt="Material samples — marble, wood, tiles"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1e293b] via-[#1e293b]/90 to-[#1e293b]/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1e293b] via-transparent to-[#1e293b]/30" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-20 md:pt-24 md:pb-32">
          <div className="max-w-xl">
            {/* Price anchor badge */}
            <div className="inline-flex items-center gap-2.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm px-4 py-2 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400" />
              </span>
              <span className="text-sm text-white/60 line-through">R$97</span>
              <span className="text-sm font-bold text-teal-400">GRÁTIS por tempo limitado</span>
            </div>

            <h1 className="font-display text-4xl md:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-white leading-[1.1] mb-6">
              Acabamento que{" "}
              <span className="relative inline-block">
                <span className="relative z-10">Vende</span>
                <span className="absolute bottom-1 left-0 right-0 h-3 bg-teal-400/40 -rotate-1 rounded-sm" />
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-300 leading-relaxed mb-8">
              O guia que todo flipper precisa pra escolher piso, bancada,
              revestimento e metais —{" "}
              <strong className="text-white">
                sem estourar orçamento e sem perder margem
              </strong>.
            </p>

            {/* Pain points */}
            <div className="space-y-3 mb-10">
              {[
                "Gastou demais em porcelanato e a margem sumiu?",
                "Escolheu material pelo Pinterest e estourou o orçamento?",
                "Não sabe o que trocar e o que manter numa reforma?",
              ].map((pain) => (
                <div key={pain} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300 text-sm">{pain}</span>
                </div>
              ))}
            </div>

            {/* Form — primary */}
            <div className="max-w-xl">
              <EbookLeadForm variant="dark" />
              <p className="text-xs text-white/30 mt-3 flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                Receba o PDF no email em menos de 1 minuto
              </p>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="hidden md:flex justify-center mt-20">
            <div className="flex flex-col items-center gap-2 text-white/30 animate-bounce">
              <ArrowDown className="h-4 w-4" />
            </div>
          </div>
        </div>
      </section>

      {/* ====== SOCIAL PROOF BAR ====== */}
      <section className="border-b border-black/5 bg-white">
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

      {/* ====== BEFORE / AFTER ====== */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="text-center mb-12">
          <p className="text-xs tracking-widest uppercase text-teal-600 font-semibold mb-4">
            A diferença
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-[#1e293b] leading-tight mb-4">
            Acabamento muda tudo
          </h2>
          <p className="text-slate-500 text-lg max-w-lg mx-auto">
            O mesmo imóvel. A única diferença? Decisões inteligentes de acabamento.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          {/* Before */}
          <div className="group relative overflow-hidden rounded-2xl">
            <div className="aspect-[4/3] relative">
              <Image
                src="/ebook/before-empty.png"
                alt="Apartamento antes — sem acabamento"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-red-500/20 border border-red-400/30 backdrop-blur-sm px-3 py-1.5 mb-3">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-xs font-semibold text-red-200 uppercase tracking-wide">Antes</span>
              </div>
              <p className="text-white font-display font-bold text-lg">
                Sem estratégia de acabamento
              </p>
              <p className="text-white/60 text-sm mt-1">
                Imóvel sem apelo. Meses no mercado. Preço caindo.
              </p>
            </div>
          </div>

          {/* After */}
          <div className="group relative overflow-hidden rounded-2xl">
            <div className="aspect-[4/3] relative">
              <Image
                src="/ebook/after-furnished.png"
                alt="Apartamento depois — acabamento estratégico"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/20 border border-teal-400/30 backdrop-blur-sm px-3 py-1.5 mb-3">
                <span className="w-2 h-2 rounded-full bg-teal-400" />
                <span className="text-xs font-semibold text-teal-200 uppercase tracking-wide">Depois</span>
              </div>
              <p className="text-white font-display font-bold text-lg">
                Acabamento estratégico
              </p>
              <p className="text-white/60 text-sm mt-1">
                Vendido em 3 semanas. Margem acima de 20%.
              </p>
            </div>
          </div>
        </div>

        {/* CTA after before/after */}
        <div className="text-center mt-10">
          <p className="text-slate-500 text-sm mb-1">
            Aprenda a fazer isso em todo flip.
          </p>
          <a
            href="#baixar"
            className="inline-flex items-center gap-2 text-teal-600 font-semibold text-sm hover:text-teal-700 transition-colors"
          >
            Baixar o guia grátis
            <ArrowDown className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>

      {/* ====== PROBLEM / AGITATION ====== */}
      <section className="bg-white border-y border-black/5">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs tracking-widest uppercase text-teal-600 font-semibold mb-4">
                O problema
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-[#1e293b] leading-tight mb-6">
                Acabamento errado é o assassino silencioso da margem
              </h2>
              <p className="text-slate-500 text-lg leading-relaxed mb-6">
                A maioria dos flippers perde entre 15% e 30% da margem em decisões
                de acabamento. Material caro demais, escolhas que não aparecem na
                foto, retrabalho por falta de padrão.
              </p>
              <p className="text-slate-700 font-semibold text-lg">
                Este guia resolve isso.
              </p>
            </div>
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/10">
                <div className="aspect-[4/3] relative">
                  <Image
                    src="/ebook/floor-install.png"
                    alt="Piso sendo instalado — decisão que impacta margem"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
              {/* Floating accent */}
              <div className="absolute -bottom-4 -left-4 bg-[#1e293b] text-white rounded-xl shadow-lg px-5 py-3 hidden md:block">
                <p className="text-xs text-teal-400 font-semibold">Piso errado?</p>
                <p className="text-sm font-bold">-15% de margem</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== PHOTO BENEFITS GRID ====== */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <p className="text-xs tracking-widest uppercase text-teal-600 font-semibold mb-4 text-center">
          O que você vai aprender
        </p>
        <h2 className="font-display text-3xl md:text-4xl font-bold text-[#1e293b] text-center mb-12">
          Tudo que você precisa saber
          <br className="hidden md:block" /> sobre acabamento em flip
        </h2>

        {/* Top row: 2 large photo cards */}
        <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
          <div className="group relative overflow-hidden rounded-2xl bg-[#1e293b] min-h-[280px]">
            <Image
              src="/ebook/bathroom.png"
              alt="Banheiro moderno"
              fill
              className="object-cover opacity-40 group-hover:opacity-50 group-hover:scale-105 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1e293b] via-[#1e293b]/40 to-transparent" />
            <div className="relative h-full flex flex-col justify-end p-6 md:p-8">
              <div className="w-10 h-10 rounded-xl bg-teal-400/20 flex items-center justify-center mb-4">
                <PaintBucket className="h-5 w-5 text-teal-400" />
              </div>
              <h3 className="font-display font-bold text-white text-xl mb-2">
                Guia por ambiente
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed max-w-xs">
                Decisões prontas para cozinha, banheiro, sala e quartos — com valores de referência
              </p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-[#1e293b] min-h-[280px]">
            <Image
              src="/ebook/kitchen-faucet.png"
              alt="Cozinha com metais de qualidade"
              fill
              className="object-cover opacity-40 group-hover:opacity-50 group-hover:scale-105 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1e293b] via-[#1e293b]/40 to-transparent" />
            <div className="relative h-full flex flex-col justify-end p-6 md:p-8">
              <div className="w-10 h-10 rounded-xl bg-teal-400/20 flex items-center justify-center mb-4">
                <BadgeDollarSign className="h-5 w-5 text-teal-400" />
              </div>
              <h3 className="font-display font-bold text-white text-xl mb-2">
                Proteja sua margem
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed max-w-xs">
                Saiba exatamente onde gastar e onde cortar — sem achismo, com dados reais
              </p>
            </div>
          </div>
        </div>

        {/* Bottom row: 3 smaller cards (no photos) */}
        <div className="grid sm:grid-cols-3 gap-4 md:gap-6">
          {[
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
          ].map((b) => (
            <div
              key={b.title}
              className="group bg-white rounded-2xl border border-black/5 p-6 hover:border-teal-500/20 hover:shadow-lg hover:shadow-teal-500/5 transition-all duration-300"
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

      {/* ====== MOODBOARD VISUAL BREAK ====== */}
      <section className="relative h-48 md:h-64 overflow-hidden">
        <Image
          src="/ebook/moodboard-1.png"
          alt="Amostras de acabamento — madeira, mármore, porcelanato"
          fill
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[#1e293b]/60" />
        <div className="relative h-full flex items-center justify-center">
          <p className="font-display text-2xl md:text-3xl font-bold text-white text-center px-4">
            Escolha certo. <span className="text-teal-400">Lucre mais.</span>
          </p>
        </div>
      </section>

      {/* ====== TABLE OF CONTENTS ====== */}
      <section id="baixar" className="bg-[#1e293b] text-white">
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

              {/* Form — secondary placement */}
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
        <div className="grid lg:grid-cols-5 gap-8 items-center">
          {/* Photo column */}
          <div className="lg:col-span-2 hidden lg:block">
            <div className="rounded-2xl overflow-hidden shadow-xl shadow-black/10">
              <div className="aspect-[3/4] relative">
                <Image
                  src="/ebook/living-room.png"
                  alt="Sala de estar finalizada — resultado de boas decisões"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>

          {/* Content column */}
          <div className="lg:col-span-3">
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
        </div>
      </section>

      {/* ====== FINAL CTA ====== */}
      <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-24">
        <div className="relative overflow-hidden rounded-3xl">
          {/* Background photo */}
          <div className="absolute inset-0">
            <Image
              src="/ebook/house-exterior.png"
              alt="Casa renovada"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1e293b]/95 via-[#1e293b]/90 to-[#1e293b]/70" />
          </div>

          <div className="relative p-8 md:p-16 text-center">
            {/* Price badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-4 py-2 mb-8">
              <span className="text-sm text-white/50 line-through">R$97</span>
              <span className="text-sm font-bold text-teal-400">GRÁTIS — por tempo limitado</span>
            </div>

            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-6 max-w-2xl mx-auto">
              Pare de perder margem
              <br /> em acabamento
            </h2>

            <p className="text-slate-300 text-lg mb-10 max-w-lg mx-auto">
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
