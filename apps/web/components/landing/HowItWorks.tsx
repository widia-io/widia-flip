import { Home, Receipt, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: Home,
    title: "Cadastre o imóvel",
    description: "Adicione os dados básicos do flip que está avaliando.",
  },
  {
    icon: Receipt,
    title: "Lance compra, obra e custos",
    description: "Registre todos os valores: aquisição, reforma, taxas.",
  },
  {
    icon: TrendingUp,
    title: "Acompanhe o lucro real",
    description: "Veja o resultado do flip atualizado em tempo real.",
  },
];

export function HowItWorks() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-16 lg:py-24">
      <div className="absolute inset-x-0 top-10 -z-10 h-32 bg-[radial-gradient(60%_80%_at_50%_0%,hsl(var(--primary)/0.12),transparent)]" />
      <div className="text-center mb-12">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl font-display">
          Como funciona
        </h2>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {steps.map((step, index) => (
          <div
            key={step.title}
            className="group relative overflow-hidden rounded-3xl border border-border/60 bg-background/80 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="absolute right-4 top-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Passo {index + 1}
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20">
              <step.icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mt-6 text-lg font-semibold font-display">{step.title}</h3>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {step.description}
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
              <span>Pronto</span>
              <span className="h-px flex-1 bg-primary/20" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 text-center">
        <p className="text-muted-foreground">
          Sem planilha. Sem gambiarra.
        </p>
      </div>
    </section>
  );
}
