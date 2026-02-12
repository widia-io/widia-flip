import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { listAdminEbookLeads, reconcileEbookLeads } from "@/lib/actions/admin";
import { LeadsPageClient } from "./LeadsPageClient";

export default async function AdminLeadsPage() {
  const [{ items: leads, total }, { reconciled }] = await Promise.all([
    listAdminEbookLeads(),
    reconcileEbookLeads(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/app/admin"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Admin
        </Link>
      </div>

      <LeadsPageClient leads={leads} total={total} reconciled={reconciled} />
    </div>
  );
}
