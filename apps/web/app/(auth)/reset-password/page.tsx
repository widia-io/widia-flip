import Link from "next/link";

import { MeuFlipLogo } from "@/components/MeuFlipLogo";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ResetPasswordPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const token = typeof searchParams.token === "string" ? searchParams.token : "";
  const error = typeof searchParams.error === "string" ? searchParams.error : "";

  const hasValidToken = token.length > 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <MeuFlipLogo size={40} />
        <span className="text-xl font-semibold">Meu Flip</span>
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Redefinir senha</CardTitle>
          <CardDescription>
            {hasValidToken
              ? "Digite sua nova senha"
              : "Link invalido ou expirado"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error === "invalid_token"
                ? "Link invalido ou expirado. Solicite um novo link."
                : error === "password_too_short"
                  ? "A senha deve ter no minimo 8 caracteres."
                  : error}
            </div>
          )}

          {hasValidToken ? (
            <ResetPasswordForm token={token} />
          ) : (
            <div className="text-center">
              <p className="mb-4 text-sm text-muted-foreground">
                Este link de redefinicao de senha e invalido ou expirou.
                Solicite um novo link.
              </p>
              <Link
                href="/forgot-password"
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Solicitar novo link
              </Link>
            </div>
          )}

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
