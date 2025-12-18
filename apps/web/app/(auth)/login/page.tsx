import Link from "next/link";
import { redirect } from "next/navigation";

import { signInEmailAction, signUpEmailAction } from "@/lib/actions/auth";
import { getServerSession } from "@/lib/serverAuth";

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

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-950 p-6">
        <div className="text-lg font-semibold">Entrar</div>
        <div className="mt-1 text-sm text-neutral-400">
          Better Auth (email/senha) — MVP (CP-01)
        </div>

        {error ? (
          <div className="mt-4 rounded-md border border-red-900/60 bg-red-950/50 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-4 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
            {success}
          </div>
        ) : null}

        <form action={signInEmailAction} className="mt-5 space-y-3">
          <label className="block">
            <div className="mb-1 text-xs text-neutral-400">Email</div>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-xs text-neutral-400">Senha</div>
            <input
              name="password"
              type="password"
              required
              className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 hover:bg-neutral-800"
          >
            Entrar
          </button>
        </form>

        <div className="my-6 h-px bg-neutral-900" />

        <div className="text-sm font-medium">Criar conta (dev)</div>
        <form action={signUpEmailAction} className="mt-3 space-y-3">
          <label className="block">
            <div className="mb-1 text-xs text-neutral-400">Nome</div>
            <input
              name="name"
              type="text"
              required
              className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-xs text-neutral-400">Email</div>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-xs text-neutral-400">Senha</div>
            <input
              name="password"
              type="password"
              required
              className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 hover:bg-neutral-900"
          >
            Criar conta
          </button>
        </form>

        <div className="mt-6 text-xs text-neutral-500">
          <Link href="/" className="hover:text-neutral-300">
            Voltar
          </Link>
        </div>
      </div>
    </div>
  );
}


