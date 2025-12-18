import { getPropertyAction } from "@/lib/actions/properties";
import { apiFetch } from "@/lib/apiFetch";
import type { Prospect } from "@widia/shared";

export default async function PropertyProspectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const propertyResult = await getPropertyAction(id);

  if (propertyResult.error || !propertyResult.data) {
    return (
      <div className="rounded-lg border border-red-900/60 bg-red-950/50 p-4 text-sm text-red-200">
        {propertyResult.error || "Erro ao carregar imóvel"}
      </div>
    );
  }

  const property = propertyResult.data;

  if (!property.origin_prospect_id) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-8 text-center">
        <p className="text-sm text-neutral-400">
          Este imóvel foi criado diretamente, sem origem de prospecção.
        </p>
      </div>
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
      <div className="rounded-lg border border-yellow-900/60 bg-yellow-950/50 p-4 text-sm text-yellow-200">
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
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-100">
          Dados da Prospecção Original
        </h3>
        <span className="rounded-full bg-blue-900/50 px-2 py-1 text-xs text-blue-300">
          Somente leitura
        </span>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="text-xs text-neutral-500">Endereço</dt>
          <dd className="mt-1 text-sm text-neutral-100">
            {prospect.address || "-"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">Bairro</dt>
          <dd className="mt-1 text-sm text-neutral-100">
            {prospect.neighborhood || "-"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">Área Útil</dt>
          <dd className="mt-1 text-sm text-neutral-100">
            {formatArea(prospect.area_usable)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">Valor Pedido</dt>
          <dd className="mt-1 text-sm text-neutral-100">
            {formatCurrency(prospect.asking_price)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">R$/m²</dt>
          <dd className="mt-1 text-sm text-neutral-100">
            {formatCurrency(prospect.price_per_sqm)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">Condomínio</dt>
          <dd className="mt-1 text-sm text-neutral-100">
            {formatCurrency(prospect.condo_fee)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">Quartos</dt>
          <dd className="mt-1 text-sm text-neutral-100">
            {prospect.bedrooms ?? "-"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">Suítes</dt>
          <dd className="mt-1 text-sm text-neutral-100">
            {prospect.suites ?? "-"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">Banheiros</dt>
          <dd className="mt-1 text-sm text-neutral-100">
            {prospect.bathrooms ?? "-"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">Vagas</dt>
          <dd className="mt-1 text-sm text-neutral-100">
            {prospect.parking ?? "-"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">Andar</dt>
          <dd className="mt-1 text-sm text-neutral-100">
            {prospect.floor ?? "-"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">Elevador</dt>
          <dd className="mt-1 text-sm text-neutral-100">
            {prospect.elevator === true ? "Sim" : prospect.elevator === false ? "Não" : "-"}
          </dd>
        </div>
      </dl>

      {prospect.link && (
        <div className="mt-4 pt-4 border-t border-neutral-800">
          <dt className="text-xs text-neutral-500">Link Original</dt>
          <dd className="mt-1">
            <a
              href={prospect.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:text-blue-300 hover:underline break-all"
            >
              {prospect.link}
            </a>
          </dd>
        </div>
      )}

      {prospect.comments && (
        <div className="mt-4 pt-4 border-t border-neutral-800">
          <dt className="text-xs text-neutral-500">Comentários</dt>
          <dd className="mt-1 text-sm text-neutral-300 whitespace-pre-wrap">
            {prospect.comments}
          </dd>
        </div>
      )}

      {prospect.agency && (
        <div className="mt-4 pt-4 border-t border-neutral-800">
          <h4 className="text-xs text-neutral-500 mb-2">Contato</h4>
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-neutral-600">Imobiliária</dt>
              <dd className="text-sm text-neutral-300">{prospect.agency}</dd>
            </div>
            {prospect.broker_name && (
              <div>
                <dt className="text-xs text-neutral-600">Corretor</dt>
                <dd className="text-sm text-neutral-300">{prospect.broker_name}</dd>
              </div>
            )}
            {prospect.broker_phone && (
              <div>
                <dt className="text-xs text-neutral-600">Telefone</dt>
                <dd className="text-sm text-neutral-300">{prospect.broker_phone}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
