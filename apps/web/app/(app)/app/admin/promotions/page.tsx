import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { listPromotions } from "@/lib/actions/promotions";
import { PromotionsManager } from "./PromotionsManager";

export default async function AdminPromotionsPage() {
  const { items } = await listPromotions();

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

      <div>
        <h1 className="text-2xl font-bold">Promotions</h1>
        <p className="text-muted-foreground">
          Manage promotional banners and discount coupons
        </p>
      </div>

      <PromotionsManager initialPromotions={items} />
    </div>
  );
}
