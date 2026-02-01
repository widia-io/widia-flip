import { Settings } from "lucide-react";
import { redirect } from "next/navigation";

import { getServerSession } from "@/lib/serverAuth";
import { getMarketingConsentStatus } from "@/lib/actions/email";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { EmailPreferencesCard } from "./EmailPreferencesCard";

export default async function SettingsPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  let consentStatus: "pending" | "accepted" | "declined" = "pending";
  try {
    const response = await getMarketingConsentStatus();
    consentStatus = response.status;
  } catch {
    // Default to pending if fetch fails
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Configurações</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie suas preferências
          </p>
        </div>
      </div>

      {/* Email Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Preferências de Email</CardTitle>
          <CardDescription>
            Controle quais emails você deseja receber
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailPreferencesCard initialStatus={consentStatus} />
        </CardContent>
      </Card>
    </div>
  );
}
