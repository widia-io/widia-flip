const forWho = [
  "faz flip recorrente",
  "trata flip como negócio",
  "quer decidir com números, não feeling",
];

export function AuthoritySection() {
  return (
    <section className="relative border-y border-border bg-muted/30 py-16 lg:py-20">
      <div className="absolute inset-x-0 top-0 -z-10 h-32 bg-[radial-gradient(60%_80%_at_50%_0%,hsl(var(--primary)/0.12),transparent)]" />
      <div className="mx-auto max-w-6xl px-4 text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl font-display">
          O meuflip foi criado pra quem:
        </h2>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {forWho.map((item, index) => (
            <div
              key={item}
              className="group rounded-2xl border border-border/60 bg-background/80 px-5 py-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Perfil {String(index + 1).padStart(2, "0")}
              </p>
              <p className="mt-3 text-base font-medium capitalize">{item}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-border/60 bg-background/80 px-6 py-5 shadow-[0_20px_60px_-50px_hsl(var(--primary)/0.6)]">
          <p className="text-muted-foreground">
            Não é ferramenta genérica.{" "}
            <span className="font-medium text-foreground">
              É focada em house flipping.
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
