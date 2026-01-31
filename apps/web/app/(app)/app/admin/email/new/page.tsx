import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NewCampaignForm } from "./NewCampaignForm";

export default function NewCampaignPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/app/admin/email"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Email Marketing
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Nova Campanha</h1>
        <p className="text-muted-foreground">
          Crie uma nova campanha de email marketing
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Detalhes da campanha</CardTitle>
          <CardDescription>
            O email sera enviado para todos os usuarios elegiveis (opt-in ativo + email verificado)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewCampaignForm />
        </CardContent>
      </Card>
    </div>
  );
}
