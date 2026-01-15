"use client";

import { useEffect, useState } from "react";

const TOTAL_SLIDES = 10;

export default function PartnershipDeckPage() {
  const [currentSlide, setCurrentSlide] = useState(1);

  useEffect(() => {
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
    <div className="min-h-screen bg-white text-gray-900">
      {/* Sticky Progress Indicator */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500 tracking-wide uppercase">
            Meuflip • Parceria
          </span>
          <span className="text-sm font-bold text-gray-900">
            {currentSlide}/{TOTAL_SLIDES}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-0.5 bg-gray-100">
          <div
            className="h-full bg-gray-900 transition-all duration-300"
            style={{ width: `${(currentSlide / TOTAL_SLIDES) * 100}%` }}
          />
        </div>
      </header>

      {/* Slide 1: Opening Thesis */}
      <section
        data-slide="1"
        className="min-h-screen flex items-center justify-center px-6 pt-20"
      >
        {/*
          SPEAKER NOTES:
          - Comece com uma provocação: "Você ensina o antes/depois visual. Mas e o financeiro?"
          - Objetivo: criar conexão mostrando que vocês complementam
          - Deixe ela concordar ou reagir antes de avançar
        */}
        <div className="max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 mb-6">
            Tese
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-8">
            Conteúdo prepara.
            <br />
            <span className="text-gray-400">Plataforma executa.</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
            A maioria dos flips não falha na venda. Falha na decisão de compra.
            Quem aprende contigo sabe o que fazer. Mas na hora H, falta uma
            ferramenta que transforme conhecimento em ação segura.
          </p>
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
                  "Parece bom" não paga as contas. Sem números, qualquer imóvel vira aposta.
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
            <div className="border border-gray-200 rounded-lg p-6">
              <p className="text-2xl font-bold text-gray-900 mb-2">Obra estoura</p>
              <p className="text-gray-600">
                Estimativa otimista demais. Imprevistos viram rombo no orçamento.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-6">
              <p className="text-2xl font-bold text-gray-900 mb-2">Taxas esquecidas</p>
              <p className="text-gray-600">
                ITBI, registro, escritura, comissão. Cada uma parece pequena. Juntas, matam.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-6">
              <p className="text-2xl font-bold text-gray-900 mb-2">Tempo de giro</p>
              <p className="text-gray-600">
                Flip que demora 12 meses em vez de 6 dobra o custo de oportunidade.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-6">
              <p className="text-2xl font-bold text-gray-900 mb-2">Preço de saída</p>
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
            O "antes e depois" que ninguém posta:
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
                  Feeling: "acho que dá lucro"
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
          {/* Visual placeholder */}
          <div className="mt-12 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <p className="text-gray-500 text-sm uppercase tracking-wide">
              Visual: Comparativo de análise — Planilha vs. Meuflip
            </p>
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
            "educação para empreendedores" para "plataforma de gestão". Quem segura a mão
            do aluno na hora da ação ganha a confiança de verdade.
          </p>
          <div className="bg-gray-100 rounded-lg p-8">
            <p className="text-xl sm:text-2xl font-bold text-gray-900">
              "Conteúdo forma.
              <br />
              Ferramenta sustenta a decisão."
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
          {/* Visual placeholder */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <p className="text-gray-500 text-sm uppercase tracking-wide">
              Visual: Screenshot do dashboard do Meuflip
            </p>
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
        className="min-h-screen flex items-center justify-center px-6"
      >
        {/*
          SPEAKER NOTES:
          - Importante: deixe claro que a ferramenta não substitui o trabalho dela
          - Posicione como amplificador do método que ela já ensina
          - Pergunte: "Faz sentido pra sua audiência?"
        */}
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 mb-6">
            Sinergia
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-10">
            Ferramenta não substitui conteúdo.
            <br />
            <span className="text-gray-400">Ela amplifica.</span>
          </h2>
          <ul className="space-y-6">
            <li className="flex items-start gap-4">
              <div className="flex-shrink-0 w-2 h-2 rounded-full bg-gray-900 mt-3" />
              <div>
                <p className="text-xl font-medium text-gray-900">
                  Aumenta a confiança do seguidor
                </p>
                <p className="text-gray-600 mt-1">
                  Quem aplica seu método com uma ferramenta profissional erra menos e confia mais em você.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="flex-shrink-0 w-2 h-2 rounded-full bg-gray-900 mt-3" />
              <div>
                <p className="text-xl font-medium text-gray-900">
                  Reduz erros de iniciante
                </p>
                <p className="text-gray-600 mt-1">
                  Os custos que você ensina a considerar já estão no sistema. Ninguém esquece.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="flex-shrink-0 w-2 h-2 rounded-full bg-gray-900 mt-3" />
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

      {/* Slide 8: Partnership Model */}
      <section
        data-slide="8"
        className="min-h-screen flex items-center justify-center px-6"
      >
        {/*
          SPEAKER NOTES:
          - Seja honesto sobre o estágio: "Estou validando"
          - Enfatize que não é publi: é construção conjunta
          - Deixe claro que a fase 1 é sem compromisso financeiro
        */}
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 mb-6">
            Como eu imagino
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-10">
            Não é publi.
            <br />
            <span className="text-gray-400">É co-criação.</span>
          </h2>
          <div className="space-y-8">
            <div className="border-l-4 border-gray-900 pl-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 mb-2">
                Fase 1 — Validação
              </p>
              <p className="text-lg text-gray-700">
                Você usa em casos reais, me dá feedback honesto. Sem compromisso, sem pressão.
                Objetivo: entender se faz sentido pro seu mundo.
              </p>
            </div>
            <div className="border-l-4 border-gray-400 pl-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 mb-2">
                Fase 2 — Parceria de crescimento
              </p>
              <p className="text-lg text-gray-700">
                Se fizer sentido, estruturamos: código de desconto, link de afiliado, revenue share.
                Você indica, eu entrego. Ganha-ganha.
              </p>
            </div>
            <div className="border-l-4 border-gray-300 pl-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 mb-2">
                Fase 3 — Se houver fit
              </p>
              <p className="text-lg text-gray-700">
                Conversa aberta sobre parceria mais profunda. Talvez co-criação de features,
                talvez algo maior. Sem pressa, sem forçar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <hr className="border-gray-200" />
      </div>

      {/* Slide 9: What Each Side Brings */}
      <section
        data-slide="9"
        className="min-h-screen flex items-center justify-center px-6"
      >
        {/*
          SPEAKER NOTES:
          - Seja respeitoso: valorize o que ela traz
          - Não diminua nenhum lado — é troca justa
          - Pergunte: "Faz sentido essa divisão?"
        */}
        <div className="max-w-4xl w-full">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 mb-6 text-center">
            Troca
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-12 text-center">
            Você traz audiência e contexto.
            <br />
            <span className="text-gray-400">Eu trago produto e execução.</span>
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Her side */}
            <div className="bg-gray-100 rounded-lg p-8">
              <p className="text-xl font-bold text-gray-900 mb-6">Você</p>
              <ul className="space-y-4 text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="text-gray-400 mt-1">→</span>
                  <span>Audiência que confia no seu julgamento</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-gray-400 mt-1">→</span>
                  <span>Contexto real do mercado de flips em BH</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-gray-400 mt-1">→</span>
                  <span>Método validado com cases de sucesso</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-gray-400 mt-1">→</span>
                  <span>Credibilidade e voz no nicho</span>
                </li>
              </ul>
            </div>
            {/* My side */}
            <div className="bg-gray-900 text-white rounded-lg p-8">
              <p className="text-xl font-bold text-white mb-6">Eu</p>
              <ul className="space-y-4 text-gray-200">
                <li className="flex items-start gap-3">
                  <span className="text-gray-500 mt-1">→</span>
                  <span>Produto funcional e em evolução</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-gray-500 mt-1">→</span>
                  <span>Capacidade técnica de implementar rápido</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-gray-500 mt-1">→</span>
                  <span>Suporte dedicado para sua audiência</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-gray-500 mt-1">→</span>
                  <span>Abertura para co-criar features</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <hr className="border-gray-200" />
      </div>

      {/* Slide 10: Closing */}
      <section
        data-slide="10"
        className="min-h-screen flex items-center justify-center px-6 pb-20"
      >
        {/*
          SPEAKER NOTES:
          - Termine com visão de futuro: "Imagina ser a referência que indica A ferramenta do flip"
          - Seja genuíno: "Estou no começo, mas sério sobre isso"
          - Pergunte próximos passos: "Quer testar? Quer ver um demo?"
        */}
        <div className="max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 mb-6">
            Fechamento
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-10">
            Vamos construir a plataforma que vira o
            <br />
            <span className="text-gray-400">"padrão" do flip</span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto mb-8">
            Sua audiência já confia em você pra aprender. Imagina confiar também pra
            executar — com uma ferramenta que carrega seu selo de qualidade.
          </p>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
            Não precisa ser agora. Mas se fizer sentido, quero construir isso junto.
          </p>
          <div className="mt-16 pt-8 border-t border-gray-200">
            <p className="text-gray-500">
              meuflip.com.br
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
