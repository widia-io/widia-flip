import Link from "next/link";
import { redirect } from "next/navigation";

import { signInEmailAction, signUpEmailAction } from "@/lib/actions/auth";
import { getServerSession } from "@/lib/serverAuth";
import { MeuFlipLogo } from "@/components/MeuFlipLogo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default async function LoginPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession();
  if (session) {
    redirect("/app");
  }

  const searchParams = (await props.searchParams) ?? {};
  const error = typeof searchParams.error === "string" ? searchParams.error : "";
  const success =
    typeof searchParams.success === "string" ? searchParams.success : "";
  const email = typeof searchParams.email === "string" ? searchParams.email : "";
  const tab = typeof searchParams.tab === "string" ? searchParams.tab : "login";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      {/* Logo */}
      <Link href="/" className="mb-8 flex items-center gap-2">
        <MeuFlipLogo size={40} />
        <span className="text-xl font-semibold">Meu Flip</span>
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {tab === "signup" ? "Criar sua conta" : "Bem-vindo de volta"}
          </CardTitle>
          <CardDescription>
            {tab === "signup"
              ? "Comece a gerenciar seus flips imobiliários"
              : "Entre para acessar sua conta"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error ? (
            <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error === "email_not_verified" ? (
                <>
                  <p className="font-medium">Email não verificado</p>
                  <p className="mt-1">
                    Verifique sua caixa de entrada{email ? ` (${email})` : ""} e
                    clique no link de confirmação.
                  </p>
                </>
              ) : error === "invalid_token" ? (
                "Link de verificação inválido ou expirado. Tente fazer login novamente para receber um novo link."
              ) : (
                error
              )}
            </div>
          ) : null}

          {success ? (
            <div className="mb-4 rounded-lg border border-primary/50 bg-primary/10 px-4 py-3 text-sm text-primary">
              {success === "verify_email" ? (
                <>
                  <p className="font-medium">Verifique seu email!</p>
                  <p className="mt-1 text-muted-foreground">
                    Enviamos um link de confirmação para{" "}
                    <strong>{email || "seu email"}</strong>. Clique no link para
                    ativar sua conta.
                  </p>
                </>
              ) : success === "email_verified" ? (
                "Email confirmado! Faça login para continuar."
              ) : success === "account_created" ? (
                "Conta criada com sucesso! Faça login para continuar."
              ) : (
                success
              )}
            </div>
          ) : null}

          {tab === "signup" ? (
            <form action={signUpEmailAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Seu nome"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" className="w-full">
                Criar conta
              </Button>
            </form>
          ) : (
            <form action={signInEmailAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Entrar
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {tab === "signup" ? (
              <>
                Já tem uma conta?{" "}
                <Link
                  href="/login"
                  className="font-medium text-primary hover:underline"
                >
                  Fazer login
                </Link>
              </>
            ) : (
              <>
                Não tem uma conta?{" "}
                <Link
                  href="/login?tab=signup"
                  className="font-medium text-primary hover:underline"
                >
                  Criar conta
                </Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Ao continuar, você concorda com nossos{" "}
        <Link href="#" className="underline hover:text-foreground">
          Termos de Uso
        </Link>{" "}
        e{" "}
        <Link href="#" className="underline hover:text-foreground">
          Política de Privacidade
        </Link>
      </p>
    </div>
  );
}
