import Link from "next/link";

export function Sidebar() {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-neutral-800 bg-neutral-950">
      <div className="border-b border-neutral-800 px-4 py-3">
        <Link href="/app" className="font-semibold tracking-tight">
          Widia Flip
        </Link>
        <div className="mt-1 text-xs text-neutral-400">CP-02 — Prospecção</div>
      </div>

      <nav className="flex-1 px-2 py-3 text-sm">
        <Link
          href="/app"
          className="block rounded-md px-3 py-2 text-neutral-200 hover:bg-neutral-900"
        >
          Dashboard
        </Link>
        <Link
          href="/app/prospects"
          className="block rounded-md px-3 py-2 text-neutral-200 hover:bg-neutral-900"
        >
          Prospecção
        </Link>
      </nav>
    </aside>
  );
}


