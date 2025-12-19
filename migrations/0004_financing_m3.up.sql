-- M3: Financiamento
-- Adds financing plans, payments, and analysis snapshots

-- Plano de financiamento (1 por property, current)
CREATE TABLE IF NOT EXISTS financing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL UNIQUE REFERENCES properties(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  purchase_price numeric,           -- preco de compra
  sale_price numeric,               -- preco de venda
  down_payment_percent numeric,     -- entrada % (decimal, ex: 0.20 = 20%)
  down_payment_value numeric,       -- entrada R$ (calculado ou informado)
  financed_value numeric,           -- valor financiado (calculado)
  term_months integer,              -- prazo em meses
  
  -- Taxas bancarias
  cet numeric,                      -- Custo Efetivo Total (%)
  interest_rate numeric,            -- taxa de juros nominal (%)
  insurance numeric,                -- seguro total R$
  appraisal_fee numeric,            -- taxa de avaliacao R$
  other_fees numeric,               -- outras tarifas bancarias R$
  
  remaining_debt numeric,           -- saldo devedor atual
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financing_plans_property ON financing_plans(property_id);
CREATE INDEX IF NOT EXISTS idx_financing_plans_workspace ON financing_plans(workspace_id);

-- Prestacoes pagas (N por plan)
CREATE TABLE IF NOT EXISTS financing_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES financing_plans(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  month_index integer NOT NULL,     -- mes 1, 2, 3...
  amount numeric NOT NULL,          -- valor pago
  
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(plan_id, month_index)
);

CREATE INDEX IF NOT EXISTS idx_financing_payments_plan ON financing_payments(plan_id);
CREATE INDEX IF NOT EXISTS idx_financing_payments_workspace ON financing_payments(workspace_id);

-- Snapshots historicos de analise financiada
CREATE TABLE IF NOT EXISTS analysis_financing_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  inputs_json jsonb NOT NULL,       -- { plan inputs + settings }
  payments_json jsonb NOT NULL,     -- [ { month_index, amount } ]
  outputs_json jsonb NOT NULL,      -- { resultados calculados }
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financing_snapshots_property ON analysis_financing_snapshots(property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financing_snapshots_workspace ON analysis_financing_snapshots(workspace_id);
