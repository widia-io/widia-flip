import { signOutAction } from "@/lib/actions/auth";

export function Header(props: { userEmail: string }) {
  return (
    <header className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-4 py-3">
      <div className="text-sm text-neutral-300">
        Logado como <span className="text-neutral-50">{props.userEmail}</span>
      </div>

      <form action={signOutAction}>
        <button
          type="submit"
          className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 hover:bg-neutral-800"
        >
          Sair
        </button>
      </form>
    </header>
  );
}


