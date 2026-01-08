import { AlertTriangle, Minus } from "lucide-react";

const painPoints = [
  "achou que ia lucrar e sobrou menos do que esperava",
  "perdeu controle dos custos da obra",
  "misturou flip com finanças pessoais",
  "ficou refém de planilhas que só você entende",
];

export function ProblemSection() {
  return (
    <section className="border-y border-border bg-muted/30">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-20">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <AlertTriangle className="h-3 w-3" />
            Dores do dia a dia
          </div>
          <h2 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl font-display">
            Se você faz flip, já passou por pelo menos um desses:
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            A maioria perde dinheiro não por falta de oportunidade, mas por falta de
            controle. Isso se repete.
          </p>

          <div className="mt-8 rounded-3xl border border-border/60 bg-background/80 p-6 shadow-[0_20px_60px_-50px_hsl(var(--primary)/0.6)]">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Resumo</p>
            <p className="mt-3 text-lg font-medium">
              O problema não é o flip.{" "}
              <span className="text-primary">É a falta de gestão.</span>
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {painPoints.map((point, index) => (
            <div
              key={point}
              className="group flex h-full flex-col justify-between rounded-2xl border border-border/60 bg-background/80 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <Minus className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-6 text-base capitalize">{point}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
