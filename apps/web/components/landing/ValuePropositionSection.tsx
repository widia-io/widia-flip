import { Check, Sparkles } from "lucide-react";

const valuePoints = [
  "compra do imóvel",
  "custos de obra",
  "taxas, impostos e corretagem",
  "lucro líquido e ROI real",
];

export function ValuePropositionSection() {
  return (
    <section className="relative py-16 lg:py-20">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(40%_40%_at_10%_20%,hsl(var(--primary)/0.12),transparent)]" />
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <Sparkles className="h-3 w-3" />
              Centralização total
            </div>
            <h2 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl font-display">
              O meuflip centraliza tudo:
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              Uma visão única do flip, do primeiro número ao lucro final. Sem
              apps soltos e planilhas paralelas.
            </p>
            <div className="mt-8 rounded-3xl border border-border/60 bg-background/80 p-6 shadow-[0_20px_60px_-50px_hsl(var(--primary)/0.6)]">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
                Resultado direto
              </p>
              <p className="mt-3 text-lg font-medium">
                Tudo organizado, simples e pensado pra quem faz flip de verdade.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {valuePoints.map((point, index) => (
              <div
                key={point}
                className="group flex h-full flex-col justify-between rounded-2xl border border-primary/20 bg-primary/5 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-xl bg-primary/10 p-2">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <span className="mt-6 text-base font-medium capitalize">{point}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
