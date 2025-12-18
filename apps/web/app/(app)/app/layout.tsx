import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { getServerSession } from "@/lib/serverAuth";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header userEmail={session.user.email} />
        <main className="flex-1 px-4 py-6">{children}</main>
      </div>
    </div>
  );
}


