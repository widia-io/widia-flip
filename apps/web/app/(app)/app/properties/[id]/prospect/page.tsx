import { getPropertyAction } from "@/lib/actions/properties";
import { apiFetch } from "@/lib/apiFetch";
import type { Prospect } from "@widia/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function PropertyProspectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const propertyResult = await getPropertyAction(id);

  if (propertyResult.error || !propertyResult.data) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {propertyResult.error || "Erro ao carregar imóvel"}
      </div>
    );
  }

  const property = propertyResult.data;

  if (!property.origin_prospect_id) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Este imóvel foi criado diretamente, sem origem de prospecção.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Fetch prospect data
  let prospect: Prospect | null = null;
  let error: string | null = null;

  try {
    prospect = await apiFetch<Prospect>(
      `/api/v1/prospects/${property.origin_prospect_id}`,
    );
  } catch (e) {
    error = e instanceof Error ? e.message : "Erro ao carregar prospect";
  }

  if (error || !prospect) {
    return (
      <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4 text-sm text-yellow-700 dark:text-yellow-300">
        Não foi possível carregar os dados da prospecção original.
      </div>
    );
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatArea = (value: number | null | undefined) => {
    if (value == null) return "-";
    return `${value} m²`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Dados da Prospecção Original</CardTitle>
        <Badge variant="secondary">Somente leitura</Badge>
      </CardHeader>

      <CardContent>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Endereço</dt>
            <dd className="mt-1 text-sm">{prospect.address || "-"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Bairro</dt>
            <dd className="mt-1 text-sm">{prospect.neighborhood || "-"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Área Útil</dt>
            <dd className="mt-1 text-sm">{formatArea(prospect.area_usable)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Valor Pedido</dt>
            <dd className="mt-1 text-sm">{formatCurrency(prospect.asking_price)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">R$/m²</dt>
            <dd className="mt-1 text-sm">{formatCurrency(prospect.price_per_sqm)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Condomínio</dt>
            <dd className="mt-1 text-sm">{formatCurrency(prospect.condo_fee)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Quartos</dt>
            <dd className="mt-1 text-sm">{prospect.bedrooms ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Suítes</dt>
            <dd className="mt-1 text-sm">{prospect.suites ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Banheiros</dt>
            <dd className="mt-1 text-sm">{prospect.bathrooms ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Vagas</dt>
            <dd className="mt-1 text-sm">{prospect.parking ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Andar</dt>
            <dd className="mt-1 text-sm">{prospect.floor ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Elevador</dt>
            <dd className="mt-1 text-sm">
              {prospect.elevator === true ? "Sim" : prospect.elevator === false ? "Não" : "-"}
            </dd>
          </div>
        </dl>

        {prospect.link && (
          <div className="mt-4 pt-4 border-t border-border">
            <dt className="text-xs text-muted-foreground">Link Original</dt>
            <dd className="mt-1">
              <a
                href={prospect.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline break-all"
              >
                {prospect.link}
              </a>
            </dd>
          </div>
        )}

        {prospect.comments && (
          <div className="mt-4 pt-4 border-t border-border">
            <dt className="text-xs text-muted-foreground">Comentários</dt>
            <dd className="mt-1 text-sm whitespace-pre-wrap">
              {prospect.comments}
            </dd>
          </div>
        )}

        {prospect.agency && (
          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="text-xs text-muted-foreground mb-2">Contato</h4>
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Imobiliária</dt>
                <dd className="text-sm">{prospect.agency}</dd>
              </div>
              {prospect.broker_name && (
                <div>
                  <dt className="text-xs text-muted-foreground">Corretor</dt>
                  <dd className="text-sm">{prospect.broker_name}</dd>
                </div>
              )}
              {prospect.broker_phone && (
                <div>
                  <dt className="text-xs text-muted-foreground">Telefone</dt>
                  <dd className="text-sm">{prospect.broker_phone}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
