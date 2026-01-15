"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";

const TOTAL_SLIDES = 10;

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
    <div className="min-h-screen bg-[#030303] text-white overflow-x-hidden">
      {/* Custom Styles */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Syne:wght@400;500;600;700;800&display=swap');

        .font-display { font-family: 'Syne', sans-serif; }
        .font-body { font-family: 'Space Grotesk', sans-serif; }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }

        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes reveal-up {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 4s ease-in-out infinite; }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient-shift 8s ease infinite;
        }
        .animate-reveal { animation: reveal-up 0.8s ease-out forwards; }
        .animate-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }

        .noise-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 100;
          opacity: 0.03;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .glass-card-hover:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(251, 191, 36, 0.3);
          box-shadow: 0 0 40px rgba(251, 191, 36, 0.1);
        }

        .text-gradient-gold {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .text-gradient-purple {
          background: linear-gradient(135deg, #a855f7 0%, #8b5cf6 50%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .glow-gold {
          box-shadow: 0 0 60px rgba(251, 191, 36, 0.3), 0 0 100px rgba(251, 191, 36, 0.1);
        }

        .glow-purple {
          box-shadow: 0 0 60px rgba(139, 92, 246, 0.3), 0 0 100px rgba(139, 92, 246, 0.1);
        }

        .border-glow-gold {
          position: relative;
        }
        .border-glow-gold::before {
          content: '';
          position: absolute;
          inset: -2px;
          background: linear-gradient(135deg, #fbbf24, #f59e0b, #d97706, #f59e0b, #fbbf24);
          background-size: 300% 300%;
          animation: gradient-shift 4s ease infinite;
          border-radius: inherit;
          z-index: -1;
          opacity: 0.7;
        }
      `}</style>

      {/* Noise Overlay */}
      <div className="noise-overlay" />

      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-3/4 left-1/3 w-64 h-64 bg-amber-400/5 rounded-full blur-[100px] animate-float" />
      </div>

      {/* Sticky Progress Indicator */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-body text-sm font-medium text-white/60 tracking-widest uppercase">
              Meuflip × <span className="text-gradient-gold font-semibold">Carlos Beil</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-display text-sm font-bold text-gradient-gold">
              {String(currentSlide).padStart(2, '0')}
            </span>
            <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 transition-all duration-700 ease-out rounded-full"
                style={{ width: `${(currentSlide / TOTAL_SLIDES) * 100}%` }}
              />
            </div>
            <span className="font-body text-sm text-white/40">
              {TOTAL_SLIDES}
            </span>
          </div>
        </div>
      </header>

      {/* Slide 1: Opening Thesis - HERO */}
      <section
        data-slide="1"
        className="min-h-screen flex items-center justify-center px-6 pt-20 relative"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-purple-500/5" />

        <div className={`max-w-5xl text-center relative z-10 ${mounted ? 'animate-reveal' : 'opacity-0'}`}>
          {/* Floating Badge */}
          <div className="inline-flex items-center gap-2 glass-card rounded-full px-5 py-2 mb-8">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="font-body text-sm text-white/70 tracking-wide">
              Proposta exclusiva para Carlos Beil
            </span>
          </div>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-8xl font-extrabold leading-[0.9] mb-8 tracking-tight">
            <span className="block text-white/90">
              Você ensina o método.
            </span>
            <span className="block text-gradient-gold mt-2">
              Eu entrego a ferramenta.
            </span>
          </h1>

          <p className="font-body text-lg sm:text-xl text-white/50 leading-relaxed max-w-2xl mx-auto mb-12">
            Carlos, você formou <span className="text-amber-400 font-semibold">3.500+ flippers</span> no Brasil.
            Criou literalmente o mercado de house flipping aqui. Agora imagine dar a ferramenta
            que seus alunos precisam pra executar com precisão.
          </p>

          {/* Stats Row */}
          <div className="flex flex-wrap justify-center gap-8 sm:gap-16">
            <div className="text-center">
              <p className="font-display text-4xl sm:text-5xl font-bold text-gradient-gold">625K</p>
              <p className="font-body text-sm text-white/40 mt-1">Seguidores</p>
            </div>
            <div className="text-center">
              <p className="font-display text-4xl sm:text-5xl font-bold text-gradient-gold">3.500+</p>
              <p className="font-body text-sm text-white/40 mt-1">Alunos</p>
            </div>
            <div className="text-center">
              <p className="font-display text-4xl sm:text-5xl font-bold text-gradient-gold">#1</p>
              <p className="font-body text-sm text-white/40 mt-1">em House Flipping BR</p>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="font-body text-xs text-white/30 tracking-widest uppercase">Scroll</span>
          <div className="w-6 h-10 rounded-full border border-white/20 flex justify-center p-2">
            <div className="w-1 h-2 bg-amber-400 rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* Slide 2: Reality Check */}
      <section
        data-slide="2"
        className="min-h-screen flex items-center justify-center px-6 py-20"
      >
        <div className="max-w-5xl w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: Content */}
            <div>
              <p className="font-body text-amber-400 text-sm font-semibold tracking-widest uppercase mb-4">
                O Problema
              </p>
              <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] mb-8">
                O lucro morre
                <span className="block text-white/30">na compra errada</span>
              </h2>
              <p className="font-body text-lg text-white/50 leading-relaxed">
                Seus alunos dominam o método. Mas na hora de analisar um imóvel,
                voltam pra planilha quebrada e decisão no feeling.
              </p>
            </div>

            {/* Right: Problems */}
            <div className="space-y-4">
              {[
                { num: '01', title: 'Decisão no feeling', desc: '"Parece bom" não paga as contas. Sem números, qualquer imóvel vira aposta.' },
                { num: '02', title: 'Planilhas incompletas', desc: 'Cada aluno monta a sua, esquece custos, erra fórmula. O erro só aparece no final.' },
                { num: '03', title: 'Custos escondidos', desc: 'ITBI, cartório, comissão, financiamento. O que não tá na conta come o lucro.' },
              ].map((item, i) => (
                <div key={i} className="glass-card glass-card-hover rounded-2xl p-6 transition-all duration-500 group cursor-default">
                  <div className="flex items-start gap-4">
                    <span className="font-display text-3xl font-bold text-amber-400/30 group-hover:text-amber-400 transition-colors">
                      {item.num}
                    </span>
                    <div>
                      <p className="font-display text-xl font-semibold text-white mb-1">
                        {item.title}
                      </p>
                      <p className="font-body text-white/50 text-sm leading-relaxed">
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

      {/* Slide 3: The Villain */}
      <section
        data-slide="3"
        className="min-h-screen flex items-center justify-center px-6 py-20 relative"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-orange-500/5" />

        <div className="max-w-5xl w-full relative z-10">
          <div className="text-center mb-16">
            <p className="font-body text-red-400 text-sm font-semibold tracking-widest uppercase mb-4">
              O Vilão
            </p>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1]">
              Custo invisível +<br />estimativa errada
              <span className="block text-white/20 text-3xl sm:text-4xl mt-4">= prejuízo silencioso</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: '📈', title: 'Obra estoura', desc: 'Estimativa otimista demais. Imprevistos viram rombo no orçamento.', color: 'red' },
              { icon: '💸', title: 'Taxas esquecidas', desc: 'ITBI, registro, escritura, comissão. Cada uma parece pequena. Juntas, matam.', color: 'orange' },
              { icon: '⏳', title: 'Tempo de giro', desc: 'Flip que demora 12 meses em vez de 6 dobra o custo de oportunidade.', color: 'yellow' },
              { icon: '🏷️', title: 'Preço de saída', desc: 'Superestimar o valor de venda é o erro mais comum. E mais caro.', color: 'purple' },
            ].map((item, i) => (
              <div
                key={i}
                className="glass-card rounded-2xl p-8 transition-all duration-500 hover:scale-[1.02] group"
                style={{
                  transitionDelay: `${i * 100}ms`,
                }}
              >
                <span className="text-4xl mb-4 block">{item.icon}</span>
                <p className="font-display text-2xl font-bold text-white mb-2">{item.title}</p>
                <p className="font-body text-white/50 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Slide 4: Before/After */}
      <section
        data-slide="4"
        className="min-h-screen flex items-center justify-center px-6 py-20"
      >
        <div className="max-w-6xl w-full">
          <div className="text-center mb-16">
            <p className="font-body text-amber-400 text-sm font-semibold tracking-widest uppercase mb-4">
              Transformação
            </p>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1]">
              O &quot;antes e depois&quot;<br />
              <span className="text-white/30">que ninguém posta</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-16">
            {/* Before */}
            <div className="bg-white/[0.02] rounded-3xl p-8 border border-white/5">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="font-body text-sm text-white/40 tracking-widest uppercase">Antes</span>
              </div>
              <ul className="space-y-5">
                {[
                  'Planilha quebrada, fórmulas erradas',
                  'Feeling: "acho que dá lucro"',
                  'Custos descobertos só no final',
                  'ROI real: surpresa (geralmente ruim)',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 font-body text-white/60">
                    <span className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-xs">✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* After */}
            <div className="relative rounded-3xl p-8 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-amber-600/10 to-orange-500/20" />
              <div className="absolute inset-[1px] bg-[#0a0a0a] rounded-3xl" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="font-body text-sm text-amber-400/80 tracking-widest uppercase">Depois</span>
                </div>
                <ul className="space-y-5">
                  {[
                    'Viabilidade clara antes de comprar',
                    'Todos os custos visíveis, nada escondido',
                    'ROI, lucro líquido, break-even em 30s',
                    'Decisão informada, não aposta',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-4 font-body text-white/80">
                      <span className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-xs">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Screenshot */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 via-purple-500/10 to-amber-500/20 rounded-3xl blur-2xl" />
            <div className="relative glass-card rounded-2xl overflow-hidden">
              <div className="bg-[#1a1a1a] px-4 py-3 flex items-center gap-3 border-b border-white/5">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 mx-8">
                  <div className="bg-white/5 rounded-lg px-4 py-1.5 text-xs text-white/40 font-body max-w-xs mx-auto text-center">
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

      {/* Slide 5: Market Trend */}
      <section
        data-slide="5"
        className="min-h-screen flex items-center justify-center px-6 py-20 relative"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-transparent" />

        <div className="max-w-4xl relative z-10">
          <p className="font-body text-purple-400 text-sm font-semibold tracking-widest uppercase mb-4">
            Tendência de Mercado
          </p>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-7xl font-bold leading-[1.0] mb-10">
            Educação virou<br />
            <span className="text-gradient-purple">commodity.</span>
          </h2>
          <h3 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white/30 mb-12">
            Execução virou vantagem.
          </h3>

          <p className="font-body text-lg text-white/50 leading-relaxed mb-12 max-w-2xl">
            O mercado mudou. Tem curso de tudo, em todo lugar. A diferença não está mais em
            quem ensina — está em quem ajuda a executar. O G4 entendeu isso. Quem segura a mão
            do aluno na hora da ação ganha a confiança de verdade.
          </p>

          <div className="glass-card rounded-2xl p-8">
            <p className="font-display text-2xl sm:text-3xl font-bold text-white/80 leading-tight">
              &quot;Conteúdo forma.
              <span className="block text-gradient-gold mt-2">Ferramenta sustenta a decisão.&quot;</span>
            </p>
          </div>
        </div>
      </section>

      {/* Slide 6: What is Meuflip */}
      <section
        data-slide="6"
        className="min-h-screen flex items-center justify-center px-6 py-20"
      >
        <div className="max-w-5xl w-full">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 glass-card rounded-full px-5 py-2 mb-6">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="font-body text-sm text-white/70">A Solução</span>
            </div>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1]">
              Meuflip é o
              <span className="block text-gradient-gold">sistema de decisão do flip</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {[
              { num: '01', title: 'Analisa antes de comprar', desc: 'Cole a URL do anúncio, veja se vale a pena em segundos.' },
              { num: '02', title: 'Torna custos visíveis', desc: 'ITBI, cartório, comissão, reforma — tudo calculado automaticamente.' },
              { num: '03', title: 'Reduz decisões ruins', desc: 'Score de viabilidade, ROI real, comparativo à vista vs financiado.' },
            ].map((item, i) => (
              <div key={i} className="glass-card glass-card-hover rounded-2xl p-8 transition-all duration-500 text-center group">
                <span className="font-display text-5xl font-bold text-amber-400/20 group-hover:text-amber-400/40 transition-colors block mb-4">
                  {item.num}
                </span>
                <p className="font-display text-xl font-semibold text-white mb-3">{item.title}</p>
                <p className="font-body text-white/50 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Screenshot */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 via-amber-500/10 to-purple-500/20 rounded-3xl blur-2xl" />
            <div className="relative glass-card rounded-2xl overflow-hidden">
              <div className="bg-[#1a1a1a] px-4 py-3 flex items-center gap-3 border-b border-white/5">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 mx-8">
                  <div className="bg-white/5 rounded-lg px-4 py-1.5 text-xs text-white/40 font-body max-w-xs mx-auto text-center">
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

      {/* Slide 7: Synergy */}
      <section
        data-slide="7"
        className="min-h-screen flex items-center justify-center px-6 py-20 relative"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-purple-500/5" />

        <div className="max-w-4xl relative z-10">
          <p className="font-body text-amber-400 text-sm font-semibold tracking-widest uppercase mb-4">
            Sinergia
          </p>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6">
            3.500 alunos<br />aplicando seu método.
          </h2>
          <h3 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-12">
            <span className="text-gradient-gold">
              Quantos têm ferramenta profissional?
            </span>
          </h3>

          <p className="font-body text-lg text-white/50 leading-relaxed mb-12">
            O Meuflip automatiza a análise de viabilidade que você ensina —
            sem planilha quebrada, sem custo esquecido.
          </p>

          <div className="space-y-4">
            {[
              { icon: '🎯', title: 'Aumenta a taxa de sucesso', desc: 'Quem aplica o Método House Flipping com ferramenta profissional erra menos e lucra mais.' },
              { icon: '🛡️', title: 'Elimina erros de iniciante', desc: 'Os custos que você ensina já estão no sistema. Ninguém esquece ITBI, cartório, comissão.' },
              { icon: '🔄', title: 'Transforma método em sistema', desc: 'O que você ensina nos módulos vira processo estruturado dentro da plataforma.' },
            ].map((item, i) => (
              <div key={i} className="glass-card glass-card-hover rounded-2xl p-6 transition-all duration-500">
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{item.icon}</span>
                  <div>
                    <p className="font-display text-xl font-semibold text-white mb-1">{item.title}</p>
                    <p className="font-body text-white/50 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Slide 8: Partnership Model */}
      <section
        data-slide="8"
        className="min-h-screen flex items-center justify-center px-6 py-20"
      >
        <div className="max-w-4xl w-full">
          <div className="text-center mb-16">
            <p className="font-body text-purple-400 text-sm font-semibold tracking-widest uppercase mb-4">
              Modelo de Parceria
            </p>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1]">
              Não é publi.
              <span className="block text-white/30">É co-criação.</span>
            </h2>
          </div>

          <div className="space-y-6">
            {[
              { phase: '1', title: 'Validação', desc: 'Carlos, você indica pro seus alunos, eu colho feedback honesto. Sem compromisso, sem pressão. Objetivo: entender se faz sentido pro ecossistema do Método House Flipping.', active: true },
              { phase: '2', title: 'Parceria de Crescimento', desc: 'Se fizer sentido, estruturamos: código de desconto, link de afiliado, revenue share. Você indica, eu entrego. Ganha-ganha.', active: false },
              { phase: '3', title: 'Se Houver Fit', desc: 'Conversa aberta sobre parceria mais profunda. Talvez integração com o curso, talvez algo maior. Sem pressa, sem forçar.', active: false },
            ].map((item, i) => (
              <div
                key={i}
                className={`relative rounded-2xl p-8 transition-all duration-500 ${
                  item.active
                    ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30'
                    : 'glass-card'
                }`}
              >
                <div className="flex items-start gap-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-display text-xl font-bold ${
                    item.active
                      ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-black'
                      : 'bg-white/10 text-white/40'
                  }`}>
                    {item.phase}
                  </div>
                  <div className="flex-1">
                    <p className={`font-display text-xl font-semibold mb-2 ${item.active ? 'text-amber-400' : 'text-white/60'}`}>
                      Fase {item.phase} — {item.title}
                    </p>
                    <p className="font-body text-white/50 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Slide 9: Fair Exchange */}
      <section
        data-slide="9"
        className="min-h-screen flex items-center justify-center px-6 py-20 relative"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-purple-500/5" />

        <div className="max-w-5xl w-full relative z-10">
          <div className="text-center mb-16">
            <p className="font-body text-amber-400 text-sm font-semibold tracking-widest uppercase mb-4">
              Troca Justa
            </p>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1]">
              Carlos traz método + audiência.
              <span className="block text-gradient-gold mt-2">Eu trago tecnologia + execução.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Carlos Side */}
            <div className="relative">
              <div className="absolute -inset-[1px] bg-gradient-to-br from-amber-400 via-orange-500 to-amber-400 rounded-3xl animate-gradient opacity-50" />
              <div className="relative bg-[#0a0a0a] rounded-3xl p-8">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 text-black text-xs font-bold px-3 py-1 rounded-full mb-6">
                  CARLOS BEIL
                </div>
                <ul className="space-y-4">
                  {[
                    { bold: 'Método comprovado', text: 'com 3.500+ alunos aplicando house flipping' },
                    { bold: 'Maior audiência de flip', text: 'do Brasil — 625K seguidores engajados' },
                    { bold: 'Autoridade no nicho', text: '— literalmente criou o mercado de house flipping BR' },
                    { bold: 'Canal de distribuição', text: 'pronto: curso, Instagram, site, comunidade' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 font-body text-white/70">
                      <span className="text-amber-400 mt-1">→</span>
                      <span><strong className="text-white">{item.bold}</strong> {item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Bruno Side */}
            <div className="glass-card rounded-3xl p-8">
              <div className="inline-flex items-center gap-2 bg-white/10 text-white text-xs font-bold px-3 py-1 rounded-full mb-6">
                BRUNO / MEUFLIP
              </div>
              <ul className="space-y-4">
                {[
                  { bold: 'Produto funcional', text: 'que já resolve análise de viabilidade' },
                  { bold: 'Velocidade técnica', text: 'para implementar features sob medida' },
                  { bold: 'Suporte dedicado', text: 'para seus alunos terem sucesso' },
                  { bold: 'Abertura total', text: 'para co-criar o que fizer sentido' },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 font-body text-white/70">
                    <span className="text-purple-400 mt-1">→</span>
                    <span><strong className="text-white">{item.bold}</strong> {item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Slide 10: Closing CTA */}
      <section
        data-slide="10"
        className="min-h-screen flex items-center justify-center px-6 py-20 relative"
      >
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-amber-500/20 rounded-full blur-[150px]" />
        </div>

        <div className="max-w-4xl text-center relative z-10">
          <p className="font-body text-amber-400 text-sm font-semibold tracking-widest uppercase mb-6">
            Próximo Passo
          </p>

          <h2 className="font-display text-5xl sm:text-6xl lg:text-8xl font-extrabold leading-[0.9] mb-10">
            <span className="text-white">Carlos,</span>
            <span className="block text-gradient-gold mt-2">vamos construir</span>
            <span className="block text-gradient-gold">isso juntos?</span>
          </h2>

          <p className="font-body text-lg text-white/50 leading-relaxed max-w-2xl mx-auto mb-6">
            Seus alunos já confiam em você pra aprender house flipping. Imagina confiarem
            também pra executar — com uma ferramenta que carrega o selo do Método House Flipping.
          </p>

          <p className="font-body text-xl text-white/70 font-medium mb-12">
            Não precisa ser agora. Mas se fizer sentido, quero construir isso contigo.
          </p>

          {/* CTA Button */}
          <a
            href="https://wa.me/5541984297378?text=Oi%20Bruno!%20Vi%20o%20deck%20do%20Meuflip%20e%20quero%20conversar."
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center gap-3 font-display text-lg font-bold px-10 py-5 rounded-2xl transition-all duration-500 hover:scale-105"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 rounded-2xl animate-gradient" />
            <span className="absolute inset-[2px] bg-[#0a0a0a] rounded-xl group-hover:bg-transparent transition-all duration-500" />
            <span className="relative flex items-center gap-3 text-white group-hover:text-black transition-colors">
              Vamos conversar
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </span>
          </a>

          {/* Footer */}
          <div className="mt-20 pt-8 border-t border-white/10">
            <p className="font-display text-white/80 font-semibold text-lg mb-2">
              meuflip.com.br
            </p>
            <p className="font-body text-white/40 text-sm">
              Feito especialmente para{" "}
              <a
                href="https://instagram.com/houseflipping.br"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 transition-colors"
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
