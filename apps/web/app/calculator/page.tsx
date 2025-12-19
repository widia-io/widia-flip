import { getServerSession } from "@/lib/serverAuth";
import { CalculatorForm } from "@/components/CalculatorForm";
import { logEvent, EVENTS } from "@/lib/analytics";

export default async function CalculatorPage() {
  const session = await getServerSession();
  const isLoggedIn = !!session;

  // Log page view event
  logEvent(EVENTS.VIEW_CALCULATOR, { is_logged_in: isLoggedIn });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      {/* Hero Section */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-neutral-100 mb-3">
          Calcule a viabilidade do seu flip
        </h1>
        <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
          Descubra lucro, ROI e investimento total em segundos. Preencha os
          valores abaixo e veja se o negócio vale a pena.
        </p>
      </div>

      {/* Calculator */}
      <CalculatorForm isLoggedIn={isLoggedIn} />

      {/* Info Section */}
      <div className="mt-12 rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
        <h2 className="text-sm font-medium text-neutral-300 mb-3">
          Taxas padrão utilizadas no cálculo
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-neutral-500">ITBI</span>
            <span className="ml-2 text-neutral-200">3%</span>
          </div>
          <div>
            <span className="text-neutral-500">Registro</span>
            <span className="ml-2 text-neutral-200">1%</span>
          </div>
          <div>
            <span className="text-neutral-500">Corretagem</span>
            <span className="ml-2 text-neutral-200">6%</span>
          </div>
          <div>
            <span className="text-neutral-500">Imposto PJ</span>
            <span className="ml-2 text-neutral-200">0%</span>
          </div>
        </div>
        <p className="mt-4 text-xs text-neutral-500">
          Essas são taxas médias para o Brasil. Ao salvar a análise, você pode
          personalizar esses valores no app.
        </p>
      </div>
    </div>
  );
}
