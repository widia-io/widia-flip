import Link from "next/link";

import { MeuFlipLogo } from "@/components/MeuFlipLogo";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ForgotPasswordPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const success = typeof searchParams.success === "string" ? searchParams.success : "";
  const email = typeof searchParams.email === "string" ? searchParams.email : "";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <MeuFlipLogo size={40} />
        <span className="text-xl font-semibold">Meu Flip</span>
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Esqueceu sua senha?</CardTitle>
          <CardDescription>
            Digite seu email para receber um link de redefinicao
          </CardDescription>
        </CardHeader>

        <CardContent>
          {success === "email_sent" ? (
            <div className="mb-4 rounded-lg border border-primary/50 bg-primary/10 px-4 py-3 text-sm text-primary">
              <p className="font-medium">Link enviado!</p>
              <p className="mt-1 text-muted-foreground">
                Se uma conta existir com o email <strong>{email || "informado"}</strong>,
                voce recebera um link para redefinir sua senha.
              </p>
            </div>
          ) : null}

          <ForgotPasswordForm />

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Voltar ao login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
