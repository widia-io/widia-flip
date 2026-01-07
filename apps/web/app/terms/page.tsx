import Link from "next/link";

export const metadata = {
  title: "Termos de Uso - Meu Flip",
  description: "Termos de uso da plataforma Meu Flip",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Link
          href="/"
          className="mb-8 inline-flex items-center text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          &larr; Voltar
        </Link>

        <h1 className="mb-8 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Termos de Uso
        </h1>

        <div className="prose prose-zinc dark:prose-invert max-w-none">
          <p className="text-zinc-600 dark:text-zinc-400">
            Ultima atualizacao: {new Date().toLocaleDateString("pt-BR")}
          </p>

          <h2>1. Aceitacao dos Termos</h2>
          <p>
            Ao acessar e usar o Meu Flip, voce concorda com estes termos de uso.
            Se nao concordar com qualquer parte, nao utilize a plataforma.
          </p>

          <h2>2. Descricao do Servico</h2>
          <p>
            O Meu Flip e uma plataforma de analise de viabilidade para
            investimentos imobiliarios (flips). Oferecemos ferramentas de
            calculo, gestao de propriedades e analise financeira.
          </p>

          <h2>3. Uso da Plataforma</h2>
          <p>Voce se compromete a:</p>
          <ul>
            <li>Fornecer informacoes verdadeiras no cadastro</li>
            <li>Manter a seguranca de sua conta</li>
            <li>Nao utilizar a plataforma para fins ilegais</li>
            <li>Nao tentar acessar areas restritas do sistema</li>
          </ul>

          <h2>4. Propriedade Intelectual</h2>
          <p>
            Todo o conteudo da plataforma, incluindo textos, graficos, logos e
            software, e de propriedade do Meu Flip ou de seus licenciadores.
          </p>

          <h2>5. Limitacao de Responsabilidade</h2>
          <p>
            As analises e calculos fornecidos pelo Meu Flip sao ferramentas de
            apoio a decisao. Nao nos responsabilizamos por decisoes de
            investimento tomadas com base nas informacoes da plataforma.
          </p>

          <h2>6. Planos e Pagamentos</h2>
          <p>
            Os planos pagos sao cobrados conforme descrito na pagina de precos.
            Cancelamentos podem ser feitos a qualquer momento, com acesso ate o
            fim do periodo pago.
          </p>

          <h2>7. Alteracoes nos Termos</h2>
          <p>
            Podemos atualizar estes termos periodicamente. Alteracoes
            significativas serao comunicadas por email.
          </p>

          <h2>8. Contato</h2>
          <p>
            Para duvidas sobre estes termos, entre em contato pelo email{" "}
            <a href="mailto:contato@meuflip.com">contato@meuflip.com</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
