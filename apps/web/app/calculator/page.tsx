import { getServerSession } from "@/lib/serverAuth";
import { CalculatorForm } from "@/components/CalculatorForm";
import { logEvent, EVENTS } from "@/lib/analytics";
import { Card, CardContent } from "@/components/ui/card";

export default async function CalculatorPage() {
  const session = await getServerSession();
  const isLoggedIn = !!session;

  // Log page view event
  logEvent(EVENTS.VIEW_CALCULATOR, { is_logged_in: isLoggedIn });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      {/* Hero Section */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Calcule a viabilidade do seu flip
        </h1>
        <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
          Descubra lucro, ROI e investimento total em segundos. Preencha os
          valores abaixo e veja se o negócio vale a pena.
        </p>
      </div>

      {/* Calculator */}
      <CalculatorForm isLoggedIn={isLoggedIn} />

      {/* Info Section */}
      <Card className="mt-12">
        <CardContent className="pt-6">
          <h2 className="text-sm font-medium mb-4">
            Taxas padrão utilizadas no cálculo
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">ITBI</span>
              <span className="ml-2 font-medium">3%</span>
            </div>
            <div>
              <span className="text-muted-foreground">Registro</span>
              <span className="ml-2 font-medium">1%</span>
            </div>
            <div>
              <span className="text-muted-foreground">Corretagem</span>
              <span className="ml-2 font-medium">6%</span>
            </div>
            <div>
              <span className="text-muted-foreground">Imposto PJ</span>
              <span className="ml-2 font-medium">0%</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Essas são taxas médias para o Brasil. Ao salvar a análise, você pode
            personalizar esses valores no app.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}


