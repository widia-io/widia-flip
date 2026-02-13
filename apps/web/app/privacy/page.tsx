import Link from "next/link";
import type { Metadata } from "next";

import { absoluteUrl, buildPublicMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPublicMetadata({
  title: "Politica de Privacidade - Meu Flip",
  description: "Politica de privacidade da plataforma Meu Flip",
  path: "/privacy",
});

const privacyStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Politica de Privacidade - Meu Flip",
  description: "Politica de privacidade da plataforma Meu Flip",
  url: absoluteUrl("/privacy"),
  inLanguage: "pt-BR",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(privacyStructuredData).replace(/</g, "\\u003c"),
        }}
      />

      <div className="mx-auto max-w-3xl px-4 py-16">
        <Link
          href="/"
          className="mb-8 inline-flex items-center text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          &larr; Voltar
        </Link>

        <h1 className="mb-8 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Politica de Privacidade
        </h1>

        <div className="prose prose-zinc dark:prose-invert max-w-none">
          <p className="text-zinc-600 dark:text-zinc-400">
            Ultima atualizacao: {new Date().toLocaleDateString("pt-BR")}
          </p>

          <h2>1. Informacoes que Coletamos</h2>
          <p>Coletamos as seguintes informacoes:</p>
          <ul>
            <li>
              <strong>Dados de cadastro:</strong> nome, email e telefone
              (opcional)
            </li>
            <li>
              <strong>Dados de uso:</strong> propriedades analisadas, calculos
              realizados
            </li>
            <li>
              <strong>Dados tecnicos:</strong> IP, navegador, dispositivo
            </li>
          </ul>

          <h2>2. Como Usamos suas Informacoes</h2>
          <p>Utilizamos seus dados para:</p>
          <ul>
            <li>Fornecer e melhorar nossos servicos</li>
            <li>Processar pagamentos</li>
            <li>Enviar comunicacoes sobre sua conta</li>
            <li>Prevenir fraudes e garantir seguranca</li>
          </ul>

          <h2>3. Compartilhamento de Dados</h2>
          <p>
            Nao vendemos seus dados pessoais. Podemos compartilhar informacoes
            com:
          </p>
          <ul>
            <li>Processadores de pagamento (Stripe)</li>
            <li>Servicos de email (Resend)</li>
            <li>Servicos de hospedagem e infraestrutura</li>
          </ul>

          <h2>4. Seguranca</h2>
          <p>
            Implementamos medidas de seguranca para proteger seus dados,
            incluindo criptografia SSL, senhas com hash e controle de acesso.
          </p>

          <h2>5. Seus Direitos</h2>
          <p>Voce tem direito a:</p>
          <ul>
            <li>Acessar seus dados pessoais</li>
            <li>Corrigir informacoes incorretas</li>
            <li>Solicitar exclusao de sua conta</li>
            <li>Exportar seus dados</li>
          </ul>

          <h2>6. Cookies</h2>
          <p>
            Utilizamos cookies essenciais para funcionamento da plataforma e
            cookies de analytics para entender o uso do site.
          </p>

          <h2>7. Retencao de Dados</h2>
          <p>
            Mantemos seus dados enquanto sua conta estiver ativa. Apos exclusao,
            dados sao removidos em ate 30 dias, exceto quando necessario por
            obrigacao legal.
          </p>

          <h2>8. Contato</h2>
          <p>
            Para questoes de privacidade, contate{" "}
            <a href="mailto:privacidade@meuflip.com">privacidade@meuflip.com</a>.
          </p>

          <h2>9. Alteracoes</h2>
          <p>
            Podemos atualizar esta politica. Notificaremos sobre mudancas
            significativas por email.
          </p>
        </div>
      </div>
    </div>
  );
}
