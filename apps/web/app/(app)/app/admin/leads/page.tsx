import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import {
  listAdminCalculatorLeads,
  listAdminEbookLeads,
  reconcileEbookLeads,
} from "@/lib/actions/admin";
import { LeadsPageClient } from "./LeadsPageClient";

export default async function AdminLeadsPage() {
  const [
    { items: ebookLeads, total: ebookTotal },
    { items: calculatorLeads, total: calculatorTotal },
    { reconciled },
  ] = await Promise.all([
    listAdminEbookLeads(),
    listAdminCalculatorLeads(),
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

      <LeadsPageClient
        ebookLeads={ebookLeads}
        ebookTotal={ebookTotal}
        calculatorLeads={calculatorLeads}
        calculatorTotal={calculatorTotal}
        reconciled={reconciled}
      />
    </div>
  );
}
