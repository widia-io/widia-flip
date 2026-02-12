import Link from "next/link";
import { MailX, CheckCircle2, AlertCircle } from "lucide-react";

import { Logo } from "@/components/Logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

async function unsubscribe(token: string) {
  const apiUrl = process.env.GO_API_URL || "http://localhost:8080";
  try {
    const res = await fetch(`${apiUrl}/api/v1/public/unsubscribe/${token}`, {
      method: "GET",
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default async function UnsubscribePage(props: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await props.params;
  const success = await unsubscribe(token);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      {/* Logo */}
      <Link href="/" className="mb-8 flex items-center gap-2">
        <Logo size="full" iconSize={40} />
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {success ? (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-xl">Inscricao cancelada</CardTitle>
              <CardDescription>
                Voce nao recebera mais emails de marketing do Meu Flip.
              </CardDescription>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              <CardTitle className="text-xl">Link invalido</CardTitle>
              <CardDescription>
                Este link de cancelamento pode estar expirado ou ja foi usado.
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="text-center">
          {success ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Se mudar de ideia, voce pode reativar as notificacoes nas configuracoes da sua conta.
              </p>
              <Button asChild variant="outline">
                <Link href="/login">Ir para o Meu Flip</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Se voce ainda deseja cancelar sua inscricao, faca login e acesse as configuracoes da sua conta.
              </p>
              <Button asChild>
                <Link href="/login">Fazer login</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        <MailX className="mr-1 inline h-4 w-4" />
        Meu Flip respeita sua privacidade
      </p>
    </div>
  );
}
