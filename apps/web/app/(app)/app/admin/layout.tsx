import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { getServerSession } from "@/lib/serverAuth";
import { getAdminStatus } from "@/lib/actions/admin";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  try {
    const { isAdmin } = await getAdminStatus();
    if (!isAdmin) {
      redirect("/app");
    }
  } catch {
    redirect("/app");
  }

  return <>{children}</>;
}
