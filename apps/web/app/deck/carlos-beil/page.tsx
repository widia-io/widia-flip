"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const TOTAL_SLIDES = 10;

// Premium SVG Icons
const Icons = {
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
  alertTriangle: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
      <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
    </svg>
  ),
  trendUp: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M23 6l-9.5 9.5-5-5L1 18" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 6h6v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  trendDown: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M23 18l-9.5-9.5-5 5L1 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 18h6v-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  dollarOff: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 4l16 16" strokeLinecap="round" strokeWidth="2" />
    </svg>
  ),
  clock: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" strokeLinecap="round" />
    </svg>
  ),
  tag: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <circle cx="7" cy="7" r="1.5" fill="currentColor" />
    </svg>
  ),
  users: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  instagram: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="18" cy="6" r="1" fill="currentColor" />
    </svg>
  ),
  crown: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 17l3-12 5 6 4-8 4 8 5-6 3 12H2z" />
      <path d="M2 17h20v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3z" />
    </svg>
  ),
  whatsapp: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  ),
  search: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
    </svg>
  ),
  eye: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  checkCircle: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  zap: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  lock: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  chart: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export default function CarlosBeilDeckPage() {
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
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900 overflow-x-hidden font-body">
      {/* Custom Styles */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Syne:wght@400;500;600;700;800&display=swap');

        .font-display { font-family: 'Syne', sans-serif; }
        .font-body { font-family: 'Space Grotesk', sans-serif; }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.02); }
        }

        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes reveal-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes scroll-bounce {
          0%, 100% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(6px); opacity: 0.5; }
        }

        @keyframes ring-pulse {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.5); opacity: 0; }
        }

        @keyframes cta-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.3), 0 0 40px rgba(251, 191, 36, 0.1); }
          50% { box-shadow: 0 0 30px rgba(251, 191, 36, 0.5), 0 0 60px rgba(251, 191, 36, 0.2); }
        }

        @keyframes number-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 4s ease-in-out infinite; }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient-shift 6s ease infinite;
        }
        .animate-reveal { animation: reveal-up 0.6s ease-out forwards; }
        .animate-scroll { animation: scroll-bounce 1.5s ease-in-out infinite; }
        .animate-ring { animation: ring-pulse 1.5s ease-out infinite; }
        .animate-cta-glow { animation: cta-glow 2s ease-in-out infinite; }
        .animate-number { animation: number-pulse 3s ease-in-out infinite; }

        .noise-overlay {
          display: none;
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .glass-card-hover {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .glass-card-hover:hover {
          background: rgba(255, 255, 255, 0.95);
          border-color: rgba(217, 119, 6, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(217, 119, 6, 0.12);
        }

        .text-gradient-gold {
          background: linear-gradient(135deg, #d97706 0%, #b45309 50%, #92400e 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .text-gradient-red {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .text-gradient-green {
          background: linear-gradient(135deg, #16a34a 0%, #15803d 50%, #166534 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .stat-glow {
          position: relative;
        }
        .stat-glow::after {
          content: '';
          position: absolute;
          inset: -8px;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.1) 0%, transparent 70%);
          border-radius: 50%;
          z-index: -1;
        }

        .danger-glow::after {
          background: radial-gradient(circle, rgba(220, 38, 38, 0.1) 0%, transparent 70%);
        }

        .screenshot-hover {
          transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .screenshot-hover:hover {
          transform: scale(1.02);
        }

        .card-icon {
          transition: all 0.3s ease;
        }
        .group:hover .card-icon {
          transform: scale(1.1);
          filter: drop-shadow(0 0 8px currentColor);
        }

        .urgency-badge {
          background: linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(185, 28, 28, 0.05) 100%);
          border: 1px solid rgba(220, 38, 38, 0.2);
        }
      `}</style>

      {/* Noise Overlay */}
      <div className="noise-overlay" />

      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-amber-400/20 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-orange-300/15 rounded-full blur-[120px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Sticky Progress Indicator */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/60">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-amber-500 animate-ring" />
            </div>
            <span className="text-xs font-medium text-gray-500 tracking-wider uppercase">
              Meuflip × <span className="text-gradient-gold font-semibold">Carlos Beil</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-display text-xs font-bold text-gradient-gold">
              {String(currentSlide).padStart(2, '0')}
            </span>
            <div className="w-20 h-0.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${(currentSlide / TOTAL_SLIDES) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">{TOTAL_SLIDES}</span>
          </div>
        </div>
      </header>

      {/* ============================================ */}
      {/* SLIDE 1: HOOK - OPORTUNIDADE */}
      {/* ============================================ */}
      <section
        data-slide="1"
        className="min-h-screen flex items-center justify-center px-4 pt-16 relative"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-amber-100/50 via-transparent to-orange-50/30" />

        <div className={`max-w-3xl text-center relative z-10 ${mounted ? 'animate-reveal' : 'opacity-0'}`}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-1.5 mb-6 border border-amber-200 shadow-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-[10px] text-green-600 font-medium uppercase tracking-wider">Proposta</span>
            </div>
            <div className="w-px h-3 bg-gray-200" />
            <span className="text-xs text-gray-500">
              Parceria exclusiva • Janeiro 2026
            </span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold leading-[1.15] mb-5 tracking-tight">
            <span className="block text-gray-800">
              Você ensina o método.
            </span>
            <span className="block text-gradient-gold mt-1">
              E se pudesse entregar a ferramenta também?
            </span>
          </h1>

          <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-lg mx-auto mb-8">
            Carlos, você formou <span className="text-amber-600 font-semibold">3.500+ flippers</span> no Brasil.
            Criou literalmente o mercado de house flipping aqui. Agora imagine dar aos seus alunos
            a ferramenta que transforma o método em <span className="text-gray-800 font-medium">execução com precisão</span>.
          </p>

          {/* Stats Row */}
          <div className="flex flex-wrap justify-center gap-8 sm:gap-12">
            <div className="text-center stat-glow">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className="text-amber-500">{Icons.instagram}</span>
                <p className="font-display text-2xl sm:text-3xl font-bold text-gradient-gold">625K</p>
              </div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Seguidores</p>
            </div>
            <div className="text-center stat-glow">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className="text-amber-500">{Icons.users}</span>
                <p className="font-display text-2xl sm:text-3xl font-bold text-gradient-gold">3.500+</p>
              </div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Alunos formados</p>
            </div>
            <div className="text-center stat-glow">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className="text-amber-500">{Icons.crown}</span>
                <p className="font-display text-2xl sm:text-3xl font-bold text-gradient-gold">#1</p>
              </div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">House Flipping BR</p>
            </div>
          </div>

          {/* Revenue Potential Highlight */}
          <div className="mt-10 inline-flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-full px-6 py-3 border border-amber-200/60 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-amber-500">{Icons.trendUp}</span>
              <span className="text-sm text-gray-600">Potencial com 500 alunos:</span>
            </div>
            <span className="font-display text-xl font-bold text-gradient-gold">~R$ 230K/ano</span>
            <span className="text-[10px] text-gray-400 bg-white/80 px-2 py-0.5 rounded-full">50/50</span>
          </div>
        </div>

        {/* Animated Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-[10px] text-gray-400 tracking-widest uppercase">Role para explorar</span>
          <div className="w-5 h-8 rounded-full border border-gray-300 flex justify-center pt-2">
            <div className="w-1 h-1.5 bg-amber-500 rounded-full animate-scroll" />
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* SLIDE 2: O PROBLEMA DOS ALUNOS */}
      {/* ============================================ */}
      <section
        data-slide="2"
        className="py-24 lg:py-32 flex items-center justify-center px-4"
      >
        <div className="max-w-4xl w-full">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Left: Content */}
            <div>
              <p className="text-amber-600 text-[10px] font-semibold tracking-widest uppercase mb-3">
                O Desafio
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold leading-[1.15] mb-4 text-gray-800">
                O método é sólido.
                <span className="block text-gray-300">A execução é o gargalo.</span>
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                Seus alunos aprendem a teoria, mas na hora de analisar um imóvel real,
                cada um monta sua própria planilha. Uns esquecem ITBI, outros erram
                a comissão, e o resultado varia muito.
              </p>
              <div className="glass-card rounded-xl p-4 border-l-2 border-amber-500">
                <p className="text-sm text-gray-600 italic">
                  &quot;E se todos os seus alunos tivessem acesso à mesma ferramenta
                  profissional de análise?&quot;
                </p>
              </div>
            </div>

            {/* Right: Problems */}
            <div className="space-y-3">
              {[
                { num: '01', title: 'Cada um faz do seu jeito', desc: 'Sem padronização, a qualidade da análise depende de cada aluno. Resultados inconsistentes.', accent: 'amber' },
                { num: '02', title: 'Custos esquecidos', desc: 'ITBI, cartório, comissão, financiamento. É fácil esquecer algo quando monta na mão.', accent: 'orange' },
                { num: '03', title: 'Difícil de escalar', desc: 'Como garantir que 3.500+ alunos façam análise consistente? Só com ferramenta dedicada.', accent: 'amber' },
              ].map((item, i) => (
                <div
                  key={i}
                  className="glass-card glass-card-hover rounded-xl p-4 group cursor-default"
                >
                  <div className="flex items-start gap-3">
                    <span className={`font-display text-lg font-bold text-${item.accent}-300 group-hover:text-${item.accent}-500 transition-colors`}>
                      {item.num}
                    </span>
                    <div>
                      <p className="font-display text-sm font-semibold text-gray-800 mb-0.5">
                        {item.title}
                      </p>
                      <p className="text-gray-500 text-xs leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* SLIDE 3: OS CUSTOS QUE PEGAM */}
      {/* ============================================ */}
      <section
        data-slide="3"
        className="py-24 lg:py-32 flex items-center justify-center px-4 relative"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-orange-100/50 via-transparent to-amber-50/30" />

        <div className="max-w-4xl w-full relative z-10">
          <div className="text-center mb-10">
            <p className="text-orange-600 text-[10px] font-semibold tracking-widest uppercase mb-2">
              O Que o Meuflip Resolve
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold leading-[1.15] text-gray-800">
              Custos que passam batido
              <span className="block text-gray-300 text-lg sm:text-xl mt-2">na análise manual</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { icon: Icons.trendUp, title: 'Contingência de obra', desc: 'Imprevistos acontecem. Sem margem calculada, qualquer surpresa vira prejuízo.', color: 'text-orange-500' },
              { icon: Icons.dollarOff, title: 'Taxas e impostos', desc: 'ITBI (~3%), cartório (~1.5%), comissão (~6%). Somam mais de 10% do valor.', color: 'text-amber-500' },
              { icon: Icons.clock, title: 'Custo de carrego', desc: 'IPTU, condomínio, seguro enquanto o imóvel não vende. Meses a mais = margem menor.', color: 'text-yellow-600' },
              { icon: Icons.tag, title: 'Preço de saída realista', desc: 'O Meuflip ajuda a estimar valor de venda com base no mercado, não no otimismo.', color: 'text-purple-500' },
            ].map((item, i) => (
              <div
                key={i}
                className="glass-card glass-card-hover rounded-xl p-4 group"
              >
                <div className={`${item.color} card-icon mb-2`}>{item.icon}</div>
                <p className="font-display text-base font-semibold text-gray-800 mb-1">{item.title}</p>
                <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Tudo isso calculado automaticamente em <span className="text-amber-600 font-semibold">30 segundos</span>.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* SLIDE 4: O QUE O MEUFLIP FAZ */}
      {/* ============================================ */}
      <section
        data-slide="4"
        className="py-24 lg:py-32 flex items-center justify-center px-4 relative"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-purple-100/30 via-transparent to-transparent" />

        <div className="max-w-2xl relative z-10">
          <p className="text-purple-600 text-[10px] font-semibold tracking-widest uppercase mb-2">
            Tendência de Mercado
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold leading-[1.15] mb-4 text-gray-800">
            Educação virou <span className="text-gradient-gold">commodity.</span>
          </h2>
          <h3 className="font-display text-xl sm:text-2xl font-semibold text-gray-300 mb-6">
            Execução virou vantagem.
          </h3>

          <p className="text-sm text-gray-500 leading-relaxed mb-8 max-w-lg">
            O mercado mudou. Tem curso de tudo, em todo lugar. A diferença não está mais em
            quem ensina — está em quem ajuda a executar. Quem dá ferramenta pro aluno aplicar
            na prática ganha a confiança de verdade.
          </p>

          <div className="glass-card rounded-xl p-5 border-l-2 border-amber-500">
            <p className="font-display text-base sm:text-lg font-semibold text-gray-700 leading-snug">
              &quot;Conteúdo forma.
              <span className="block text-gradient-gold mt-0.5">Ferramenta sustenta a decisão.&quot;</span>
            </p>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* SLIDE 5: ANTES/DEPOIS REFORMULADO */}
      {/* ============================================ */}
      <section
        data-slide="5"
        className="py-24 lg:py-32 flex items-center justify-center px-4"
      >
        <div className="max-w-4xl w-full">
          <div className="text-center mb-10">
            <p className="text-amber-600 text-[10px] font-semibold tracking-widest uppercase mb-2">
              Transformação
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold leading-[1.15] text-gray-800">
              O que muda pros
              <span className="text-gradient-gold"> seus alunos</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-10">
            {/* Before */}
            <div className="bg-red-50 rounded-xl p-5 border border-red-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[10px] text-red-600 tracking-widest uppercase font-medium">Sem Meuflip</span>
              </div>
              <ul className="space-y-2.5">
                {[
                  'Planilha do Excel, cada um faz a sua',
                  '"Acho que dá 15% de lucro"',
                  'Descobre ITBI depois de assinar',
                  'Sem visão clara dos custos reais',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <span className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-[9px] shrink-0">✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* After */}
            <div className="bg-green-50 rounded-xl p-5 border border-green-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[10px] text-green-600 tracking-widest uppercase font-medium">Com Meuflip</span>
              </div>
              <ul className="space-y-2.5">
                {[
                  'Ferramenta profissional, padronizada',
                  'ROI real calculado: 8.3% (com todos custos)',
                  'ITBI, cartório, comissão — tudo visível',
                  'Primeiro flip: decisão informada',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <span className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-[9px] shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Screenshot with hover zoom */}
          <div className="relative group">
            <div className="absolute -inset-3 bg-gradient-to-r from-green-200/50 via-amber-100/30 to-green-200/50 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity" />
            <div className="relative bg-white rounded-xl overflow-hidden shadow-lg border border-gray-200 screenshot-hover">
              <div className="bg-gray-100 px-3 py-2 flex items-center gap-2 border-b border-gray-200">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-6">
                  <div className="bg-white rounded px-3 py-1 text-[10px] text-gray-400 max-w-[200px] mx-auto text-center border border-gray-200">
                    meuflip.com.br/imoveis/analise
                  </div>
                </div>
              </div>
              <Image
                src="/screenshots/viability-new.png"
                alt="Análise de viabilidade no Meuflip"
                width={1440}
                height={900}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* SLIDE 6: O QUE É O MEUFLIP */}
      {/* ============================================ */}
      <section
        data-slide="6"
        className="py-24 lg:py-32 flex items-center justify-center px-4"
      >
        <div className="max-w-4xl w-full">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-1.5 bg-white rounded-full px-3 py-1 mb-3 border border-gray-200 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">A Ferramenta</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold leading-[1.15] text-gray-800">
              Meuflip é o
              <span className="block text-gradient-gold">co-piloto de análise do flip</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-3 mb-10">
            {[
              { icon: Icons.zap, num: '01', title: 'Cola a URL, vê o resultado', desc: 'Em 30 segundos, seu aluno sabe se o deal vale a pena.' },
              { icon: Icons.eye, num: '02', title: 'Todos os custos visíveis', desc: 'ITBI, cartório, comissão, reforma — nada escondido.' },
              { icon: Icons.shield, num: '03', title: 'Protege de deal ruim', desc: 'Score de viabilidade + alerta de margem baixa.' },
            ].map((item, i) => (
              <div key={i} className="glass-card glass-card-hover rounded-xl p-4 text-center group">
                <div className="text-amber-400 group-hover:text-amber-500 transition-colors flex justify-center mb-2 card-icon">
                  {item.icon}
                </div>
                <span className="font-display text-2xl font-bold text-gray-200 block mb-2">
                  {item.num}
                </span>
                <p className="font-display text-sm font-semibold text-gray-800 mb-1">{item.title}</p>
                <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Screenshot */}
          <div className="relative group">
            <div className="absolute -inset-3 bg-gradient-to-r from-purple-200/50 via-amber-100/30 to-purple-200/50 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity" />
            <div className="relative bg-white rounded-xl overflow-hidden shadow-lg border border-gray-200 screenshot-hover">
              <div className="bg-gray-100 px-3 py-2 flex items-center gap-2 border-b border-gray-200">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-6">
                  <div className="bg-white rounded px-3 py-1 text-[10px] text-gray-400 max-w-[200px] mx-auto text-center border border-gray-200">
                    meuflip.com.br/dashboard
                  </div>
                </div>
              </div>
              <Image
                src="/screenshots/dashboard-new.png"
                alt="Dashboard do Meuflip"
                width={1440}
                height={900}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* SLIDE 7: PROPOSTA DE PARCERIA */}
      {/* ============================================ */}
      <section
        data-slide="7"
        className="py-24 lg:py-32 flex items-center justify-center px-4 relative"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100/50 via-transparent to-green-50/30" />

        <div className="max-w-3xl w-full relative z-10">
          <div className="text-center mb-8">
            <p className="text-amber-600 text-[10px] font-semibold tracking-widest uppercase mb-2">
              A Oportunidade
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold leading-[1.15] mb-3 text-gray-800">
              O que você ganha
              <span className="text-gradient-gold"> sendo parceiro</span>
            </h2>
          </div>

          <div className="space-y-3 mb-8">
            {/* Revenue projection */}
            <div className="relative rounded-xl p-5 overflow-hidden bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-display text-lg font-bold text-amber-600 mb-0.5">Revenue Share 50/50</p>
                    <p className="text-xs text-gray-500">Venda como se fosse seu produto</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl font-bold text-gradient-gold">~R$ 460</p>
                    <p className="text-[10px] text-gray-400">por aluno/ano (sua parte)</p>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-amber-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Se 500 alunos assinarem:</span>
                    <span className="font-display font-bold text-gradient-green">~R$ 230.000/ano</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-2">
                  Ticket médio anual: ~R$ 920 (mix mensal + anual) • Você fica com 50%
                </p>
              </div>
            </div>

            {/* Other benefits */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="glass-card rounded-xl p-4">
                <p className="font-display text-sm font-semibold text-gray-800 mb-1">Marca própria</p>
                <p className="text-xs text-gray-500">Apresente como &quot;Ferramenta do Método House Flipping&quot;.</p>
              </div>
              <div className="glass-card rounded-xl p-4">
                <p className="font-display text-sm font-semibold text-gray-800 mb-1">Controle total</p>
                <p className="text-xs text-gray-500">Você define preço, posicionamento e como vender.</p>
              </div>
              <div className="glass-card rounded-xl p-4">
                <p className="font-display text-sm font-semibold text-gray-800 mb-1">Suporte white-label</p>
                <p className="text-xs text-gray-500">Atendimento aos alunos com sua identidade.</p>
              </div>
              <div className="glass-card rounded-xl p-4">
                <p className="font-display text-sm font-semibold text-gray-800 mb-1">Features exclusivas</p>
                <p className="text-xs text-gray-500">Funcionalidades customizadas pro seu método.</p>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400">
            Modelo flexível — podemos ajustar conforme fizer sentido pra ambos.
          </p>
        </div>
      </section>

      {/* ============================================ */}
      {/* SLIDE 8: MODELO DE PARCERIA */}
      {/* ============================================ */}
      <section
        data-slide="8"
        className="py-24 lg:py-32 flex items-center justify-center px-4"
      >
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <p className="text-purple-600 text-[10px] font-semibold tracking-widest uppercase mb-2">
              Próximos Passos
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold leading-[1.15] text-gray-800">
              Como funciona
              <span className="text-gray-300"> na prática</span>
            </h2>
          </div>

          <div className="space-y-3">
            {[
              { phase: '1', title: 'Demo exclusiva (15 min)', desc: 'Te mostro o Meuflip ao vivo com um imóvel real. Você vê o valor antes de decidir qualquer coisa.', active: true },
              { phase: '2', title: 'Teste com 10 alunos', desc: 'Se fizer sentido, liberamos acesso gratuito pra um grupo piloto. Você colhe feedback real.', active: false },
              { phase: '3', title: 'Parceria oficial', desc: 'Código de desconto exclusivo, link de afiliado, co-marketing. Ganha-ganha.', active: false },
            ].map((item, i) => (
              <div
                key={i}
                className={`relative rounded-xl p-4 transition-all duration-300 ${
                  item.active
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300'
                    : 'glass-card hover:bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-display text-sm font-bold shrink-0 ${
                    item.active
                      ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {item.phase}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className={`font-display text-sm font-semibold mb-0.5 ${item.active ? 'text-amber-600' : 'text-gray-600'}`}>
                      {item.title}
                    </p>
                    <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              Zero compromisso na fase 1. Você só avança se fizer sentido.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* SLIDE 9: TROCA JUSTA */}
      {/* ============================================ */}
      <section
        data-slide="9"
        className="py-24 lg:py-32 flex items-center justify-center px-4 relative"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 via-transparent to-purple-50/30" />

        <div className="max-w-3xl w-full relative z-10">
          <div className="text-center mb-8">
            <p className="text-amber-600 text-[10px] font-semibold tracking-widest uppercase mb-2">
              Parceria 50/50
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold leading-[1.15] text-gray-800">
              Você vende.
              <span className="block text-gradient-gold mt-0.5">Eu construo. A gente divide.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {/* Carlos Side */}
            <div className="relative">
              <div className="absolute -inset-[1px] bg-gradient-to-br from-amber-400 via-orange-500 to-amber-400 rounded-xl animate-gradient opacity-60" />
              <div className="relative bg-white rounded-xl p-4">
                <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full mb-3">
                  CARLOS BEIL
                </div>
                <ul className="space-y-2">
                  {[
                    { bold: 'Distribuição', text: '625K + 3.500 alunos' },
                    { bold: 'Credibilidade', text: '#1 em house flipping BR' },
                    { bold: 'Vendas', text: 'posiciona e vende como seu' },
                    { bold: 'Feedback', text: 'direciona evolução do produto' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                      <span className="text-amber-500 mt-0.5">→</span>
                      <span><strong className="text-gray-800">{item.bold}</strong> {item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Bruno Side */}
            <div className="glass-card rounded-xl p-4">
              <div className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 text-[9px] font-bold px-2 py-0.5 rounded-full mb-3">
                BRUNO / MEUFLIP
              </div>
              <ul className="space-y-2">
                {[
                  { bold: 'Desenvolvimento', text: 'produto e novas features' },
                  { bold: 'Infraestrutura', text: 'servidores, segurança, uptime' },
                  { bold: 'Suporte técnico', text: 'bugs, dúvidas, onboarding' },
                  { bold: 'Skin in the game', text: '50/50 significa risco junto' },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="text-purple-500 mt-0.5">→</span>
                    <span><strong className="text-gray-800">{item.bold}</strong> {item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ */}
      {/* SLIDE 10: CTA */}
      {/* ============================================ */}
      <section
        data-slide="10"
        className="min-h-screen flex items-center justify-center px-4 py-20 relative"
      >
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-t from-amber-100/50 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-300/30 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-2xl text-center relative z-10">
          <p className="text-amber-600 text-[10px] font-semibold tracking-widest uppercase mb-3">
            Próximo Passo
          </p>

          <h2 className="font-display text-3xl sm:text-4xl font-bold leading-[1.1] mb-6">
            <span className="text-gray-800">Carlos,</span>
            <span className="block text-gradient-gold mt-1">vamos construir isso juntos?</span>
          </h2>

          <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto mb-3">
            Seus alunos já confiam em você pra aprender house flipping.
            Imagine dar a eles também uma ferramenta profissional de análise —
            com o selo do Método House Flipping.
          </p>

          <p className="text-sm text-gray-700 font-medium mb-8">
            Não precisa decidir agora. Mas se fizer sentido, quero construir isso contigo.
          </p>

          {/* Premium CTA Button */}
          <a
            href="https://wa.me/5541984297378?text=Oi%20Bruno!%20Vi%20o%20deck%20do%20Meuflip%20e%20quero%20conversar."
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center gap-2.5 font-display text-sm font-bold px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 text-white shadow-lg hover:shadow-xl hover:shadow-amber-200"
          >
            <span className="flex items-center gap-2.5">
              <span className="text-white">{Icons.whatsapp}</span>
              Vamos conversar
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </span>
          </a>

          {/* Footer */}
          <div className="mt-14 pt-5 border-t border-gray-200">
            <p className="font-display text-gray-700 font-semibold text-sm mb-0.5">
              meuflip.com.br
            </p>
            <p className="text-gray-400 text-[10px]">
              Feito especialmente para{" "}
              <a
                href="https://instagram.com/houseflipping.br"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-600 hover:text-amber-700 transition-colors"
              >
                @houseflipping.br
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
