"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const TOTAL_SLIDES = 10;

// Icons
const Icons = {
  rocket: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  trendUp: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M23 6l-9.5 9.5-5-5L1 18" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 6h6v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  target: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  ),
  shield: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  zap: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  heart: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  whatsapp: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  ),
};

export default function PartnershipDeckPage() {
  const [currentSlide, setCurrentSlide] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      const sections = document.querySelectorAll("[data-slide]");
      const scrollPosition = window.scrollY + window.innerHeight / 3;

      sections.forEach((section) => {
        const element = section as HTMLElement;
        const sectionTop = element.offsetTop;
        const sectionBottom = sectionTop + element.offsetHeight;

        if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
          const slideNumber = parseInt(element.dataset.slide || "1", 10);
          setCurrentSlide(slideNumber);
        }
      });
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900 overflow-x-hidden">
      {/* Custom Styles */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700&display=swap');

        .font-display { font-family: 'Instrument Serif', Georgia, serif; }
        .font-body { font-family: 'Inter', system-ui, sans-serif; }

        .text-gradient-emerald {
          color: #059669;
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        @keyframes reveal {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-reveal {
          animation: reveal 0.8s ease-out forwards;
        }

        @keyframes scroll {
          0%, 100% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(4px); opacity: 0.5; }
        }

        .animate-scroll {
          animation: scroll 2s ease-in-out infinite;
        }
      `}</style>

      {/* Sticky Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-card">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Meuflip <span className="text-emerald-600 font-semibold">× Amanda Portilho</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-display text-sm text-emerald-600">{String(currentSlide).padStart(2, '0')}</span>
            <div className="w-16 h-0.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                style={{ width: `${(currentSlide / TOTAL_SLIDES) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">{TOTAL_SLIDES}</span>
          </div>
        </div>
      </header>

      {/* Slide 1: Opening - Growth Together */}
      <section
        data-slide="1"
        className="min-h-screen flex items-center justify-center px-6 pt-16 relative"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/50 via-transparent to-teal-50/30" />

        <div className={`max-w-4xl text-center relative z-10 ${mounted ? 'animate-reveal' : 'opacity-0'}`}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white rounded-full px-5 py-2 mb-8 border border-emerald-200 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-emerald-600 font-medium uppercase tracking-wider">Proposta</span>
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <span className="text-sm text-gray-500">
              Parceria de crescimento • Janeiro 2026
            </span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6 tracking-tight">
            <span className="block text-gray-800">
              Você transforma imóveis.
            </span>
            <span className="block text-gradient-emerald mt-2">
              E se pudesse entregar a ferramenta também?
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto mb-10">
            Amanda, você mostra o <span className="text-emerald-600 font-semibold">antes e depois visual</span> que encanta.
            Eu construo o antes e depois <span className="text-gray-800 font-medium">financeiro</span> que protege.
            Juntos, podemos crescer num mercado competitivo com um diferencial real.
          </p>

          {/* Growth Potential Highlight */}
          <div className="inline-flex flex-col sm:flex-row items-center gap-5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl px-8 py-5 border border-emerald-200/60 shadow-sm">
            <div className="flex items-center gap-4">
              <span className="text-emerald-500 scale-125">{Icons.rocket}</span>
              <div className="text-left">
                <p className="text-base font-medium text-gray-700">Potencial de crescimento conjunto</p>
                <p className="text-sm text-gray-500">100 assinantes = ~R$ 46K/ano • 50/50</p>
              </div>
            </div>
            <div className="hidden sm:block w-px h-10 bg-emerald-200" />
            <div className="text-center sm:text-left">
              <p className="font-display text-2xl font-bold text-gradient-emerald">Vamos construir juntos</p>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-xs text-gray-400 tracking-widest uppercase">Role para explorar</span>
          <div className="w-6 h-10 rounded-full border border-gray-300 flex justify-center pt-2">
            <div className="w-1.5 h-2 bg-emerald-500 rounded-full animate-scroll" />
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <hr className="border-gray-200" />
      </div>

      {/* Slide 2: Reality Check */}
      <section
        data-slide="2"
        className="min-h-screen flex items-center justify-center px-6"
      >
        {/*
          SPEAKER NOTES:
          - Valide a dor: "Você já deve ter visto isso nos seus alunos ou seguidores"
          - Use exemplos concretos: planilha que esqueceu ITBI, reforma que estourou
          - Não critique o aluno, critique o processo/ferramenta
        */}
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 mb-6">
            O que acontece na prática
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-10">
            O lucro morre na compra errada
          </h2>
          <ul className="space-y-6">
            <li className="flex items-start gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-bold">
                1
              </span>
              <div>
                <p className="text-lg sm:text-xl font-medium text-gray-900">
                  Decisão no feeling
                </p>
                <p className="text-gray-600 mt-1">
                  {'"Parece bom"'} não paga as contas. Sem números, qualquer imóvel vira aposta.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-bold">
                2
              </span>
              <div>
                <p className="text-lg sm:text-xl font-medium text-gray-900">
                  Planilhas incompletas
                </p>
                <p className="text-gray-600 mt-1">
                  Cada um monta a sua, esquece custos, erra fórmula. O erro só aparece no final.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-bold">
                3
              </span>
              <div>
                <p className="text-lg sm:text-xl font-medium text-gray-900">
                  Custos escondidos
                </p>
                <p className="text-gray-600 mt-1">
                  ITBI, cartório, comissão, financiamento. O que não tá na conta come o lucro.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <hr className="border-gray-200" />
      </div>

      {/* Slide 3: The Invisible Costs Villain */}
      <section
        data-slide="3"
        className="min-h-screen flex items-center justify-center px-6"
      >
        {/*
          SPEAKER NOTES:
          - Dê números reais se possível: "R$15k de ITBI que ninguém contou"
          - Mencione o tempo de giro: dinheiro parado = custo de oportunidade
          - Pergunte: "Quantos seguidores seus já passaram por isso?"
        */}
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 mb-6">
            O vilão
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-10">
            Custo invisível + estimativa errada
            <br />
            <span className="text-gray-400">= prejuízo silencioso</span>
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="group border border-gray-200 rounded-xl p-6 bg-white hover:border-red-200 hover:shadow-lg hover:shadow-red-50 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center mb-4">
                <span className="text-red-600 text-xl">📈</span>
              </div>
              <p className="text-xl font-bold text-gray-900 mb-2">Obra estoura</p>
              <p className="text-gray-600">
                Estimativa otimista demais. Imprevistos viram rombo no orçamento.
              </p>
            </div>
            <div className="group border border-gray-200 rounded-xl p-6 bg-white hover:border-orange-200 hover:shadow-lg hover:shadow-orange-50 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center mb-4">
                <span className="text-orange-600 text-xl">💸</span>
              </div>
              <p className="text-xl font-bold text-gray-900 mb-2">Taxas esquecidas</p>
              <p className="text-gray-600">
                ITBI, registro, escritura, comissão. Cada uma parece pequena. Juntas, matam.
              </p>
            </div>
            <div className="group border border-gray-200 rounded-xl p-6 bg-white hover:border-yellow-200 hover:shadow-lg hover:shadow-yellow-50 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center mb-4">
                <span className="text-yellow-600 text-xl">⏳</span>
              </div>
              <p className="text-xl font-bold text-gray-900 mb-2">Tempo de giro</p>
              <p className="text-gray-600">
                Flip que demora 12 meses em vez de 6 dobra o custo de oportunidade.
              </p>
            </div>
            <div className="group border border-gray-200 rounded-xl p-6 bg-white hover:border-purple-200 hover:shadow-lg hover:shadow-purple-50 transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
                <span className="text-purple-600 text-xl">🏷️</span>
              </div>
              <p className="text-xl font-bold text-gray-900 mb-2">Preço de saída</p>
              <p className="text-gray-600">
                Superestimar o valor de venda é o erro mais comum. E mais caro.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <hr className="border-gray-200" />
      </div>

      {/* Slide 4: Before/After (Financial) */}
      <section
        data-slide="4"
        className="min-h-screen flex items-center justify-center px-6"
      >
        {/*
          SPEAKER NOTES:
          - Conecte com o universo dela: "Você mostra o antes/depois visual. Esse é o financeiro."
          - Enfatize que não é planilha bonitinha, é decisão informada
          - Deixe ela imaginar os seguidores usando isso
        */}
        <div className="max-w-4xl w-full">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 mb-6 text-center">
            Antes x Depois
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-12 text-center">
            O {'"antes e depois"'} que ninguém posta:
            <br />
            <span className="text-gray-400">o financeiro</span>
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Before */}
            <div className="bg-gray-100 rounded-lg p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 mb-4">
                Antes
              </p>
              <ul className="space-y-4 text-gray-700">
                <li className="flex items-center gap-3">
                  <span className="text-red-500 text-xl">✕</span>
                  Planilha quebrada, fórmulas erradas
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-red-500 text-xl">✕</span>
                  Feeling: {'"acho que dá lucro"'}
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-red-500 text-xl">✕</span>
                  Custos descobertos só no final
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-red-500 text-xl">✕</span>
                  ROI real: surpresa (geralmente ruim)
                </li>
              </ul>
            </div>
            {/* After */}
            <div className="bg-gray-900 text-white rounded-lg p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400 mb-4">
                Depois
              </p>
              <ul className="space-y-4 text-gray-200">
                <li className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">✓</span>
                  Viabilidade clara antes de comprar
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">✓</span>
                  Todos os custos visíveis, nada escondido
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">✓</span>
                  ROI, lucro líquido, break-even em 30 segundos
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">✓</span>
                  Decisão informada, não aposta
                </li>
              </ul>
            </div>
          </div>
          {/* Screenshot with device frame */}
          <div className="mt-12">
            <p className="text-center text-sm font-medium text-gray-500 uppercase tracking-wide mb-6">
              Análise real no Meuflip
            </p>
            <div className="relative mx-auto max-w-4xl">
              {/* Browser frame */}
              <div className="bg-gray-800 rounded-t-xl px-4 py-3 flex items-center gap-2">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-gray-700 rounded-md px-3 py-1 text-xs text-gray-400 max-w-xs mx-auto">
                    meuflip.com.br/imoveis/analise
                  </div>
                </div>
              </div>
              {/* Screenshot */}
              <div className="rounded-b-xl overflow-hidden shadow-2xl shadow-gray-400/20 border border-gray-200 border-t-0">
                <Image
                  src="/screenshots/viability-new.png"
                  alt="Análise de viabilidade no Meuflip - ROI, custos e lucro calculados automaticamente"
                  width={1440}
                  height={900}
                  className="w-full"
                />
              </div>
              {/* Glow effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 rounded-2xl -z-10 blur-xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <hr className="border-gray-200" />
      </div>

      {/* Slide 5: Market Trend */}
      <section
        data-slide="5"
        className="min-h-screen flex items-center justify-center px-6"
      >
        {/*
          SPEAKER NOTES:
          - Referencie o movimento do mercado: cursos viraram commodity
          - G4 é exemplo de transição: educação → plataforma de execução
          - Posicione ela como visionária: "Você já tem o conteúdo. Falta a ferramenta."
        */}
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 mb-6">
            Tendência
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-10">
            Educação virou commodity.
            <br />
            <span className="text-gray-400">Execução virou vantagem.</span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed mb-8">
            O mercado mudou. Tem curso de tudo, em todo lugar. A diferença não está mais em
            quem ensina — está em quem ajuda a executar. O G4 entendeu isso: saiu de
            {' "educação para empreendedores" '} para {'"plataforma de gestão"'}. Quem segura a mão
            do aluno na hora da ação ganha a confiança de verdade.
          </p>
          <div className="bg-gray-100 rounded-lg p-8">
            <p className="text-xl sm:text-2xl font-bold text-gray-900">
              {'"Conteúdo forma.'}
              <br />
              {'Ferramenta sustenta a decisão."'}
            </p>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <hr className="border-gray-200" />
      </div>

      {/* Slide 6: What is Meuflip */}
      <section
        data-slide="6"
        className="min-h-screen flex items-center justify-center px-6"
      >
        {/*
          SPEAKER NOTES:
          - Seja direto: 1 frase sobre o que é
          - Não entre em features técnicas demais
          - Mostre o screenshot se possível (ou descreva em 30s)
        */}
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 mb-6">
            O que é
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-10">
            Meuflip é o sistema de decisão do flip
          </h2>
          <ul className="space-y-6 mb-12">
            <li className="flex items-start gap-4">
              <span className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold">
                1
              </span>
              <div>
                <p className="text-xl font-medium text-gray-900">
                  Analisa antes de comprar
                </p>
                <p className="text-gray-600 mt-1">
                  Cole a URL do anúncio, veja se vale a pena em segundos.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <span className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold">
                2
              </span>
              <div>
                <p className="text-xl font-medium text-gray-900">
                  Torna custos visíveis
                </p>
                <p className="text-gray-600 mt-1">
                  ITBI, cartório, comissão, reforma — tudo calculado automaticamente.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <span className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold">
                3
              </span>
              <div>
                <p className="text-xl font-medium text-gray-900">
                  Reduz decisões ruins
                </p>
                <p className="text-gray-600 mt-1">
                  Score de viabilidade, ROI real, comparativo à vista vs financiado.
                </p>
              </div>
            </li>
          </ul>
          {/* Screenshot with device frame */}
          <div className="relative mx-auto max-w-4xl">
            {/* Browser frame */}
            <div className="bg-gray-800 rounded-t-xl px-4 py-3 flex items-center gap-2">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-gray-700 rounded-md px-3 py-1 text-xs text-gray-400 max-w-xs mx-auto">
                  meuflip.com.br/dashboard
                </div>
              </div>
            </div>
            {/* Screenshot */}
            <div className="rounded-b-xl overflow-hidden shadow-2xl shadow-gray-400/20 border border-gray-200 border-t-0">
              <Image
                src="/screenshots/dashboard-new.png"
                alt="Dashboard do Meuflip - visão geral de imóveis, pipeline e atividades"
                width={1440}
                height={900}
                className="w-full"
              />
            </div>
            {/* Glow effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 rounded-2xl -z-10 blur-xl" />
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <hr className="border-gray-200" />
      </div>

      {/* Slide 7: Synergy */}
      <section
        data-slide="7"
        className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-b from-gray-50 to-white"
      >
        {/*
          SPEAKER NOTES:
          - Importante: deixe claro que a ferramenta não substitui o trabalho dela
          - Posicione como amplificador do método que ela já ensina
          - Pergunte: "Faz sentido pra sua audiência?"
        */}
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600 mb-6">
            Sinergia
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4">
            Como arquiteta, você já sabe:
          </h2>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-10">
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              flip de sucesso começa na análise.
            </span>
          </h2>
          <p className="text-lg text-gray-600 mb-10">
            O Meuflip garante que os números confirmem o que seu olho treinado vê.
          </p>
          <ul className="space-y-6">
            <li className="flex items-start gap-4 bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <span className="text-emerald-600 text-xl">🎯</span>
              </div>
              <div>
                <p className="text-xl font-medium text-gray-900">
                  Aumenta a confiança do seguidor
                </p>
                <p className="text-gray-600 mt-1">
                  Quem aplica seu método com uma ferramenta profissional erra menos e confia mais em você.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4 bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                <span className="text-teal-600 text-xl">🛡️</span>
              </div>
              <div>
                <p className="text-xl font-medium text-gray-900">
                  Reduz erros de iniciante
                </p>
                <p className="text-gray-600 mt-1">
                  Os custos que você ensina a considerar já estão no sistema. Ninguém esquece.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4 bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <span className="text-emerald-600 text-xl">🔄</span>
              </div>
              <div>
                <p className="text-xl font-medium text-gray-900">
                  Transforma método em sistema repetível
                </p>
                <p className="text-gray-600 mt-1">
                  O que você ensina em vídeo vira processo estruturado dentro da plataforma.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <hr className="border-gray-200" />
      </div>

      {/* Slide 8: Partnership Model - 50/50 Growth */}
      <section
        data-slide="8"
        className="min-h-screen flex items-center justify-center px-6 py-16"
      >
        <div className="max-w-5xl w-full">
          <p className="text-emerald-600 text-xs font-semibold tracking-widest uppercase mb-4 text-center">
            A Oportunidade
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-12">
            <span className="text-gray-800">Crescer juntos com </span>
            <span className="text-gradient-emerald">revenue share 50/50</span>
          </h2>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Revenue Model Card */}
            <div className="relative rounded-2xl p-6 overflow-hidden bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200">
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-display text-xl font-bold text-emerald-600 mb-1">Revenue Share 50/50</p>
                    <p className="text-sm text-gray-500">Crescemos juntos, dividimos os ganhos</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-3xl font-bold text-gradient-emerald">~R$ 460</p>
                    <p className="text-xs text-gray-400">por assinante/ano (sua parte)</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-emerald-100">
                  <div className="flex items-center justify-between text-base">
                    <span className="text-gray-600">Se conseguirmos 100 assinantes:</span>
                    <span className="font-display text-xl font-bold text-gradient-emerald">~R$ 46.000/ano</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Ticket médio anual: ~R$ 920 (mix mensal + anual) • Você fica com 50%
                </p>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-4">
              {[
                { title: 'Diferencial competitivo', desc: 'Ferramenta exclusiva que outros perfis não têm.' },
                { title: 'Autoridade técnica', desc: 'Mostra que você se preocupa com resultado, não só visual.' },
                { title: 'Receita recorrente', desc: 'Ganha enquanto dorme com assinaturas ativas.' },
                { title: 'Crescimento conjunto', desc: 'Quanto mais cresce, mais a gente ganha junto.' },
              ].map((item, i) => (
                <div key={i} className="glass-card rounded-xl p-4 flex items-start gap-4">
                  <span className="text-emerald-500 mt-0.5 scale-110">{Icons.target}</span>
                  <div>
                    <p className="text-base font-semibold text-gray-800">{item.title}</p>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-sm text-gray-400 mt-8">
            Modelo flexível — podemos ajustar conforme fizer sentido pra ambos.
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <hr className="border-gray-200" />
      </div>

      {/* Slide 9: Growth Partnership */}
      <section
        data-slide="9"
        className="min-h-screen flex items-center justify-center px-6 py-16 bg-gradient-to-b from-emerald-50/30 to-white"
      >
        <div className="max-w-5xl w-full">
          <p className="text-emerald-600 text-xs font-semibold tracking-widest uppercase mb-4 text-center">
            Parceria 50/50
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-12">
            <span className="text-gray-800">Você divulga. </span>
            <span className="text-gradient-emerald">Eu construo. A gente cresce junto.</span>
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Amanda's side */}
            <div className="relative">
              <div className="absolute -inset-[1px] bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-400 rounded-2xl opacity-60" />
              <div className="relative bg-white rounded-2xl p-6">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-400 to-teal-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-5">
                  AMANDA
                </div>
                <ul className="space-y-4">
                  {[
                    { bold: 'Olho de arquiteta', text: 'vê potencial onde outros veem problema' },
                    { bold: 'Conhecimento local', text: 'domina o mercado de BH' },
                    { bold: 'Cases reais', text: 'transforma e inspira' },
                    { bold: 'Comunidade', text: 'engajada e crescendo' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-base text-gray-600">
                      <span className="text-emerald-500 mt-0.5 text-lg">→</span>
                      <span><strong className="text-gray-800">{item.bold}</strong> {item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Bruno's side */}
            <div className="relative">
              <div className="absolute -inset-[1px] bg-gradient-to-br from-gray-600 via-gray-700 to-gray-600 rounded-2xl opacity-60" />
              <div className="relative bg-gray-800 rounded-2xl p-6">
                <div className="inline-flex items-center gap-2 bg-white text-gray-800 text-xs font-bold px-3 py-1 rounded-full mb-5">
                  BRUNO / MEUFLIP
                </div>
                <ul className="space-y-4">
                  {[
                    { bold: 'Produto', text: 'funcional e em evolução' },
                    { bold: 'Tecnologia', text: 'features sob medida pra você' },
                    { bold: 'Suporte', text: 'dedicado para seus seguidores' },
                    { bold: 'Skin in the game', text: '50/50 = risco e ganho junto' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-base text-gray-300">
                      <span className="text-emerald-400 mt-0.5 text-lg">→</span>
                      <span><strong className="text-white">{item.bold}</strong> {item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-10 text-center">
            <div className="inline-flex items-center gap-3 bg-white rounded-full px-6 py-3 border border-emerald-200 shadow-sm">
              <span className="text-emerald-500 scale-110">{Icons.heart}</span>
              <p className="text-base text-gray-600">
                <strong className="text-gray-800">Não é sobre tamanho de audiência</strong> — é sobre construir algo juntos
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <hr className="border-gray-200" />
      </div>

      {/* Slide 10: Closing CTA */}
      <section
        data-slide="10"
        className="min-h-screen flex items-center justify-center px-6 py-16 bg-gradient-to-b from-white via-emerald-50/30 to-teal-50/30"
      >
        <div className="max-w-3xl text-center">
          <p className="text-emerald-600 text-xs font-semibold tracking-widest uppercase mb-4">
            Próximo Passo
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-8">
            <span className="text-gray-800">Amanda, </span>
            <span className="text-gradient-emerald">vamos crescer juntos?</span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed mb-4">
            Você tem o olho treinado pra transformar imóveis. Eu tenho a ferramenta pra
            garantir que a análise financeira seja tão boa quanto o visual.
          </p>
          <p className="text-lg sm:text-xl text-gray-700 font-medium mb-10">
            Não é sobre tamanho de audiência. É sobre construir algo de valor — juntos.
          </p>

          {/* CTA Button */}
          <a
            href="https://wa.me/5541984297378?text=Oi%20Bruno!%20Vi%20o%20deck%20do%20Meuflip%20e%20quero%20conversar."
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center gap-3 font-display text-base font-bold px-10 py-5 rounded-xl transition-all duration-300 hover:scale-105 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 text-white shadow-lg hover:shadow-xl hover:shadow-emerald-200"
          >
            <span className="text-emerald-100">{Icons.whatsapp}</span>
            <span>Vamos conversar</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>

          <p className="text-sm text-gray-400 mt-5">
            Zero compromisso. Só uma conversa pra ver se faz sentido.
          </p>

          {/* Footer */}
          <div className="mt-14 pt-6 border-t border-gray-200/60">
            <p className="text-base text-gray-600 font-medium">meuflip.com.br</p>
            <p className="text-sm text-gray-400 mt-1">
              Feito especialmente para{" "}
              <a
                href="https://instagram.com/amandaportilho.hf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-500 hover:text-emerald-600 font-medium"
              >
                @amandaportilho.hf
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* WhatsApp Float Button */}
      <a
        href="https://wa.me/5541984297378"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        aria-label="Fale conosco no WhatsApp"
      >
        {Icons.whatsapp}
      </a>
    </div>
  );
}
